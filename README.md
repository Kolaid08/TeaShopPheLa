# Phê La - Project Documentation

Dự án này là hệ thống quản lý và bán hàng của thương hiệu Phê La, được xây dựng theo kiến trúc Monorepo.

## 1. Công nghệ sử dụng cho Thanh toán Online và Chatbox

*   **Thanh toán Online (Payment Gateway)**: Tích hợp cổng thanh toán **PayOS** thông qua thư viện `@payos/node`. Quy trình hoạt động bằng cách tạo link thanh toán (hoặc QR Code VietQR chuyển khoản nhanh) và nhận tín hiệu xác nhận tự động thông qua hệ thống **Webhook**.
*   **Chatbox Trực Tuyến**: 
    *   **Frontend**: Xây dựng bằng ReactJS / Next.js, giao diện tuỳ chỉnh với Tailwind CSS và kết nối theo thời gian thực (Realtime) qua thư viện `socket.io-client`.
    *   **Backend**: Ứng dụng Node.js (Express) với `socket.io` chạy qua WebSockets. Tích hợp trí tuệ nhân tạo **Google Gemini API** (`@google/generative-ai`) làm AI tự động giải đáp khách hàng khi nhân viên tư vấn đang bận hoặc khách hàng cần trả lời nhanh.

## 2. Công nghệ lưu trữ Giỏ hàng (Cart)

Khác với các ứng dụng chỉ lưu giỏ hàng tạm thời bằng LocalStorage trên trình duyệt, dự án này lưu trữ giỏ hàng **trực tiếp dưới Cơ sở dữ liệu (SQL Server)** thông qua Prisma ORM để đảm bảo tính nhất quán và không mất dữ liệu:

*   **Với khách vãng lai (Chưa đăng nhập)**: Trình duyệt tự sinh một đoạn mã `SessionID` (UUID) và lưu vào LocalStorage/Cookies. Hệ thống Backend sẽ dùng `SessionID` này để tạo một bản ghi trong bảng `Cart` dưới CSDL. Nhờ đó khách có lỡ tắt trình duyệt thì lúc mở lại vẫn còn giỏ hàng.
*   **Với khách đã đăng nhập (Thành viên)**: Hệ thống sử dụng trực tiếp `CustomerID` để liên kết bản ghi `Cart`. Nếu khách vãn lai quyết định đăng nhập, hệ thống sẽ thực hiện hợp nhất (merge) các sản phẩm từ giỏ `SessionID` sang giỏ của `CustomerID` đó.

## 3. Hướng dẫn chạy Project (Dành cho Clone từ Github)

Vì project áp dụng kiến trúc **Monorepo** (gồm Backend API, Web Admin, Customer App trong một gốc), nên bạn cần làm theo các bước sau để khởi chạy:

### Bước 1: Cài đặt Node.js và các gói thư viện
Đảm bảo máy bạn đã cài Node.js. Mở terminal tại thư mục gốc của project (chứa `package.json` tổng) và chạy:
```bash
npm install
```

### Bước 2: Cấu hình biến môi trường (.env)
Project đã được cấu hình **ẩn (bảo mật) tất cả các API Key**. Bạn cần tạo file `.env` nằm ở `apps/api/` dựa trên file `.env.example` hoặc theo mẫu dưới đây:
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

### Bước 3: Khởi tạo Cơ sở dữ liệu & Tạo dữ liệu mẫu (Seed)
Di chuyển vào thư mục Backend (API) để chuẩn bị DB:
```bash
cd apps/api

# Khởi tạo Prisma Client
npx prisma generate

# Áp dụng cấu trúc các bảng vào CSDL SQL Server
npx prisma db push

# Chạy tệp seed.ts để sinh ra 20 sản phẩm mẫu và các danh mục mặc định
npx prisma db seed
```

### Bước 4: Khởi động toàn bộ hệ thống
Quay lại thư mục gốc của project và chạy lệnh khởi động tổng:
```bash
cd ../..
npm run dev
```
Lệnh này sử dụng `concurrently` để chạy đồng thời cả Backend và các ứng dụng Frontend.
- **Customer App (Giao diện khách mua hàng)**: `http://localhost:3000` (hoặc cổng hiển thị trong terminal)
- **Admin App (Giao diện quản lý)**: `http://localhost:3002` (hoặc cổng hiển thị trong terminal)
- **Backend API**: `http://localhost:3001`
