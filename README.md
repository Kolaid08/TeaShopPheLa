# 🧋 Phêla — Hệ Thống Quản Lý Cửa Hàng Trà Sữa (Southeast-Asian Café System)

Phêla là hệ thống quản lý cửa hàng bán lẻ trà sữa chuyên nghiệp được thiết kế theo kiến trúc monorepo hiện đại, tối ưu hóa cho hiệu năng cao, bảo mật nghiêm ngặt và trải nghiệm người dùng cao cấp. Dự án mang đậm phong cách thiết kế quán cà phê Đông Nam Á ấm cúng và sang trọng (Southeast-Asian café aesthetic).

---

## 📂 Kiến Trúc Thư Mục Monorepo (Folder Structure)

Kiến trúc monorepo sử dụng npm Workspaces quản lý độc lập ứng dụng Frontend và máy chủ API Backend:

```text
d:\HeThongPheLa/
├── .vscode/                 # Cấu hình gỡ lỗi và định dạng chuẩn hóa trên VS Code
│   ├── extensions.json
│   ├── settings.json
│   └── launch.json
├── apps/
│   ├── api/                 # BACKEND - Node.js + Express.js + Prisma ORM
│   │   ├── prisma/
│   │   │   └── schema.prisma # Toàn bộ mô hình ERD cơ sở dữ liệu vật lý
│   │   ├── src/
│   │   │   ├── config/      # Cấu hình biến môi trường kiểm thử bằng Zod
│   │   │   ├── middleware/  # JWT RBAC, Multer File Upload & Global Exception Handler
│   │   │   ├── modules/     # 18 phân hệ kinh doanh độc lập (auth, POS, salary,...)
│   │   │   ├── routes/      # Định tuyến RESTful phân nhóm phiên bản v1
│   │   │   └── index.ts     # Khởi chạy Express server & xử lý tắt máy an toàn
│   │   └── package.json
│   └── web/                 # FRONTEND - Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
│       ├── src/
│       │   ├── app/         # App Router & Nhóm định tuyến (dashboard)
│       │   ├── components/  # Thư viện widget giao diện Phêla Core UI
│       │   └── lib/         # Trình Fetch API tự động chuyển đổi Dual-Mode Mock/Real HTTP
│       └── package.json
├── .env.example             # Biến mẫu toàn hệ thống
├── .gitignore
├── .prettierrc              # Quy chuẩn tự động định dạng mã nguồn đồng bộ
├── eslint.config.js         # Quy chuẩn kiểm soát lỗi tĩnh ESLint toàn dự án
├── package.json             # Cấu hình npm Workspaces & Lệnh khởi chạy đồng thời
└── tsconfig.json            # Cấu hình TypeScript cơ sở toàn dự án
```

---

## 🛠️ Yêu Cầu Cài Đặt Hệ Thống (Prerequisites)

Để hệ thống hoạt động trơn tru trong môi trường sản xuất hoặc phát triển, vui lòng chuẩn bị:
1. **Node.js**: Phiên bản LTS mới nhất (v18.x trở lên).
2. **NPM**: Phiên bản 9.x trở lên đi kèm Node.js.
3. **Cơ sở dữ liệu**: Microsoft SQL Server (2019, 2022 hoặc phiên bản đám mây Azure SQL).
4. **Trình soạn thảo**: Khuyên dùng Visual Studio Code tích hợp sẵn các đề xuất extension chuẩn hóa cấu trúc thư mục.

---

## ⚙️ Cấu Hìn Biến Môi Trường (.env Setup)

Hệ thống được thiết kế bảo mật chặt chẽ. Tạo một tệp `.env` tại **thư mục gốc (root)** của dự án hoặc sử dụng các biến cấu hình có sẵn trong tệp `.env`. Dưới đây là ý nghĩa chi tiết:

```env
# --------------------
# CẤU HÌNH BACKEND (apps/api)
# --------------------
PORT=3001                                # Cổng hoạt động chính của máy chủ API
NODE_ENV=development                     # Môi trường chạy hệ thống (development / production)
API_VERSION=v1                           # Phiên bản quản lý định tuyến API

# Bảo mật mã hóa Token JWT (Access Token + Refresh Token HttpOnly Cookie)
JWT_ACCESS_SECRET=your_super_secret_jwt_access_token_key_here
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_token_key_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Nguồn gốc gọi CORS được phép kết nối
CLIENT_URL=http://localhost:3000

# Chuỗi kết nối Cơ sở dữ liệu SQL Server (Prisma)
DATABASE_URL="sqlserver://localhost:1433;database=Phela;user=sa;password=YourPassword123;trustServerCertificate=true"

# --------------------
# CẤU HÌNH FRONTEND (apps/web)
# --------------------
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1  # Điểm truy cập API dành cho máy khách Frontend
```

---

## 🚀 Hướng Dẫn Khởi Chạy Website (Run Instructions)

Thực hiện tuần tự 3 bước sau để vận hành hệ thống toàn diện:

### 1. Đồng bộ cấu trúc Cơ sở dữ liệu SQL Server (Prisma Migration)
Để tự động tạo và cấu hình các bảng vật lý chuẩn ERD trong SQL Server, bạn chạy lệnh sau tại thư mục gốc:
```bash
npx prisma migrate dev --name init --schema=apps/api/prisma/schema.prisma
```

### 2. Biên dịch và Build ứng dụng (Production Build Check)
Đảm bảo tất cả mã nguồn được tối ưu và không có lỗi tĩnh TypeScript:
```bash
# Định dạng lại toàn bộ mã nguồn theo quy chuẩn
npm run format

# Biên dịch toàn bộ các workspaces
npm run build
```

### 3. Chạy Máy chủ Phát triển Đồng Thời (Concurrent Development Server)
Khởi chạy cả Giao diện người dùng (cổng 3000) và Máy chủ Backend API (cổng 3001) chỉ với một lệnh duy nhất:
```bash
npm run dev
```

* **Giao diện website (POS & Quản trị):** Truy cập tại **[http://localhost:3000](http://localhost:3000)**
* **Điểm kiểm tra sức khỏe hệ thống (API Health Check):** Truy cập tại **[http://localhost:3001/health](http://localhost:3001/health)** (Trả về `{"status":"ok"}`)

---

## 💎 Quy Tắc Chất Lượng Mã Nguồn & Thiết Kế (Quality & UX Rules)

Hệ thống tuân thủ các nguyên tắc thiết kế nghiêm ngặt:
* **TypeScript Strict Mode**: Không sử dụng kiểu dữ liệu `any` tự do, không sử dụng khẳng định không null (`!.`) bừa bãi.
* **Màu sắc Thương hiệu ấm cúng**: Tông màu chủ đạo là hổ phách ấm `#C8763A` (warm amber), kết hợp sắc trầm đen gỗ `#1A1A1A` và kem ấm `#FDF8F3` đậm nét văn hóa Đông Nam Á. Không sử dụng màu xanh dương dashboard đại trà.
* **Chống giật lag giao diện (Anti-Slop)**: Sử dụng các thành phần `Skeleton` của shadcn/ui khi tải trang thay vì các vòng xoay spinner đơn điệu, các bảng số liệu hỗ trợ phân trang động, tìm kiếm nhanh và cập nhật trạng thái tức thời (Optimistic Updates).
* **Quốc tế hóa**: Toàn bộ dữ liệu tiền tệ được định dạng trực tiếp theo VND (`Intl.NumberFormat`) và ngày tháng thời gian hiển thị hoàn chỉnh theo ngôn ngữ Tiếng Việt (`vi-VN`).
