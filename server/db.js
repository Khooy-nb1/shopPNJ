import mongoose from 'mongoose';

export async function connectDB(uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lumiere_jewelry') {
  if (uri.includes('replicaSet=')) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000, autoIndex: false });
      console.log('Đã kết nối MongoDB (chế độ Replica Set).');
      return mongoose.connection;
    } catch {
      const cleanUri = uri.replace(/[?&]replicaSet=[^&]+/, '').replace(/\?$/, '');
      console.warn(`[Thông báo] Không tìm thấy Replica Set, chuyển sang chế độ Standalone: ${cleanUri}`);
      await mongoose.connect(cleanUri, { serverSelectionTimeoutMS: 5000, autoIndex: false });
      console.log('Đã kết nối MongoDB (chế độ Standalone).');
      return mongoose.connection;
    }
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, autoIndex: false });
  console.log('Đã kết nối MongoDB thành công.');
  return mongoose.connection;
}
