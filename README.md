# 🌿 Phê La - Hệ thống Quản lý & Bán hàng (Monorepo)

Dự án này là hệ thống quản lý, vận hành và bán hàng toàn diện dành cho thương hiệu trà sữa/cà phê **Phê La**. Dự án được xây dựng theo kiến trúc **Monorepo**, kết hợp nhiều công nghệ hiện đại nhằm mang lại trải nghiệm tối ưu cho cả khách hàng và nhân viên.

## 🏗️ 1. Kiến trúc & Công nghệ (Tech Stack)

Dự án được chia làm 3 phân hệ chính chạy song song:

### ⚙️ Backend API (`apps/api` - Port 3001)
*   **Core**: Node.js, Express.js, TypeScript.
*   **Database**: SQL Server giao tiếp qua **Prisma ORM**.
*   **Realtime**: `socket.io` cho các tính năng thời gian thực.
*   **Tích hợp**: 
    *   **Thanh toán Online**: Cổng thanh toán **PayOS** (`@payos/node`) hỗ trợ mã QR VietQR và Webhook tự động cập nhật trạng thái đơn hàng.
    *   **AI Chatbox**: Tích hợp **Google Gemini API** (`@google/generative-ai`) làm trợ lý ảo tự động tư vấn khách hàng.

### 🖥️ Admin & POS App (`apps/web` - Port 3000)
*   *Giao diện dành cho Quản lý và Nhân viên pha chế.*
*   **Tech**: Next.js 14 (App Router), React 18, Tailwind CSS, React Query, Socket.io-client.
*   **Tính năng**: Quản lý đơn hàng, POS bán tại quầy, quản lý menu, kho nguyên liệu, chấm công vân tay, tính lương.

### 📱 Customer Portal (`apps/customer` - Port 3002)
*   *Cổng đặt hàng trực tuyến dành cho Khách hàng.*
*   **Tech**: Next.js 14 (App Router), Tailwind CSS, React Query, React Leaflet (bản đồ).
*   **Tính năng**: Xem menu, đặt hàng online, thanh toán PayOS, theo dõi trạng thái pha chế realtime, trò chuyện với AI.

---

## 🌟 2. Các Tính Năng Nổi Bật

*   **Lưu trữ Giỏ hàng linh hoạt (DB-Driven Cart):**
    *   Khách vãng lai: Sử dụng `SessionID` (UUID) liên kết trực tiếp với Database, không lo mất giỏ hàng khi tắt trình duyệt.
    *   Khách thành viên: Giỏ hàng được đồng bộ theo `CustomerID`.
*   **Trừ Kho Tự Động (Auto-Restocking Deduction):** Tự động phân tích công thức (Recipe) và trừ chính xác nguyên liệu (Ingredient) tương ứng ngay khi đơn hàng hoàn thành.
*   **Fallback Offline Thông Minh:** Tự động chuyển sang chế độ giả lập LocalStorage khi mất kết nối Database, đảm bảo quán vẫn có thể vận hành và POS vẫn tính tiền được trong mọi hoàn cảnh.

---

## 🚀 3. Hướng dẫn Khởi chạy (Getting Started)

### Bước 1: Cài đặt thư viện
Đảm bảo máy bạn đã cài Node.js (khuyên dùng v18+). Mở terminal tại thư mục gốc của project và chạy:
```bash
npm install
```

### Bước 2: Cấu hình biến môi trường
Tạo file `.env` nằm ở thư mục `apps/api/` dựa trên cấu trúc sau (hoặc copy từ `.env.example` nếu có):
```env
# Chuỗi kết nối Database SQL Server
DATABASE_URL="sqlserver://<HOST>:<PORT>;database=<DB_NAME>;user=<USER>;password=<PASSWORD>;encrypt=true;trustServerCertificate=true"

# Thông tin cổng thanh toán PayOS
PAYOS_CLIENT_ID="Mã_Client_ID_của_bạn"
PAYOS_API_KEY="Mã_API_Key_của_bạn"
PAYOS_CHECKSUM_KEY="Mã_Checksum_Key_của_bạn"

# Thông tin AI Chatbox
GEMINI_API_KEY="Mã_Gemini_API_Key_của_bạn"
```

### Bước 3: Khởi tạo Cơ sở dữ liệu & Dữ liệu mẫu
Di chuyển vào thư mục Backend (API) để chuẩn bị Database:
```bash
cd apps/api

# Khởi tạo Prisma Client
npx prisma generate

# Áp dụng cấu trúc các bảng vào CSDL SQL Server
npx prisma db push

# Chạy tệp seed.ts để sinh ra dữ liệu mẫu (sản phẩm, nhân viên, khách hàng...)
npx prisma db seed
```

### Bước 4: Khởi động toàn bộ hệ thống
Quay lại thư mục gốc của project và chạy lệnh khởi động tổng:
```bash
cd ../..
npm run dev
```
Lệnh này sử dụng `concurrently` để chạy đồng thời cả Backend và 2 ứng dụng Frontend.

*   **Quản lý & POS (Admin App):** http://localhost:3000
*   **API Server (Backend):** http://localhost:3001
*   **Khách mua hàng (Customer App):** http://localhost:3002

---

## 🔑 4. Thông tin Đăng nhập (Dữ liệu mẫu để Test)

Sau khi chạy lệnh `npx prisma db seed` thành công, bạn có thể dùng các tài khoản sau để test luồng hệ thống:

### 4.1. Tài khoản Nhân viên (Đăng nhập tại Admin/POS - Port 3000)
Mật khẩu chung cho tất cả nhân viên là: **`123456`**

* **Quản trị viên (Admin)** - *Toàn quyền hệ thống*
  * Email: `admin@phela.vn` | Mã PIN: `1234`
* **Quản lý (Manager)** - *Quản lý cửa hàng, nhập kho*
  * Email: `manager@phela.vn` | Mã PIN: `2222`
* **Giao hàng (Shipper)** - *Nhận/Giao đơn*
  * Email: `shipper@phela.vn` | Mã PIN: `3333`
* **Nhân viên (Staff)** - *Thu ngân, pha chế POS*
  * Email: `staff@phela.vn` | Mã PIN: `4444`

### 4.2. Tài khoản Khách hàng (Đăng nhập tại Customer App - Port 3002)
Khách hàng đăng nhập bằng Số điện thoại (không cần mật khẩu).

* **Khách hàng thông thường (Có điểm thưởng):**
  * SĐT: `0987654321` (Email: nguyenvana@gmail.com)
  * SĐT: `0912345678` (Email: tranthib@gmail.com)
  * SĐT: `0923456789` (Email: levanc@gmail.com)
* **Khách mua vãng lai (Tạo đơn nhanh không tích điểm):**
  * SĐT: `0000000000`

### 4.3. Mã giảm giá (Voucher) có sẵn
Sử dụng các mã này tại bước thanh toán giỏ hàng:
* **`WELCOME`**: Giảm 10% tổng đơn (Áp dụng cho mọi khách).
* **`VIP`**: Giảm trực tiếp 20.000đ (Chỉ áp dụng cho SĐT `0987654321`).

---
> 💡 *Để biết thêm chi tiết về cách vận hành quy trình thu ngân, nhập kho hay pha chế, vui lòng tham khảo file `HUONG_DAN_SU_DUNG.md` đính kèm trong dự án.*
