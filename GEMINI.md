# WORKSPACE RULES & GUARDRAILS (QUY TẮC BẮT BUỘC CHO AI)

Tài liệu này đóng vai trò là Harness & Guardrail ràng buộc hành vi của AI Assistant khi làm việc trong dự án **Tool Tải Video YouTube**. AI bắt buộc phải tuân thủ nghiêm ngặt các quy tắc dưới đây:

---

## 🛑 QUY TẮC CỐT LÕI (CRITICAL GUARDRAIL)

### 1. Luôn xác nhận phương án tối ưu trước khi viết code
- **YÊU CẦU:** Trước mọi tính năng mới, thay đổi kiến trúc, hoặc xử lý yêu cầu kỹ thuật:
  - AI **BẮT BUỘC** phải phân tích bài toán, nêu rõ nguyên nhân và đề xuất phương án tối ưu nhất.
  - **CHƯA ĐƯỢC PHÉP VIẾT CODE** hoặc gọi tool chỉnh sửa file cho đến khi người dùng đọc, phản hồi và xác nhận đồng ý ("OK", "Đồng ý", v.v.).
- **TỪ KHÓA CẢNH BÁO:** Bất cứ khi nào người dùng nhắc nhở hoặc câu lệnh có hàm ý:
  > *"Trước tiên bạn hãy xác nhận lại phương án tối ưu với tôi. Chưa cần code."*
  > *"Xác nhận phương án trước."*
  > *"Phân tích giải pháp trước."*
  -> AI **CHỈ ĐƯỢC PHÉP** giải thích, tư vấn, phân tích ưu nhược điểm và chờ người dùng duyệt. Tuyệt đối không tự động sinh code hay sửa file.

---

## ⚙️ QUY TẮC KỸ THUẬT & KIẾN TRÚC (ARCHITECTURE HARNESS)

### 2. Quản lý cấu hình & Tính toàn vẹn dữ liệu
- Mọi thiết lập người dùng (thư mục tải, số luồng tải, định dạng MP4/MKV, kích thước chunk, chế độ 60fps/30fps) **BẮT BUỘC** phải lưu trữ và đồng bộ thông qua file `config.json`.
- Khi cập nhật code, tuyệt đối không được ghi đè làm mất cấu hình đã lưu của người dùng.

### 3. Kiểm soát tiến trình & Xung đột tài nguyên
- Khi khởi động hoặc kiểm tra ứng dụng Electron, luôn đảm bảo không để lại tiến trình chạy ngầm (orphan processes) gây xung đột khóa file (`Access is denied (0x5)` trên Chromium GPU cache).
- Luôn giữ cờ `disable-gpu-shader-disk-cache` và `requestSingleInstanceLock` trong `main.js`.

### 4. Giữ trải nghiệm khởi động sạch sẽ (Clean Startup)
- File `Chay_Tool.bat` phải khởi chạy Electron trực tiếp, tự đóng cửa sổ cmd và không in ra các dòng log thừa của npm (`> youtube-speed-downloader@1.0.0 start > electron .`).

### 5. Giao diện người dùng tối giản & Thực dụng
- Giữ giao diện chính (Header & URL Card) tinh gọn, thoáng đãng, tập trung vào tính năng tải video.
- Các thông tin quản trị thư viện, phiên bản engine (`yt-dlp`, `aria2c`, `ffmpeg`) phải đặt gọn gàng bên trong tab **"Cấu hình tốc độ" (Settings)**.

### 6. Tài nguyên Offline-First, Triệt tiêu giật font (Zero-FOUT) & Chống nháy trắng (Zero-FOWC)
- Mọi tài nguyên giao diện tĩnh (font chữ, icons, scripts) **BẮT BUỘC** phải đóng gói offline cục bộ (local woff2/svg) trong dự án.
- **TUYỆT ĐỐI KHÔNG** tải font/script qua CDN Internet trong Electron để loại bỏ 100% hiện tượng chớp giật chữ (FOUT - Flash of Unstyled Text) khi khởi động hoặc render lại giao diện.
- Khai báo font cục bộ bằng file `fonts.css` và liên kết trực tiếp trong `index.html`.
- Khóa cứng màu nền tối (`#08090d !important`) bằng **Critical Inline CSS** trực tiếp trên thẻ `<html>` và `<body>` trong `index.html` để loại bỏ 100% hiện tượng chớp/nháy trắng (FOWC - Flash of White Content) trước khi nạp xong file CSS ngoài.
- Cửa sổ Electron chỉ được phép gọi `show()` khi sự kiện `ready-to-show` đã phát ra, tuyệt đối không dùng `setTimeout` ép hiển thị sớm gây lỗi nháy khung hình.

### 7. Quy tắc đóng gói & Đẩy code lên GitHub (Zero-Leak Privacy & Out-of-the-Box)
- **Bảo mật & Tính riêng tư tuyệt đối:**
  + Tuyệt đối **KHÔNG ĐƯỢC PHÉP** commit file `config.json` chứa đường dẫn thư mục cá nhân, API keys, hoặc dữ liệu lưu trữ riêng của lập trình viên lên GitHub.
  + Luôn duy trì file mẫu `config.example.json` chứa các giá trị mặc định sạch sẽ (`downloadDir: ""`, `connections: 16`, v.v.).
  + Trong `.gitignore`, bắt buộc phải chặn `config.json`, `node_modules/`, `*.log`, và các file chụp màn hình/scratch thử nghiệm.
- **Tính khả dụng tức thì (Out-of-the-Box / Zero-Setup):**
  + Người dùng khác khi `git clone` về máy chỉ cần chạy `npm install` và nhấp đúp file chạy là ứng dụng tự động hoạt động ngay lập tức, không bao giờ bị crash vì thiếu file config.
  + Module `configManager.js` phải có cơ chế tự động: nếu chưa có `config.json`, tự copy từ `config.example.json` hoặc tự tạo `config.json` mặc định an toàn trỏ về thư mục `Downloads` của máy người dùng đó.
  + Tuyệt đối không để lại bất kỳ đường dẫn ổ đĩa tuyệt đối cục bộ nào (như `D:\TOOL YOUTUBE\...`) trong mã nguồn. Mọi đường dẫn phải sử dụng đường dẫn tương đối hoặc tự động phát hiện qua `where.exe` / thư mục `bin/`.
- **Chỉ đẩy code lên GitHub khi người dùng yêu cầu rõ ràng:**
  + Khi cập nhật code, sửa lỗi, tinh chỉnh UI hoặc thêm tính năng mới, AI **TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ ĐỘNG** commit và push code lên GitHub.
  + Chỉ khi người dùng chủ động yêu cầu rõ ràng (ví dụ: *"đẩy code lên github"*, *"push code"*, *"đẩy code lên"*, v.v.) thì AI mới tiến hành đóng gói và đẩy code lên repository.

---

## 💬 PHONG CÁCH GIAO TIẾP
- Trả lời bằng tiếng Việt rõ ràng, chuyên nghiệp, đi thẳng vào trọng tâm kỹ thuật.
- Luôn giải thích rõ bản chất nguyên nhân ("Tại sao") trước khi đưa ra phương án giải quyết ("Làm thế nào").
