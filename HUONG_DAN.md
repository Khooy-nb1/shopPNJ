## Bản sửa khôi phục dữ liệu gốc

Giữ file .env hiện tại. Trong thư mục có package.json, chạy:

```powershell
npm ci
npm run repair
npm run dev
```

`repair` bổ sung dữ liệu danh mục còn thiếu và đặt lại tài khoản quản trị theo ADMIN_EMAIL/ADMIN_PASSWORD trong .env. Lệnh này không xóa cơ sở dữ liệu, không ghi đè giá/tồn kho đã chỉnh. Khởi động lần đầu cũng tự bổ sung danh mục và bài gốc; không đổi mật khẩu tài khoản đã tồn tại.

Kết nối cũ: mongodb://127.0.0.1:27017/lumiere_jewelry. Xem danh mục, bài viết và đăng nhập chạy trên MongoDB thường. Riêng đặt/hủy đơn và điều chỉnh tồn kho vẫn dùng transaction, cần replica set; bản vá này chưa thay cơ chế đó.

Bản gốc có 20 sản phẩm, 6 danh mục và 4 bài viết. Khôi phục nội dung bài gốc, giữ ảnh kim cương trong máy và logo 3AE. 12 kiểm thử backend đã đạt, gồm 4 kiểm thử khôi phục trên MongoDB thường; chưa kiểm thử giao diện bằng trình duyệt thực.

---

# Website trang sức 3AE — bản sửa từ dự án PNJ

Giữ logo, tên thương hiệu và tông màu gốc. Đọc file này trước khi chạy.

## 1. Cài và chạy trên Windows

Yêu cầu Node.js 22 trở lên, MongoDB chạy replica set (giao dịch đặt hàng dùng transaction).

1. Giải nén ZIP vào thư mục mới; không chép đè dữ liệu MongoDB đang dùng.
2. Mở terminal trong thư mục dự án, chạy `npm ci`.
3. Sao chép `.env.example` thành `.env`.
4. Điền `ADMIN_EMAIL`, `ADMIN_PASSWORD` (tự đặt ít nhất 8 ký tự).
5. Khởi động MongoDB theo một trong hai cách dưới đây.
6. Chạy `npm run seed` một lần để thêm danh mục, sản phẩm minh họa và admin. Lệnh này không xóa hay ghi đè dữ liệu đã có.
7. Chạy `npm run dev`. Mở http://localhost:3000. Backend ở cổng 5000.
8. Quản trị: http://localhost:3000/admin, đăng nhập bằng email/mật khẩu bạn đã điền khi seed.
9. Mục quản trị bổ sung: `/admin/manage` (kho, biến thể, banner, voucher, thanh toán, hậu mãi, báo cáo).

Không có mật khẩu admin dùng chung. Thay `.env` sau khi seed không tự đổi mật khẩu tài khoản đã tồn tại. Dùng đổi mật khẩu trong tài khoản.

### Cách A: Docker Desktop

Nếu cổng 27017 chưa được MongoDB khác sử dụng:

```sh
docker compose up -d --wait
npm run seed
npm run dev
```

Nếu máy đã chạy dịch vụ MongoDB ở 27017, dùng cách B hoặc dừng dịch vụ đó trước khi bật Docker. Không xóa thư mục dữ liệu cũ.

### Cách B: MongoDB đã cài trên máy

Chạy MongoDB có tham số `--replSet rs0`, hoặc thêm vào mongod.cfg:

```yaml
replication:
  replSetName: rs0
```

Khởi động lại dịch vụ; trong mongosh chạy một lần:

```javascript
rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})
```

Chờ thành PRIMARY rồi dùng URI trong .env.example. MongoDB Compass chỉ là công cụ xem DB, không thay thế dịch vụ mongod.
MongoDB Atlas cũng dùng được nếu bạn cung cấp URI và quyền kết nối phù hợp.

## 2. Chạy hai máy / bản build

Máy 1:

```sh
npm run build
npm start
```

Máy 2 mở `http://IP_MAY_1:5000`. Máy 1 cho phép cổng 5000 trong firewall mạng riêng. Không cần cài MongoDB trên máy 2 và không mở cổng DB cho máy 2.
Có thể dùng START-LAN.bat. Cả API và giao diện được phục vụ cùng cổng 5000.
Nếu chạy Vite dev qua IP, thêm `http://IP_MAY_1:3000` vào APP_ORIGINS.
Production HTTPS: đặt COOKIE_SECURE=true và cấu hình reverse proxy cùng origin.

## 3. Dữ liệu cũ

Cấu trúc Product/User/Order đã thay đổi. Nên chạy bản sửa bằng database mới để kiểm tra trước.
Nếu cần giữ dữ liệu đang bán thật, phải sao lưu và chuyển đổi có kiểm soát; bản này không tự di chuyển tài khoản mật khẩu thô, đơn giả hay localStorage cũ vào DB.
Các JSON/SQL ở database/ là dữ liệu cũ của bản gốc, không phải nguồn vận hành. Seed mới lấy dữ liệu tại server/data/catalog.json và server/data/news.json; không seed đơn, khách hay đánh giá giả.

## 4. Chức năng đã triển khai

- API/MongoDB cho sản phẩm, danh mục, tài khoản, đơn, voucher, banner, đánh giá, nội dung, cửa hàng.
- Mật khẩu scrypt, cookie phiên HttpOnly, xác thực và phân quyền backend, khóa tài khoản vô hiệu hóa phiên.
- Đăng ký thật; đổi mật khẩu bằng mật khẩu hiện tại; OTP email tùy cấu hình, không mã dự phòng.
- Giỏ và yêu thích lưu DB theo tài khoản; giỏ khách chưa đăng nhập lưu tạm.
- Báo giá tại server; lưu địa chỉ, ghi chú/khắc chữ, thông tin công ty trong đơn.
- Transaction giữ/trừ kho, mã chống đặt lặp, quy tắc trạng thái, hủy hoàn kho/voucher một lần.
- Sản phẩm/biến thể, upload ảnh JPG/PNG/WEBP, điều chỉnh kho có lịch sử.
- COD, chuyển khoản nếu đã cấu hình, xác nhận thu tiền và ghi nhận hoàn tiền thủ công có biên nhận.
- Đánh giá cần có đơn đã giao, chờ duyệt, tính lại điểm sau duyệt/ẩn.
- Quản trị bổ sung: danh mục, banner, showroom, nội dung, voucher, thanh toán, vận đơn, biến thể, kho, đánh giá, hậu mãi, báo cáo.
- Địa chỉ, thông báo trong tài khoản và yêu cầu bảo hành/đổi size/đổi trả/hoàn tiền.
- Trang chính sách, showroom, tin tức từ DB, 404; bản in đơn không giả chữ ký số.

## 5. Các dịch vụ ngoài — chưa phải tích hợp thanh toán tự động

Bản giao hiện chạy COD và chuyển khoản xác nhận thủ công. MoMo/ZaloPay/VNPAY đã được bỏ khỏi lựa chọn vì bản gốc chỉ tạo QR giả; chưa triển khai tích hợp merchant/webhook của các cổng này.
Điền BANK_ID, BANK_ACCOUNT, BANK_ACCOUNT_NAME để bật QR chuyển khoản. Đơn chờ chuyển khoản hết hạn sau 24 giờ được hủy và hoàn kho khi server đang chạy.
OTP qua email cần SMTP_HOST/PORT/USER/PASSWORD/FROM. Mặc định đăng ký không yêu cầu OTP và không tự đánh dấu điện thoại đã xác minh. Đặt REQUIRE_REGISTER_OTP=true chỉ khi SMTP hoạt động. Chưa tích hợp SMS.
Vận đơn nhập thủ công; chưa có API hãng vận chuyển. Yêu cầu hậu mãi là luồng tiếp nhận/phản hồi; hoàn tiền phải thực hiện thực tế trước khi admin ghi nhận. Không tự phát hành hóa đơn điện tử.
Không có hứa hẹn đã gửi email đơn hàng nếu chưa có dịch vụ gửi. Thông báo đơn hiện được lưu trong tài khoản.

## 6. Giá, thuế và thông tin bán hàng

VAT_RATE mặc định 0: không cộng thêm lên giá niêm yết. Nếu đổi cấu hình, checkout và đơn dùng cùng phép tính tại server.
Người vận hành phải xác nhận quy tắc thuế/giá và chính sách thật trước khi sử dụng thương mại; không coi mức trong bản demo là tư vấn thuế.
Điền thông tin showroom, chính sách thực tế, tài khoản nhận tiền và kiểm tra sản phẩm trước khi bán.
Seed sản phẩm là minh họa; đã bỏ tự sinh số chứng nhận. Không dùng ảnh minh họa như bằng chứng kiểm định hàng thật.

## 7. Ảnh

Đã bỏ link ảnh Unsplash khỏi giao diện/dữ liệu nguồn đang dùng, thay ảnh kim cương/trang sức nội bộ theo danh mục.
Ba ảnh minh họa mới: public/images/diamond-cushion.png, diamond-emerald.png, diamond-princess.png.
Ảnh được tạo bằng công cụ tạo ảnh tích hợp, không phải ảnh chụp sản phẩm có chứng nhận. Các ảnh khác được giữ từ bộ ảnh gốc đã kiểm tra chủ đề.
Prompt chung: ảnh macro một viên kim cương không màu rời (Cushion/Emerald/Princess tương ứng), nền nhung navy, không nhẫn/kim loại/chữ/logo/chứng thư, dùng cho danh mục minh họa.
Chưa thay logo.

## 8. Kiểm thử

```sh
npm run lint
npm run build
npm test
```

8 bài kiểm thử tích hợp backend đã đạt với MongoDB replica set thử nghiệm: phân quyền/ẩn mật khẩu, giá server, đơn bền vững/chống lặp, hoàn kho, tranh mua món cuối, dữ liệu không hợp lệ, voucher, trạng thái thu tiền, đánh giá và lưu giỏ/yêu thích/khóa phiên.
Bộ test dùng MongoDB tạm riêng, không dùng DB trong .env. Lần đầu cần mạng để tải binary MongoDB. Trên môi trường Linux tạo bản này cần TMPDIR=/dev/shm do giới hạn hệ thống tệp; Windows thường không cần.
Chưa nghiệm thu giao diện bằng trình duyệt thực trong môi trường tạo ZIP vì không tải được Chromium. Cần chạy thử theo checklist dưới đây trước khi dùng với giao dịch thật.

- Khách đăng ký, đăng nhập sai/đúng; admin không dùng được bằng tài khoản khách.
- Admin thêm sản phẩm/ảnh; khách trên máy khác thấy sản phẩm.
- Chọn size/chất liệu, giỏ, checkout, xác nhận đơn; tổng tiền thống nhất.
- Admin thấy đơn, cập nhật trạng thái; khách xem lịch sử, hủy đúng điều kiện.
- Kiểm tra màn hình điện thoại, upload ảnh, địa chỉ, banner và form quản trị.

## 9. Sao lưu

Sao lưu DB bằng mongodump trước khi thay phiên bản; lưu cả public/uploads. Khôi phục chỉ vào DB thử nghiệm trước.
Không đưa .env vào git/ZIP chia sẻ. node_modules không kèm trong ZIP; cài lại bằng npm ci.
