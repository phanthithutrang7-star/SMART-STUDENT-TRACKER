# Smart Student Tracker 🎓📊

Hệ thống theo dõi, phân tích tiến trình học tập và hỗ trợ học sinh đa môn học bằng dữ liệu và AI dành cho Giáo viên, Quản trị viên và Nhà trường.

---

## 🚀 Tính năng nổi bật

- **Phân tích tiến trình đa môn học (Multi-subject Analytics)**: Theo dõi tỷ lệ nộp bài, điểm trung bình, xu hướng điểm số (Tiến bộ, Ổn định, Cần theo dõi) theo từng môn (Toán, Văn, Anh, Lý, Tin...) hoặc tổng hợp toàn diện.
- **Sổ điểm & Nhập điểm linh hoạt**: Hỗ trợ nhập điểm từ tệp CSV/Excel với đối soát 2 bước, tự động chuẩn hóa dấu phẩy/chấm thập phân, phân biệt điểm 0 và vắng thi, tải bảng điểm mẫu theo lớp.
- **Theo dõi bài tập & Nhiệm vụ**: Quản lý hạn nộp, chấm bài hàng loạt, phân loại trạng thái nộp bài (Đúng hạn, Nộp muộn, Quá hạn).
- **Cảnh báo sớm & Can thiệp sư phạm (Early Alerts)**: Tự động phát hiện nguy cơ học tập theo dữ liệu và đề xuất biện pháp hỗ trợ kịp thời.
- **Trợ lý AI Gemini**: Tóm tắt báo cáo tuần, phân tích xu hướng học lực, soạn thảo thông báo gửi học sinh & phụ huynh.

---

## 🛠️ Hướng Dẫn Đẩy Code Lên GitHub

Mở Terminal tại thư mục gốc của dự án và chạy các lệnh sau:

```bash
# 1. Khởi tạo Git repository (nếu chưa có)
git init

# 2. Thêm tất cả các tệp vào git staging
git add .

# 3. Tạo commit đầu tiên
git commit -m "feat: setup Smart Student Tracker ready for GitHub and Vercel"

# 4. Đổi tên nhánh chính thành main
git branch -M main

# 5. Liên kết tới repository trên GitHub của bạn (thay bằng URL repo của bạn)
git remote add origin https://github.com/<tai-khoan-cua-ban>/<ten-repository>.git

# 6. Đẩy code lên GitHub
git push -u origin main
```

---

## ☁️ Hướng Dẫn Deploy Lên Vercel

Dự án đã được cấu hình sẵn tệp `vercel.json` và Serverless Function `api/index.ts`. Bạn có thể deploy nhanh chóng:

### Cách 1: Deploy qua giao diện Vercel Dashboard (Khuyên dùng)

1. Đăng nhập vào [Vercel](https://vercel.com) bằng tài khoản GitHub của bạn.
2. Bấm nút **Add New...** ➔ **Project**.
3. Chọn repository GitHub bạn vừa tạo ở bước trên và bấm **Import**.
4. Cấu hình Project (Vercel tự động nhận diện chính xác):
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (để mặc định)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. *(Tùy chọn)* Thêm Biến Môi Trường (**Environment Variables**):
   - Tên: `GEMINI_API_KEY`
   - Giá trị: Khóa API Gemini của bạn lấy tại Google AI Studio (nếu muốn kích hoạt chức năng Trợ lý AI thực tế).
6. Bấm **Deploy**. Vercel sẽ tự động build frontend và kích hoạt các API serverless trong vòng 1 phút!

### Cách 2: Deploy qua Vercel CLI

```bash
npm install -g vercel
vercel
# Trả lời các câu hỏi mặc định của Vercel (chọn Deploy to production: vercel --prod)
```

---

## 💻 Chạy Thử Trên Môi Trường Cục Bộ (Local Development)

```bash
# Cài đặt dependencies
npm install

# Khởi chạy máy chủ phát triển (cả frontend và backend)
npm run dev

# Mở trình duyệt tại: http://localhost:3000
```

---

## 📁 Cấu Trúc Dự Án

```
├── api/
│   └── index.ts          # Vercel Serverless Function entry point
├── server/
│   ├── db/               # Lưu trữ dữ liệu và logic nghiệp vụ (database.ts, seedData.ts)
│   ├── routes/           # Các API endpoints (/classes, /students, /assessments...)
│   └── services/         # Tích hợp AI Gemini (geminiService.ts)
├── src/
│   ├── components/       # Các màn hình (Analytics, Assessments, Students, Alerts, AI...)
│   ├── api/              # API Client giao tiếp backend
│   └── types/            # TypeScript interfaces
├── vercel.json           # Cấu hình routing & rewrites cho Vercel
├── vite.config.ts        # Cấu hình Vite React & Tailwind CSS
└── package.json          # Danh sách dependencies & scripts
```
