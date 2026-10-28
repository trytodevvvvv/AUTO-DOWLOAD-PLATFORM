# HYPER TUBE - YouTube Speed Downloader (Pro 16X / Multi-Threaded)

Bộ tăng tốc tải video YouTube đa luồng cực đại, khai thác tối đa băng thông mạng tương tự Internet Download Manager (IDM). Ứng dụng xây dựng trên nền tảng **Electron** kết hợp bộ ba engine xử lý video hàng đầu: **yt-dlp**, **aria2c** và **FFmpeg**.

---

## ⚡ Các tính năng nổi bật

1. **Tăng tốc đa luồng IDM-Grade (16 - 32 Luồng đồng thời):**
   - Tích hợp engine `aria2c` phân mảnh video thành 16 - 32 kết nối HTTP song song với Range Request.
   - Cơ chế HTTP chunking 10MB giúp vượt qua triệt để thuật toán bóp băng thông của YouTube CDN (`googlevideo.com`).
   - Tải siêu mượt cho các video dung lượng lớn **từ 1GB đến hàng chục GB (Full HD, 2K, 4K, 8K, 60fps)**.

2. **Tải hàng loạt theo hàng đợi tuần tự (Sequential FIFO Batch Queue):**
   - Hỗ trợ dán hàng loạt link YouTube (mỗi dòng một link hoặc đoạn văn bản chứa nhiều link).
   - Tự động nhận diện và lọc ra toàn bộ URL YouTube hợp lệ.
   - Quản lý hàng đợi tự động: Tải xong video #1 ➔ Lưu lịch sử ➔ Tự động chuyển sang video #2 nối tiếp đến hết.
   - Cơ chế tự phục hồi: Nếu có link hỏng/riêng tư, tự động đánh dấu và tiếp tục tải video tiếp theo mà không làm gián đoạn cả danh sách.
   - Bảng theo dõi tiến độ tổng thể, tốc độ tức thời và từng video riêng biệt.

3. **Phân tích chất lượng & Xem trước chi tiết:**
   - Dán nhanh từ Clipboard với 1 click.
   - Hiển thị đầy đủ Thumbnail HD, Tiêu đề, Kênh, Thời lượng, Lượt xem.
   - Liệt kê toàn bộ độ phân giải khả dụng kèm dung lượng ước tính để dễ dàng lựa chọn.

4. **Chế độ tách âm thanh (Audio Only):**
   - Hỗ trợ tải và chuyển đổi âm thanh chất lượng cao: **MP3 (320kbps)**, **M4A nguyên gốc**, và **WAV Lossless**.

5. **Ghép luồng Zero-Reencode (FFmpeg Stream Copy):**
   - Tự động ghép luồng video và audio thành file chuẩn `.mp4` hoặc `.mkv` chỉ trong **2 - 5 giây** bằng kỹ thuật Stream Copy, không làm suy giảm chất lượng gốc.

6. **Giao diện Cyber-Dark Glassmorphic hiện đại:**
   - Hệ thống Custom Glassmorphic Dropdown sang trọng, loại bỏ hoàn toàn các khung viền xanh thô kệch mặc định của hệ điều hành.
   - Thiết kế Offline-First: 100% font chữ và vector icons được đóng gói cục bộ, triệt tiêu hoàn toàn hiện tượng nháy trắng (Zero-FOWC) và giật phông chữ (Zero-FOUT).

7. **Quản trị cấu hình & Lịch sử tiện ích:**
   - Mọi cấu hình (số luồng, định dạng, chunk size, FPS mode, chất lượng hàng loạt, thư mục tải) đều được lưu trữ và đồng bộ an toàn qua `config.json`.
   - Lưu trữ lịch sử tải hoàn tất, hỗ trợ mở nhanh file hoặc thư mục đích chỉ với 1 click.

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy (Dành cho người dùng mới)

### 1. Yêu cầu hệ thống
- Hệ điều hành: Windows 10 / 11 (64-bit).
- Đã cài đặt [Node.js](https://nodejs.org/) (Khuyến nghị phiên bản LTS v18 trở lên).

### 2. Cài đặt
1. Mở Terminal / Command Prompt và tải mã nguồn về máy:
   ```bash
   git clone https://github.com/trytodevvvvv/AUTO-DOWLOAD-PLATFORM.git
   cd AUTO-DOWLOAD-PLATFORM
   ```

2. Cài đặt các gói phụ thuộc (Dependencies):
   ```bash
   npm install
   ```

### 3. Khởi chạy ứng dụng
Chỉ cần nhấp đúp chuột vào file:
👉 **`Chay_Tool.bat`**

Hoặc chạy lệnh từ dòng lệnh:
```bash
npm start
```

*Lưu ý: Ứng dụng đã tích hợp sẵn `yt-dlp` và `aria2c` trong thư mục `bin/`. Để tính năng ghép file hoạt động tốt nhất, hãy đảm bảo máy tính đã cài đặt [FFmpeg](https://ffmpeg.org/) (có trong PATH hoặc đặt file `ffmpeg.exe` vào thư mục `bin/`).*

---

## 🔒 Bản quyền & Giấy phép
Phát hành theo giấy phép MIT License. Tự do sử dụng, chỉnh sửa và phát triển.
