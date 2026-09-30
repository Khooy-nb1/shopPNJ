import 'dotenv/config';
import mongoose from 'mongoose';
import {connectDB} from './db.js';
import {bootstrap} from './bootstrap.js';
import {app} from './app.js';
import {Order} from './models/Order.js';
import {transition} from './commerce.js';

try {
  await connectDB();
  await bootstrap();
  await Promise.all(Object.values(mongoose.models).map(model => model.createIndexes()));
  
  const port = Number(process.env.PORT || 5000);
  app.listen(port, '0.0.0.0', () => console.log('Website/API chạy tại cổng ' + port));
  
  const timer = setInterval(async () => {
    try {
      const expired = await Order.find({
        expiresAt: { $lt: new Date() },
        paymentStatus: 'Chưa thanh toán',
        orderStatus: 'Chờ xác nhận'
      }).limit(100);
      for (const o of expired) {
        await transition(o._id, 'Đã hủy', { _id: 'system', role: 'admin' }, 'Hết thời gian chờ chuyển khoản');
      }
    } catch (e) {
      console.error('Không hoàn tất tác vụ hết hạn đơn:', e.message);
    }
  }, 60000);
  timer.unref();
} catch (e) {
  console.error('Không khởi động được API:', e.message);
  process.exit(1);
}
