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
  * **Barista/Thu ngân (STAFF):** Nhập mã PIN **`5678`** (Tài khoản: *Phạm Thanh Thảo*).
  * **Chủ cửa hàng/Quản lý (ADMIN):** Nhập mã PIN **`1234`** (Tài khoản: *Nguyễn Hoàng Giang*).

---

## 🧋 2. Dành Cho Barista / Thu Ngân (Quyền STAFF)

Khi nhân viên đăng nhập bằng mã PIN **`5678`**, hệ thống sẽ tự động đưa nhân viên thẳng vào giao diện làm việc đơn giản hóa để tránh nhầm lẫn:

### ⏱️ Bước A: Check-in Ca Trực (Điểm Danh Vân Tay)
1. Ở góc trên cùng bên trái thanh menu, nhấp vào nút xanh **"Check-in ca trực"**.
2. Hệ thống sẽ tự động ghi nhận giờ vào ca, đối chiếu với lịch để ghi nhận bạn đi làm đúng giờ hay đi muộn (`LATE`).
3. Khi tan làm, chỉ cần nhấp lại nút đỏ **"Check-out kết thúc ca"** để kết thúc chấm công ca làm việc.

### 💰 Bước B: Tạo Đơn Hàng POS & Bán Trà Sữa (POS Register)
1. Truy cập mục **"POS bán hàng"** từ thanh menu trái.
2. **Chọn món:** Nhấp vào sản phẩm trà sữa/cà phê trên màn hình (Ví dụ: *Trà Ô Long sữa Phêla*).
3. **Chọn Size & Thêm Ghi chú:** Chọn kích cỡ cốc (S/M/L), thêm ghi chú yêu cầu của khách hàng (Ví dụ: *Ít đường, nhiều đá*) rồi nhấn **"Thêm vào giỏ"**.
4. **Tìm hội viên (Loyalty):** Nhập số điện thoại khách hàng vào ô *"Tìm kiếm hội viên"* (Ví dụ: `0901122334` - Nguyễn Văn A) để hệ thống tự động áp dụng chiết xuất giảm giá thành viên.
5. **Thanh toán:** Kiểm tra lại tổng tiền (đã tự động áp dụng giảm giá), chọn bàn khách ngồi nếu có, rồi nhấn **"Xác nhận thanh toán"**. Đơn hàng sẽ được lập tức in ra và lưu lịch sử.

---

## 👑 3. Dành Cho Chủ Cửa Hàng / Quản Lý (Quyền ADMIN)

Đăng nhập bằng mã PIN **`1234`** để mở khóa toàn bộ các trang cấu hình nâng cao.

### ➕ Cách A: Thêm Đồ Uống Mới Vào Menu
1. Vào mục **"Đồ uống (Menu)"** trên menu trái $\rightarrow$ Chọn nút **"+ Thêm đồ uống mới"** ở góc phải.
2. Nhập các thông tin cần thiết:
   * **Tên đồ uống:** (Ví dụ: *Trà Sữa Matcha Ô Long*)
   * **Mô tả món:** (Ví dụ: *Matcha Nhật Bản thơm béo kết hợp trà ô long*)
   * **Trạng thái:** Để hoạt động (`ACTIVE`).
3. Nhấn **"Lưu đồ uống"**. 

### 🏷️ Cách B: Cấu Hình Giá Bán Cho Từng Size (Drink Sizes)
*Sau khi thêm đồ uống mới, bạn phải đặt giá cho các Size (S/M/L) để POS có thể tính tiền:*
1. Vào mục **"Bảng giá (Drink Size)"** $\rightarrow$ Chọn **"+ Thiết lập giá mới"**.
2. Chọn loại đồ uống bạn vừa thêm ở bước trước.
3. Chọn kích cỡ cốc (S, M hoặc L) và điền số tiền bán lẻ tương ứng (Ví dụ: `55000` - hệ thống sẽ tự hiểu là 55,000 đ).
4. Nhấn **"Lưu bảng giá"**. Món nước mới sẽ lập tức xuất hiện trên màn hình POS của Barista kèm theo các size và giá bán tương ứng!

### 📦 Cách C: Tạo Phiếu Nhập Kho Nguyên Liệu (Restocking)
1. Vào mục **"Hóa đơn nhập kho"** $\rightarrow$ Nhấn **"Lập phiếu nhập kho"**.
2. Chọn Nhà cung cấp và ngày nhập hàng thực tế.
3. **Chọn nguyên liệu:** Chọn loại nguyên liệu thô (Ví dụ: *Trà Ô Long thô*), điền số lượng nhập (Ví dụ: `100` gram), nhập giá vốn nhập hàng rồi nhấn nút **"Đưa vào danh sách phiếu"**. Bạn có thể thêm nhiều nguyên liệu khác nhau vào cùng một phiếu.
4. Nhấn **"Lập Phiếu"**. Phiếu lúc này sẽ ở trạng thái chờ duyệt (`PENDING`).
5. Khi hàng thực tế về đến kho và đã được kiểm đếm, nhấn nút xanh **"Duyệt Nhập Kho"**. Hệ thống sẽ tự động cộng dồn số lượng nguyên liệu này vào tổng số lượng tồn kho trong mục **"Kho nguyên liệu"** thực tế.

### 💵 Cách D: Tính Lương Barista Hàng Tháng (Payroll)
1. Vào mục **"Tính lương (Salary)"** $\rightarrow$ Nhấn nút **"Kết toán bảng lương"**.
2. Nhập tháng và năm cần tính lương.
3. Phần mềm sẽ tự động quét qua toàn bộ lịch sử chấm công quét vân tay của baristas trong tháng đó, tính tổng số giờ làm việc thực tế, cộng thưởng và trừ phạt đi muộn tự động để xuất ra bảng lương chi tiết.
4. Khi đã chuyển khoản lương thực tế cho nhân viên, hãy nhấn nút **"Thanh toán lương"** trên dòng tương ứng để lưu lịch sử đánh dấu *"Đã thanh toán"*.

---

## 📱 4. Cổng Mua Sắm Dành Cho Khách Hàng (Customer Portal)

Ứng dụng đặt đồ uống trực tuyến cho khách hàng chạy tại cổng **[http://localhost:3002](http://localhost:3002)**:

### 🔑 Đăng Nhập & Đăng Ký Hội Viên Tự Động
1. Khách hàng chỉ cần nhập **Số điện thoại** của mình để bắt đầu mua sắm.
2. **Hội viên mới:** Hệ thống tự động tạo mới tài khoản hạng Đồng (Bronze) và lưu vào cơ sở dữ liệu.
3. **Hội viên cũ:** Đăng nhập bằng số điện thoại cũ (Ví dụ: `0901122334` - hạng Bạc) sẽ hiển thị đúng tên và tự động giảm giá **5%** trực tiếp vào tổng tiền thanh toán trong giỏ hàng.

### 🧋 Chọn Món & Tùy Biến Đồ Uống
1. Chọn đồ uống mong muốn trên giao diện chính.
2. Trong hộp thoại tùy chọn, khách hàng có thể chọn cỡ cốc (S/M/L), độ ngọt (0% - 100%), độ đá, và thêm toppings cao cấp tùy thích (Trân châu hoàng kim, kem phô mai...).
3. Nhấn **"Thêm Vào Giỏ Hàng"**.

### 💳 Chọn Bàn & Thanh Toán Giả Lập
1. Trong giỏ hàng, khách hàng có thể chọn **Số bàn** (nếu đang ngồi tại quầy Phêla) hoặc nhập **Địa chỉ giao hàng** mang đi.
2. Nhập ghi chú pha chế nếu có.
3. Nhấp **"Tiến hành thanh toán"** $\rightarrow$ Chọn **Thanh toán COD** hoặc quét mã **QR Code giả lập**.
4. Nhấn **"Xác nhận Đơn hàng"**. Đơn hàng sẽ được chuyển sang trạng thái chờ duyệt (`PENDING`).

### ⏳ Theo Dõi Trạng Thái Làm Trà Sữa Thời Gian Thực
1. Hệ thống tự động chuyển hướng khách hàng sang trang **"Lịch sử đơn"** (`http://localhost:3002/history`).
2. Khách hàng có thể theo dõi tiến trình pha chế qua thanh trạng thái trực quan: **Đã nhận đơn** $\rightarrow$ **Đang pha chế** $\rightarrow$ **Đã phục vụ**.
3. **Mua lại đơn cũ:** Khách hàng có thể nhấp vào nút **"Mua lại đơn này"** ở bất kỳ đơn hàng lịch sử nào để tự động thêm nhanh toàn bộ các món đó vào giỏ hàng mới chỉ với 1 click.

---

## ⚡ 5. Chế Độ Tự Động Thông Minh (Dual-Mode Offline Fallback)

* **Điều gì xảy ra nếu cơ sở dữ liệu SQL Server bị mất kết nối mạng?**
  Bạn hoàn toàn không cần lo lắng! Phần mềm Phêla được trang bị cơ chế tự động chuyển đổi thông minh:
  * Khi phát hiện database offline, hệ thống sẽ chuyển sang chế độ **giả lập LocalStorage nội bộ** ngay trên trình duyệt web.
  * Cả nhân viên tại quầy POS và khách hàng đặt trà sữa trực tuyến đều có thể đăng nhập, bán hàng, đặt đơn, chấm công check-in và tính toán lương bình thường mà không bị gián đoạn hoạt động kinh doanh của quán!

---

## 🥤 6. Tự Động Khấu Trừ Tồn Kho Nguyên Liệu Pha Chế
Nhằm giảm thiểu thao tác thủ công cho người quản lý, hệ thống tích hợp sẵn cơ chế trừ kho tự động:
* **Quy trình kích hoạt**: Khi một đơn hàng (được tạo ở quầy POS hoặc khách hàng tự đặt trực tuyến) được chuyển trạng thái sang **"COMPLETED"** (Hoàn thành đơn).
* **Cách hoạt động**:
  1. Hệ thống tự động phân tích các món nước trong đơn và đối chiếu với công thức pha chế (`Recipe`) đã định cấu hình của món nước đó.
  2. Tính toán tổng lượng nguyên liệu tiêu thụ thực tế (ví dụ: 2 cốc Trà sữa oolong sẽ tốn `2 x 0.02 = 0.04` Kg Trà Ô Long Bảo Lộc).
  3. Tự động cập nhật giảm trừ số lượng tồn kho tương ứng của các nguyên liệu đó trong mục **"Kho nguyên liệu"**.

