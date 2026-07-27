# 🕵️ Phân Tích Chuyên Sâu Toàn Bộ Mã Nguồn Dự Án (Deep Dive Analysis)

Tài liệu này lưu trữ kết quả "dịch mã" (line-by-line) toàn bộ các module phức tạp nhất trong hệ thống Phê La ERP.

---

## Giai Đoạn 1: Phân Tích Lõi Backend (`apps/api`)

### 1. Cụm Xác Thực & Phân Quyền (Auth & RBAC)

> [!NOTE]
> File liên quan: `auth.router.ts`, `middleware/auth.ts`, `employees.router.ts`

Hệ thống sử dụng cơ chế **JWT (JSON Web Token)** kết hợp với **HttpOnly Cookies** để chống lại các cuộc tấn công XSS (Cross-Site Scripting).

#### Phân tích hàm `POST /login` (`auth.router.ts`)
- **Dòng 20-34:** Hệ thống không dùng Email mà dùng `PINCode` (mã số nội bộ) kết hợp với `password` để nhân viên đăng nhập nhanh tại máy POS. Hàm `bcrypt.compare` được gọi để so khớp mật khẩu băm.
- **Dòng 42-64:** Nếu đúng mật khẩu, hệ thống sinh ra 2 loại token:
  - `accessToken` (sống ngắn - 15 phút).
  - `refreshToken` (sống dài - 7 ngày).
  - **Điểm sáng bảo mật:** Thay vì trả Token về cục diện JSON bắt Frontend phải lưu vào LocalStorage (rất dễ bị extension của trình duyệt ăn cắp), dev đã gắn thẳng nó vào `res.cookie` với cờ `httpOnly: true` và `sameSite: 'strict'`. Điều này đảm bảo Token không thể bị đọc bằng JavaScript phía Client.

#### Phân tích hàm `POST /refresh` (Chống Privilege Escalation)
- **Dòng 94-102:** Đây là một đoạn code xử lý cực kỳ chặt chẽ. Thay vì chỉ lấy data cũ từ `refreshToken` để tạo `accessToken` mới, hệ thống chủ động gọi `prisma.employee.findUnique` để kiểm tra xem tài khoản này còn tồn tại không, và lấy `RoleName` **mới nhất**.
- **Tại sao lại cần làm vậy?** Giả sử một nhân viên (CASHIER) vừa bị giáng chức hoặc bị đuổi việc. Nếu không gọi DB kiểm tra lại, họ vẫn có thể dùng `refreshToken` (còn hạn 7 ngày) để liên tục lấy `accessToken` mới với quyền (Role) cũ. Cách làm này triệt tiêu hoàn toàn rủi ro leo thang đặc quyền.

#### Lớp Chắn Middleware Bảo Mật (`middleware/auth.ts`)
- **Hàm `verifyJWT` (Backdoor cho Dev):** 
  Tại dòng 38-45 có đoạn: `if (token.startsWith('mock_token_') && process.env.NODE_ENV === 'development')`. Đây là "Lỗ hổng có chủ đích". Để tiện cho team Frontend làm giao diện mà không phải đăng nhập liên tục, hệ thống cho phép dùng một token giả. Tuy nhiên, nó được bọc bởi điều kiện `NODE_ENV === 'development'`, nghĩa là khi đưa lên Production, lỗ hổng này tự động đóng lại.
- **Hàm `requireRole`:** Trạm kiểm soát thứ 2. Hàm này nhận vào một mảng `allowedRoles` (ví dụ: `['ADMIN', 'MANAGER']`). Nó soi vào `req.user.RoleName` đã được giải mã. Nếu không khớp, trả về lỗi `403 Forbidden`.

#### Xử lý ngoại lệ chuẩn xác (`employees.router.ts`)
- **Dòng 187-210 (Xóa nhân viên):** Khi gặp lỗi `P2003` (Lỗi vi phạm khóa ngoại do nhân viên này đã từng tạo đơn hàng), code không làm chết App mà bắt try-catch để trả về thông báo: *"Không thể xóa nhân viên này vì có liên kết với dữ liệu Đơn hàng... Hãy đổi mật khẩu thay vì xóa tài khoản."* Một xử lý Graceful Error Handling rất chuẩn mực.
- **Ẩn mật khẩu (Dòng 61):** Sử dụng `const { password, ...safeEmployee } = employee;` (Destructuring của ES6) để loại bỏ trường password băm ra khỏi kết quả trả về cho Frontend.

---

### 2. Cụm Sản Phẩm & Kho Bãi (Inventory & Recipes)

> [!NOTE]
> File liên quan: `recipes.router.ts`, `orders.router.ts`

Bài toán khó nhất của ngành F&B là: Làm sao để từ một "Cốc trà sữa M" (Bán hàng) suy ra được phải trừ bao nhiêu gram Trà, bao nhiêu ml Sữa (Kho bãi)? Dự án giải quyết việc này qua bảng `Recipe` (Công thức).

#### Định lượng Nguyên Liệu (`recipes.router.ts`)
- Tại dòng 130 của file `recipes.router.ts` (Hàm tạo công thức mới), hệ thống sử dụng thuật toán **Reduce** để gom nhóm (Group) các nguyên liệu trùng lặp trước khi lưu:
  ```typescript
  const groupedIngredients = validatedData.Ingredients.reduce((acc, curr) => {
    acc[curr.IngredientID] = (acc[curr.IngredientID] || 0) + curr.Quantity;
    return acc;
  }, {} as Record<number, number>);
  ```
  Nhờ đó, nếu Admin lỡ tay nhập 2 lần "Trà Đen", hệ thống sẽ cộng dồn số lượng chứ không tạo ra 2 bản ghi rác.

#### Thuật toán Trừ Kho FIFO (`processOrderIngredients` - `orders.router.ts`)
Khi một đơn hàng được tạo, hàm `processOrderIngredients` (Dòng 13) sẽ chạy:
1. **Tính tỷ lệ Size (Multiplier):** Lấy `VolumeML` của Size hiện tại chia cho 500 (Base size). Ví dụ Size L (700ml) thì hệ số nhân lượng nguyên liệu là `1.4`.
2. **Cập nhật tổng tồn (Dòng 39):** Dùng `QuantityStock: { decrement: quantityToAdjust }` để trừ tổng tồn kho của nguyên liệu. Bắt lỗi Race Condition nếu tổng kho không đủ.
3. **Thuật toán FIFO (First-In, First-Out) - Dòng 54-88:** Đây là đoạn code mang tính chất kế toán rất cao. Hệ thống tìm kiếm các lô hàng (`IngredientReceiptDetail`) còn tồn (`QuantityRemaining > 0`). Nó ưu tiên trừ vào lô hàng có Hạn sử dụng (ExpirationDate) gần nhất, hoặc lô nhập sớm nhất (`createdAt: 'asc'`). Vòng lặp `for` sẽ chạy và trừ dần số lượng cho đến khi hết `remainingToDeduct`. Nếu hủy đơn, nó sẽ ưu tiên "hoàn" (refund) vào lô mới nhất (Dòng 99).

---

### 3. Cụm Bán Hàng & Thanh Toán (Orders & Payment)

> [!NOTE]
> File liên quan: `orders.router.ts`

Hàm tạo đơn hàng `POST /customer-place` là trái tim của hệ thống thương mại điện tử, dài gần 400 dòng code (Dòng 371 - 779), xử lý hàng loạt nghiệp vụ đan chéo:

#### Luồng Xử Lý Chặt Chẽ (Strict Workflow):
1. **Định danh ngầm (Dòng 378):** Nếu khách vãng lai mua hàng không đăng nhập, hệ thống tự động gắn đơn cho một tài khoản "System Admin" mặc định để không vi phạm ràng buộc Khóa ngoại (FK Constraint) của DB.
2. **Xác thực trước (Pre-validation - Dòng 460):** Thay vì trừ kho ngay, hệ thống gom toàn bộ nguyên liệu cần thiết của cả Giỏ hàng vào một Map (`requiredIngredients.set(...)`). Chỉ khi tất cả nguyên liệu trong Map đều đủ tồn kho, nó mới cho đi tiếp, tránh tình trạng trừ kho nửa vời rồi báo lỗi.
3. **Tính toán ưu đãi kép (Stackable Discounts - Dòng 507):**
   - Vòng 1: Tìm Khuyến mãi (Promotion) tốt nhất có hiệu lực (vd: Giảm 20% hoặc Mua 2 tặng 1). Thuật toán phải chia tỉ lệ `promoRatio` (Dòng 566).
   - Vòng 2: Tính giảm giá theo Hạng thành viên (Membership - Dòng 569) dựa trên số tiền *còn lại* sau Vòng 1.
   - Vòng 3: Áp dụng Voucher (Dòng 581). Thuật toán bóc tách chỉ tính voucher cho đồ uống thỏa mãn `TargetProductID` (Dòng 600).
4. **Tích hợp Vận chuyển GHN (Dòng 642):** Nếu khách chọn Giao hàng (DELIVERY) và hóa đơn dưới 300k, gọi API của Giao Hàng Nhanh (`GhnService.calculateFee`) để lấy phí ship thời gian thực cộng vào tổng đơn.
5. **Giao dịch nguyên tử (Prisma Transaction - Dòng 674):** Bọc toàn bộ các thao tác `orders.create`, `orderDetail.create`, `voucher.update` vào `prisma.$transaction`. Nếu bất kỳ bước nào hỏng mạng, toàn bộ dữ liệu sẽ được Rollback về ban đầu.
6. **Realtime Broadcast (Dòng 768):** Gọi `socket.to('admin_orders').emit('new_order', newOrder)` để màn hình POS của thu ngân tại quán kêu "Ting ting" ngay lập tức mà không cần tải lại trang.

---

### 4. Cụm AI & Khai Phá Dữ Liệu (Analytics & Chatbot)

> [!NOTE]
> File liên quan: `apriori.algorithm.ts`, `hui.algorithm.ts`, `ai.service.ts`

Hệ thống Phê La áp dụng các thuật toán lõi của ngành Khoa học dữ liệu (Data Science) để phân tích hành vi mua hàng.

#### Thuật toán Apriori (`apriori.algorithm.ts`)
Đây là thuật toán khai phá luật kết hợp (Association Rule Mining) kinh điển để tìm ra các nhóm đồ uống hay được mua cùng nhau.
- **Bước Sinh Ứng viên & Cắt tỉa (Dòng 133-182):** Để tránh bùng nổ tổ hợp, thuật toán áp dụng quy tắc Pruning cực kỳ chặt chẽ: *"Mọi tập con của một tập phổ biến cũng phải là tập phổ biến"*. Nếu một tập con không nằm trong danh sách `prevSet` (được lưu dạng cấu trúc `Set` để lookup O(1)), nhánh đó bị chặt đứt ngay lập tức (Candidate Pruning).
- **Ứng dụng thực tế (`orders.router.ts` dòng 183):** Khi khách hàng xem giỏ hàng, hệ thống gọi API `/customer-combos` để quét các luật kết hợp tốt nhất (Confidence > 50%) và gợi ý Cross-sell (Bán chéo).

#### Thuật toán HUI-Miner (`hui.algorithm.ts`)
Cao cấp hơn Apriori, High Utility Itemset (HUI) Miner tính đến Lợi Nhuận (Utility) của món hàng (theo bài báo khoa học của Liu & Qu, 2012).
- **Cấu trúc Dữ liệu Utility-List (Dòng 15):** Thay vì quét toàn bộ database nhiều lần, HUI-Miner quét đúng 2 lần để tạo ra mảng `elements` lưu trữ chính xác dòng tiền sinh ra (iutil) và dòng tiền tiềm năng còn lại (rutil).
- **Giao cắt ma trận (Dòng 166-215):** Để sinh một tập mới `Pxy` từ `Px` và `Py`, thuật toán sử dụng kỹ thuật "Two-pointer" (2 con trỏ) quét qua mảng `elements` với độ phức tạp `O(L)`.
- **Đệ quy DFS (Dòng 124):** Thuật toán dùng Tìm kiếm theo chiều sâu (DFS) và cắt tỉa (Remaining Utility Pruning): Nếu tiện ích hiện tại + tiện ích tiềm năng nhỏ hơn cấu hình tối thiểu, nó sẽ không đệ quy xuống sâu hơn.

#### Trí tuệ nhân tạo Gemini (`ai.service.ts`)
Tích hợp Google Generative AI (Gemini 2.5 Flash) để làm Chatbot tư vấn.
- **Prompt Injection Động (Dòng 42-52):** Chống AI "bịa" món (Hallucination) bằng cách lấy danh sách đồ uống `ACTIVE` từ Prisma để đắp vào chuỗi `SYSTEM_INSTRUCTION_TEMPLATE`. AI chỉ được phép tư vấn trong khuôn khổ menu này.
- **Function Calling (Dòng 84-111):** Chatbot không chỉ biết "chát" mà còn biết gọi API. Khi khách hỏi "Đơn hàng 123 của tôi đâu", AI nhận diện intent, kích hoạt function `check_order_status`, trả về kết quả truy vấn Database `prisma.orders`, và tự động dịch kết quả JSON khô khan thành một câu trả lời mềm mỏng cho khách. Hơn thế, dev đã xử lý cả tình huống rớt mạng (503) từ máy chủ Google để trả về thông báo duyên dáng.

---

## Giai Đoạn 2: Phân Tích Customer App (`apps/customer`)

> [!NOTE]
> File liên quan: `lib/api.ts`, `components/GlobalMarketingListener.tsx`, `app/page.tsx`

Ứng dụng Khách hàng được xây dựng bằng Next.js 14 App Router, tập trung tối đa vào trải nghiệm người dùng (UX) và khả năng tương tác thời gian thực (Realtime).

### 1. Kiến Trúc "Dual Mode Database" (`lib/api.ts`)
Đây là một kỹ thuật cực kỳ tinh vi giúp ứng dụng không bao giờ bị "chết" (Crash) ngay cả khi Backend sập.
- **Dòng 1-270 (LocalDatabase):** Dev đã hardcode (viết cứng) một cơ sở dữ liệu thu nhỏ `class LocalDatabase` ngay trên RAM của trình duyệt, chứa sẵn danh sách đồ uống, giá cả, và cấu trúc bảng như y hệt DB thật.
- **Kỹ thuật Fallback (Dòng 421-430):** Khi gọi API lấy danh sách Menu (`api.getDrinks()`), code được bọc trong block `try-catch`. Nếu `fetch` thành công, nó trả về dữ liệu thật từ máy chủ. Nhưng nếu máy chủ lỗi (văng vào `catch`), nó lập tức trả về dữ liệu từ `LocalDatabase`. Nhờ vậy, khách hàng vẫn có thể xem được Menu dù server bảo trì.

### 2. Sự Kiện Thời Gian Thực (GlobalMarketingListener.tsx)
Phê La ứng dụng triệt để Socket.io để làm chiến dịch Marketing (Live Shopping Drop).
- **Socket Event `marketing_broadcast` (Dòng 51):** Một Component vô hình `GlobalMarketingListener` luôn chạy ngầm trên mọi trang. Khi Admin bấm nút "Rơi Voucher" ở trang quản trị, Socket bắn tín hiệu tới tất cả khách hàng đang online.
- **Hiệu ứng UX (Dòng 53-90):** Nếu payload gửi về là `VOUCHER_DROP`, hệ thống lập tức sử dụng `framer-motion` để bật lên một modal hộp quà (Gift Drop) rơi từ trên xuống, kèm theo vòng sáng lan tỏa `animate-pulse` và phát ra âm thanh "Tada" (`audio.play()`). Người dùng bấm "LƯU MÃ NGAY", Client sẽ bắn API về `/vouchers/claim` để cất mã vào ví. 

### 3. Tương Tác AI Khép Kín (`app/page.tsx`)
Điểm độc đáo nhất là Chatbot AI không chỉ để nói chuyện cho vui, mà nó có thể "điều khiển" luôn cả trình duyệt của khách hàng.
- **Bắt Sự kiện Custom Event (Dòng 238-315):** Tại `page.tsx`, hệ thống lắng nghe 2 sự kiện DOM toàn cục: `ai_buy_now` và `ai_add_combo`.
- Khi Chatbot AI nhả ra một thẻ `<button data-action="buy_now">` và khách bấm vào, component Chatbot sẽ phát ra sự kiện `ai_buy_now`. File `page.tsx` bắt được sự kiện này, lập tức gọi `api.checkVoucher` và tự động áp dụng mã giảm giá thẳng vào giỏ hàng (`setVoucherInput(code)`), sau đó bắn `toast.success` thông báo. Đây là minh chứng tuyệt vời của việc giao tiếp 2 chiều giữa AI (iframe/component) và Cửa hàng (Host App).

---

## Giai Đoạn 3: Phân Tích Admin & POS App (`apps/web`)

> [!NOTE]
> File liên quan: `(dashboard)/layout.tsx`, `(dashboard)/pos/page.tsx`

Hệ thống Admin được thiết kế chuẩn mực cho quy trình vận hành Quán Cà Phê, với phân quyền chặt chẽ (RBAC) và Màn hình bán hàng (POS).

### 1. Phân Quyền & Route Guard (`layout.tsx`)
- **Khóa trái tuyến (Dòng 49-58):** Hệ thống không chỉ ẩn menu UI mà chặn từ gốc trong `useEffect`. Nếu tài khoản là `STAFF` (Barista) cố tình gõ URL `/marketing` hoặc `/salary` lên thanh địa chỉ, Router sẽ bật ngược trở lại `/pos` kèm thông báo đỏ: *"Tài khoản Barista không có quyền truy cập"*. Nhân viên pha chế chỉ được xem POS, Đơn hàng và Công thức.
- **Hệ thống cảnh báo AI Handoff (Dòng 77-92):** Khi Chatbot AI (ở Customer App) bó tay và gọi `[HANDOFF_TO_HUMAN]`, Socket.io bắn thẳng event `admin_needed_notification` về Layout của Admin. Kèm theo đó là một file âm thanh `/notification.mp3` reng lên để nhắc Quản lý vào tab Live Chat cứu viện ngay lập tức.

### 2. POS Terminal - Tính Tiền 3 Lớp (`pos/page.tsx`)
Màn hình máy tính tiền (POS) của thu ngân chứa bộ tính toán đồ sộ nhất ứng dụng khách (Gần 1000 dòng code).
- **Thuật toán Khuyến Mãi Bậc Thang (Dòng 208-252):** Trước khi tính tiền, hệ thống lọc qua toàn bộ chiến dịch Promotion đang chạy (`activePromotions`). Tùy theo loại (`PERCENT`, `AMOUNT`, `FREE_ITEM`), thuật toán duyệt qua từng món trong Giỏ hàng để tìm ra mức giảm giá sâu nhất (Best applicable promo).
- **Trừ Lùi (Dòng 256-291):** Tiền không bị trừ chồng chéo. Phần tiền còn lại (đã trừ Promo) mới được đưa vào tính giảm giá của Voucher. Tiếp đó, phần tiền còn lại sau Voucher mới được tính chiết khấu Membership. Kỹ thuật này giúp quán không bao giờ bị "Lỗ ngược" do cộng dồn % giảm giá.
- **Chặn Đơn Ảo (Dòng 325-334):** POS có cơ chế Check Out of Stock thời gian thực. Nếu món `IsOutOfStock = true` (do kho bếp báo hết Trà Đen), thu ngân bấm Thanh toán sẽ bị Block ngay lập tức.

---

## Giai Đoạn 4: Phân Tích Cơ Sở Hạ Tầng (Infrastructure & Cron Jobs)

> [!NOTE]
> File liên quan: `apps/api/src/jobs/cronJobs.ts`, `apps/api/prisma/schema.prisma`

Bên cạnh các luồng gọi API chủ động từ người dùng, hệ thống Phê La còn có các tác vụ chạy ngầm tự động (Background Jobs) để tối ưu hóa doanh thu.

### 1. Hệ thống đòi nợ / Cứu vãn Giỏ hàng (Abandoned Carts)
Trong `cronJobs.ts` (Dòng 11), hệ thống đặt một lịch trình `node-cron` chạy đúng vào phút thứ 0 của mỗi giờ (`0 * * * *`).
- **Quét Giỏ Hàng:** Nó tìm tất cả các giỏ hàng đang `ACTIVE` nhưng không có tương tác nào trong suốt 24 giờ qua.
- **Cool-down Chống Spam (Dòng 58-75):** Để tránh việc khách hàng cố tình "lươn lẹo" ngâm giỏ hàng để vòi mã giảm giá, hệ thống chọc vào DB để tìm xem trong 30 ngày qua khách có được tặng mã `COMEBACK-` nào chưa. Nếu có rồi, giỏ hàng tự động bị hủy (đánh dấu `ABANDONED`) mà không cho mã.
- **Kích Thích Mua Hàng (Dòng 81-113):** Nếu khách hàng hợp lệ, hệ thống tự động sinh một mã giảm giá 15% ngẫu nhiên, lưu vào DB bằng Transaction `prisma.$transaction`, và ném vào hàng đợi (Queue) để gửi thông báo Push Notification qua máy điện thoại khách hàng: *"Bạn để quên gì đó này! Tặng bạn voucher 15%..."*.

### Tổng Kết Đánh Giá Kiến Trúc Phê La
Dự án Phê La không chỉ là một ứng dụng CRUD (Thêm, Sửa, Xóa) cơ bản, mà mang đậm tư duy thiết kế của **Hệ thống Enterprise (Doanh nghiệp) đa phân luồng**:
1. **Toàn vẹn Dữ liệu (ACID):** Mọi nghiệp vụ liên quan đến tiền bạc, tồn kho đều được bọc trong Prisma Transaction.
2. **Offline-First Resilience:** Ứng dụng khách hàng có khả năng chạy độc lập với cơ sở dữ liệu RAM nội bộ khi Backend sập, và sử dụng hàng đợi (Queue) để đồng bộ hóa dữ liệu.
3. **Data-Driven Marketing:** Ứng dụng thẳng các thuật toán Khai phá dữ liệu (HUI-Miner, Apriori) để tối ưu hóa gợi ý bán chéo (Cross-selling).
4. **AI Interactive Handoff:** Chatbot không đứng ngoài luồng kinh doanh, mà có khả năng gọi API để kiểm tra đơn, phát ra tín hiệu để thêm giỏ hàng, và thậm chí gọi quản lý (Handoff) qua WebSocket khi không giải quyết được.
