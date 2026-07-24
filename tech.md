# 🚀 Báo Cáo Phân Tích Công Nghệ & Thuật Toán Dự Án Phê La (Monorepo)

Dự án **Phê La** là một hệ thống ERP (Enterprise Resource Planning) thu nhỏ dành riêng cho ngành F&B, bao gồm quản lý kho bãi, nhân sự, bán hàng (POS), và cổng thương mại điện tử dành cho khách hàng. Hệ thống được thiết kế theo kiến trúc **Monorepo** với 3 phân hệ chính hoạt động song song.

---

## 🏗️ 1. Cấu Trúc Kiến Trúc (Architecture)

*   **`apps/api` (Backend Server):** Đóng vai trò là "bộ não" trung tâm xử lý logic nghiệp vụ, giao tiếp cơ sở dữ liệu và cung cấp API (RESTful).
*   **`apps/web` (Admin & POS App):** Cổng thông tin (Web portal) dành cho đội ngũ Quản trị viên (Admin) và Nhân viên (Thu ngân/Barista).
*   **`apps/customer` (Customer Portal):** Cổng đặt hàng trực tuyến dành riêng cho khách hàng.

---

## 🧠 2. Các Thuật Toán Khai Phá Dữ Liệu (Data Mining Algorithms)

Điểm sáng của dự án nằm ở phân hệ **Analytics**, nơi áp dụng các thuật toán máy học chuyên biệt thay vì các truy vấn cơ sở dữ liệu thông thường:

1.  **Thuật toán Apriori (Khai phá luật kết hợp):**
    *   **Mục đích:** Tìm ra các nhóm sản phẩm thường xuyên được mua cùng nhau (Ví dụ: "Trà Ô Long" thường được mua kèm "Trân châu trắng").
    *   **Kỹ thuật:** Áp dụng **Apriori Pruning** (Cắt tỉa Apriori) để tối ưu hóa bộ nhớ, chỉ sinh tổ hợp mới khi mọi tập con của nó đều đã phổ biến (`minSupport`). Từ đó sinh ra các luật (Rules) dựa trên độ tin cậy (`minConfidence`).
2.  **Thuật toán HUI-Miner (High Utility Itemset):**
    *   **Mục đích:** Tìm ra các tập hợp sản phẩm mang lại **lợi nhuận/doanh thu** cao nhất. Khắc phục nhược điểm của Apriori (tập trung vào số lượng nhưng lợi nhuận có thể thấp).
    *   **Kỹ thuật:** Tính toán TWU (Transaction-Weighted Utilization), sử dụng cấu trúc **Utility-List** và thuật toán Tìm kiếm theo chiều sâu (DFS) kết hợp **Cắt nhánh (Remaining Utility Pruning)** để tìm tổ hợp siêu tốc mà không cần quét lại DB nhiều lần.

Ngoài ra, hệ thống áp dụng thuật toán **Duyệt Cây/Đồ thị (Tree Traversal)** ở phân hệ `recipes` để bóc tách một sản phẩm hoàn chỉnh (Trà Sữa) ra thành từng gram nguyên liệu thô (Trà, Sữa, Đường) nhằm mục đích trừ kho tự động.

---

## 💻 3. Ngôn Ngữ & Bộ Khung Cơ Bản (Core Stack)

*   **Ngôn ngữ chính:** `TypeScript` (Sử dụng đồng nhất ở cả 3 phân hệ).
*   **Backend Framework:** `Node.js` + `Express.js`.
*   **Frontend Framework:** `Next.js 14` (Sử dụng kiến trúc App Router mới nhất) + `React 18`.
*   **Database:** `SQL Server` (Giao tiếp thông qua `Prisma ORM`).

---

## 📦 4. Các Thư Viện Chuyên Biệt Theo Chức Năng

### 🔗 4.1. Phía Backend (`apps/api`)
*   **Database & ORM:** `@prisma/client` (Xử lý giao dịch Database an toàn, chống sai lệch dữ liệu bằng Prisma Transactions).
*   **Security & Auth:** `bcrypt` (băm mật khẩu) và `jsonwebtoken` (xác thực phiên đăng nhập).
*   **Validation:** `zod` (Kiểm duyệt dữ liệu đầu vào cực kỳ chặt chẽ).
*   **Realtime Communication:** `socket.io` (Đẩy thông báo đơn hàng theo thời gian thực tới POS và Khách hàng).
*   **AI Integration:** `@google/generative-ai` (Tích hợp LLM Gemini làm trợ lý ảo tự động tư vấn, ứng dụng kỹ thuật Prompt Injection và Function Calling).
*   **Payment Gateway:** `@payos/node` (Tự động sinh mã VietQR và nhận Webhook báo chuyển khoản thành công).
*   **Background Jobs:** `node-cron` (Lên lịch tự động chốt ca, tính lương, đồng bộ tồn kho vào nửa đêm).
*   **Push Notification & Email:** `firebase-admin` (Bắn thông báo đẩy) và `nodemailer` (Gửi email hóa đơn).
*   **File Upload:** `multer` (Xử lý tải ảnh sản phẩm, avatar nhân viên).

### 🎨 4.2. Phía Frontend (`apps/web` & `apps/customer`)
*   **UI/UX Styling:** `tailwindcss`, `clsx`, `tailwind-merge`, `class-variance-authority` (Hệ thống thiết kế chuẩn mực, tạo giao diện Responsive nhanh chóng).
*   **State Management & Caching:** `@tanstack/react-query` (Quản lý trạng thái, tạo cache dữ liệu, hỗ trợ tính năng Offline Fallback khi mất mạng).
*   **Icons & Toasts:** `lucide-react` (Bộ icon) và `sonner` (Thông báo Toast hiện đại).
*   **Realtime Client:** `socket.io-client` (Bắt tín hiệu từ Backend để cập nhật UI tự động).
*   **Markdown Parsing:** `react-markdown` (Render nội dung tin nhắn của Chatbot AI thành định dạng dễ đọc).
*   **Animation (Chỉ có ở Customer Web):** `framer-motion` (Tạo hiệu ứng chuyển cảnh mượt mà).
*   **Maps (Chỉ có ở Customer Web):** `leaflet` & `react-leaflet` (Bản đồ tương tác để chọn địa chỉ giao hàng).
*   **Push Client:** `firebase` (Nhận tín hiệu thông báo trên thiết bị di động/trình duyệt).

---

> 💡 **Tổng kết:** Phê La là một dự án đồ sộ, thiết kế kiến trúc theo định hướng Modern Web Stack (T3/MERN). Việc mạnh dạn áp dụng AI, Cổng thanh toán nội địa và các Thuật toán khai phá dữ liệu học thuật vào thực tiễn kinh doanh giúp hệ thống vượt ra khỏi ranh giới của một ứng dụng POS thông thường, trở thành một nền tảng hỗ trợ ra quyết định thông minh.
