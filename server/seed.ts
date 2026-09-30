import 'dotenv/config';
import mongoose from 'mongoose';
import {randomUUID} from 'node:crypto';
import {Content} from './models/Extra.js';
import {Store} from './models/Store.js';
import {restoreCatalog,ensureAdmin} from './bootstrap.js';
import {connectDB} from './db.js';

await connectDB();
try{
 console.log(await restoreCatalog());
 await ensureAdmin({reset:process.argv.includes('--reset-admin')});
 const policies=[['huong-dan-mua-hang','Hướng dẫn mua hàng','Chọn sản phẩm và size phù hợp, thêm vào giỏ, kiểm tra thông tin nhận hàng và xác nhận đặt hàng. Theo dõi tiến trình trong Tài khoản. Liên hệ cửa hàng khi cần tư vấn thông số và giấy kiểm định của sản phẩm.'],['giao-hang-thanh-toan','Giao hàng & thanh toán','Phí giao hàng được hiển thị trước khi xác nhận. Các phương thức khả dụng được liệt kê tại trang thanh toán. Với chuyển khoản, cửa hàng kiểm tra tiền nhận trước khi xác nhận. Vui lòng kiểm tra thông tin tài khoản và ghi đúng mã đơn.'],['bao-hanh-doi-tra','Bảo hành, đổi size & đổi trả','Bạn có thể gửi yêu cầu tại Tài khoản → Địa chỉ & hỗ trợ, kèm mã đơn và nội dung cần hỗ trợ. Cửa hàng sẽ kiểm tra và phản hồi điều kiện, thời gian và chi phí áp dụng cho từng sản phẩm trước khi thực hiện.'],['bao-mat','Thông tin tài khoản','Thông tin nhận hàng được dùng để xử lý đơn và hỗ trợ khách hàng. Không chia sẻ mật khẩu hoặc OTP. Khách hàng chỉ truy cập được đơn và thông tin của chính mình. Liên hệ cửa hàng khi cần chỉnh sửa hoặc hỗ trợ về dữ liệu cá nhân.']];
 for(const [slug,title,body]of policies)await Content.updateOne({slug},{$setOnInsert:{_id:randomUUID(),slug,title,body,kind:'policy',status:'active'}},{upsert:true});
 if(process.env.SHOP_ADDRESS)await Store.updateOne({code:'MAIN'},{$setOnInsert:{_id:'store-main',name:'Showroom 3AE',code:'MAIN',address:process.env.SHOP_ADDRESS,phone:process.env.SHOP_PHONE||'',openingHours:'Liên hệ trước khi đến'}},{upsert:true});

 console.log('Đã bổ sung dữ liệu thiếu. '+(process.argv.includes('--reset-admin')?'Đã đặt lại tài khoản quản trị theo .env.':''));
}finally{await mongoose.disconnect();}
