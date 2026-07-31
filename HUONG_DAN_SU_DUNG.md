# 📖 HƯỚNG DẪN SỬ DỤNG PHẦN MỀM PHÊLA (Dành Cho Người Mới Bắt Đầu)

Chào mừng bạn đến với hệ thống quản lý cửa hàng trà sữa cao cấp **Phêla**! Đây là tài liệu hướng dẫn cực kỳ dễ hiểu, ngắn gọn giúp bất kỳ nhân viên (Barista) hoặc Quản lý (Admin) nào cũng có thể làm quen và vận hành phần mềm trơn tru chỉ trong 5 phút.

---

## 🚀 1. Cách Bật Phần Mềm Để Chạy (Chỉ 1 giây)

Mở Terminal tại thư mục dự án và gõ đúng lệnh sau:
```bash
npm run dev
```
* **Mở trang bán hàng & quản trị:** Mở trình duyệt web truy cập **[http://localhost:3000](http://localhost:3000)**.
* **Mã PIN đăng nhập mặc định (Tài khoản mẫu):**
  * **Barista/Thu ngân (STAFF):** Nhập mã PIN **`4444`** (Tài khoản: *Nguyễn Văn Staff*).
  * **Chủ cửa hàng/Quản lý (ADMIN):** Nhập mã PIN **`1234`** (Tài khoản: *Quản trị viên hệ thống*).
  * **Quản lý cửa hàng (MANAGER):** Nhập mã PIN **`2222`** (Tài khoản: *Lê Đình Quản Lý*).

---

## 🧋 2. Dành Cho Barista / Thu Ngân (Quyền STAFF)

Khi nhân viên đăng nhập bằng mã PIN **`4444`**, hệ thống sẽ tự động đưa nhân viên thẳng vào giao diện làm việc đơn giản hóa để tránh nhầm lẫn:

### ⏱️ Bước A: Check-in Ca Trực (Điểm Danh Vân Tay)
1. Ở góc trên cùng bên trái thanh menu, nhấp vào nút xanh **"Check-in ca trực"**.
2. Hệ thống sẽ tự động ghi nhận giờ vào ca, đối chiếu với lịch để phân loại đi đúng giờ hay đi muộn (`LATE`). Đặc biệt, hệ thống sử dụng thuật toán chấm công thông minh theo **khung giờ 24h** để tự động liên kết giờ Check-in/Check-out ngay cả khi ca làm việc kéo dài qua đêm.
3. Khi tan làm, chỉ cần nhấp lại nút đỏ **"Check-out kết thúc ca"** để kết thúc chấm công.

### 💰 Bước B: Tạo Đơn Hàng POS & Bán Trà Sữa (POS Register)
1. Truy cập mục **"POS bán hàng"** từ thanh menu trái.
2. **Chọn món:** Nhấp vào sản phẩm trà sữa/cà phê trên màn hình (Ví dụ: *Ô Long Nhài Sữa*). Các món hết nguyên liệu sẽ tự động bị mờ đi.
3. **Chọn Size & Thêm Ghi chú:** Chọn kích cỡ cốc (M/L), thêm ghi chú yêu cầu của khách hàng rồi nhấn **"Thêm vào giỏ"**. (Giao diện POS đã được nâng cấp tự động co giãn 3 cột chống tràn).
4. **Tìm hội viên (Loyalty):** Nhập số điện thoại khách hàng vào ô *"Tìm kiếm hội viên"* để hệ thống tự động áp dụng chiết khấu giảm giá thành viên.
5. **Thanh toán:** Kiểm tra tổng tiền, chọn bàn, rồi nhấn **"Xác nhận thanh toán"**.

---

## 👑 3. Dành Cho Chủ Cửa Hàng / Quản Lý (Quyền ADMIN / MANAGER)

Đăng nhập bằng mã PIN **`1234`** (Admin) hoặc **`2222`** (Manager) để mở khóa các trang cấu hình nâng cao.

### ➕ Cách A: Thêm Đồ Uống Mới & Thiết Lập Bảng Giá
1. Vào mục **"Đồ uống (Menu)"** $\rightarrow$ Chọn nút **"+ Thêm đồ uống mới"**. Nhập tên, mô tả và lưu lại.
2. Chuyển sang mục **"Bảng giá (Drink Size)"** $\rightarrow$ Chọn đồ uống vừa thêm, đặt giá tương ứng cho các Size (M/L) (VD: 55000).

### 📅 Cách B: Xếp Ca Chấm Công & Bản Đồ Ca Làm Việc (Rota / Shift Logs)
1. Truy cập **"Bản đồ điểm danh" (Shift Logs)**. Tại đây có lưới Lịch thông minh (Calendar Grid) tự động tính toán tháng/ngày chính xác để hiển thị trực quan toàn bộ các ca làm việc của mọi nhân viên.
2. Quản lý có thể theo dõi thời gian thực nhân viên nào đang làm việc, ai đi muộn, và can thiệp ghi nhận lại giờ (nếu cần).

### 📦 Cách C: Tạo Phiếu Nhập Kho Nguyên Liệu (Restocking)
1. Vào **"Hóa đơn nhập kho"** $\rightarrow$ **"Lập phiếu nhập kho"**.
2. Chọn loại nguyên liệu, số lượng và giá vốn, nhấn **"Lập Phiếu"** (Trạng thái `PENDING`).
3. Khi hàng về kho, nhấn **"Duyệt Nhập Kho"**. Hệ thống tự động cộng dồn số lượng nguyên liệu tồn kho.

### 💵 Cách D: Tính Lương Nhân Sự Hàng Tháng (Payroll)
1. Vào mục **"Tính lương (Salary)"** $\rightarrow$ **"Kết toán bảng lương"**.
2. Phần mềm tự động quét qua toàn bộ lịch sử chấm công, tính tổng số giờ làm việc thực tế, cộng thưởng, trừ phạt để xuất ra bảng lương chi tiết. 

---

## 📱 4. Cổng Mua Sắm Dành Cho Khách Hàng (Customer Portal)

Khách hàng mua online tại cổng **[http://localhost:3002](http://localhost:3002)**:

### 🔑 Khách Hàng, Giới Thiệu (Referral) & Khôi Phục Voucher
1. **Đăng nhập:** Chỉ cần nhập Số điện thoại.
2. **Tặng Voucher Giới Thiệu (Referral):** Khi khách hàng hoàn tất thành công đơn hàng đầu tiên, hệ thống sẽ tự động tạo phần thưởng Voucher giới thiệu (Referral Vouchers) để tri ân.
3. **Bồi thường Voucher Tự Động:** Đừng lo nếu khách dùng Voucher nhưng đơn hàng bị Admin từ chối/hủy do hết món. Hệ thống sẽ tự động hoàn trả/tạo ra Voucher mới đền bù (Compensation) lập tức vào Ví Voucher của khách!

### 🧋 Đặt Hàng, Thanh Toán & Trạng Thái Giao Hàng
1. Khách hàng lựa chọn món, cấu hình Size, Đường, Đá, Toppings.
2. Giỏ hàng đã được thiết kế lại thanh cuộn linh hoạt (`min-h-0`) để tránh tràn đồ uống. Khách có thể nhập **Mã Voucher**, chọn thanh toán tiền mặt (COD) hoặc QR Code (PayOS).
3. **Tiến độ Giao Hàng:** Thanh trạng thái trực quan (Progression bar) theo dõi: **Đã nhận đơn** $\rightarrow$ **Đang pha chế** $\rightarrow$ **Đang giao hàng (Delivery)** $\rightarrow$ **Hoàn tất**.

### 🤖 Chatbox AI & Giỏ Hàng Bỏ Quên (Abandoned Carts)
1. Tích hợp AI Chatbox (Gemini) hỗ trợ khách giải đáp thắc mắc và gợi ý nước uống.
2. **Giỏ hàng bỏ quên:** Nếu khách thêm món vào giỏ nhưng không thanh toán, hệ thống ghi nhận vào trang **"Giỏ Hàng Bỏ Quên"** phía Quản lý để phục vụ chiến dịch Marketing (gửi SMS hoặc Voucher nhắc nhở).

---

## ⚡ 5. Các Chế Độ Tự Động Thông Minh Trong Hệ Thống

* **Offline Fallback (Không lo rớt mạng):** Khi Database lỗi, hệ thống tự động chạy giả lập LocalStorage, giữ cho cửa hàng kinh doanh liên tục.
* **Tự Động Khấu Trừ Tồn Kho:** Mỗi khi Đơn hàng (POS hoặc Online) báo HOÀN THÀNH, hệ thống tự đối chiếu "Công thức pha chế" (Recipe) để tự trừ hao hụt nguyên liệu thô trong kho.
* **Xử Lý Quá Hạn & Kích Hoạt Voucher Mượt Mà:** Mọi tham số cấu hình như *Số lượt tối đa (MaxUsage)*, thời hạn, sẽ được API tự động xử lý chặt chẽ.
