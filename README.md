# 3AE Jewelry — bản sửa dự án cuahangpnj

Đọc **HUONG_DAN.md** để cài MongoDB replica set, tạo .env và admin.

```sh
npm ci
# cấu hình .env + MongoDB theo HUONG_DAN.md
npm run seed
npm run dev
```

Giao diện: http://localhost:3000. Admin: /admin. Quản lý bổ sung: /admin/manage.
Bản build dùng `npm run build` rồi `npm start` (cổng 5000).
