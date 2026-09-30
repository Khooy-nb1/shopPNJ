import mongoose from 'mongoose';
const schema=new mongoose.Schema({_id:String,orderCode:{type:String,unique:true,required:true},userId:{type:String,required:true},requestKey:{type:String,unique:true,required:true},
 customerInfo:{type:mongoose.Schema.Types.Mixed,required:true},shippingAddress:{type:mongoose.Schema.Types.Mixed,required:true},items:[mongoose.Schema.Types.Mixed],
 subtotal:Number,discount:Number,vatRate:Number,vatAmount:Number,shippingFee:Number,total:Number,couponCode:String,
 paymentMethod:{type:String,enum:['COD','BANK_TRANSFER'],required:true},paymentStatus:{type:String,enum:['Chưa thanh toán','Đã thanh toán','Đã hoàn tiền'],default:'Chưa thanh toán'},
 orderStatus:{type:String,enum:['Chờ xác nhận','Đã xác nhận','Đang chuẩn bị','Đang giao hàng','Đã giao hàng','Đã hủy'],default:'Chờ xác nhận'},
 isCompanyInvoiceRequested:Boolean,companyInvoice:mongoose.Schema.Types.Mixed,note:String,stockReleased:{type:Boolean,default:false},soldCounted:{type:Boolean,default:false},
 timeline:[mongoose.Schema.Types.Mixed],paymentReference:String,paidAt:Date,expiresAt:Date,carrier:String,trackingCode:String
},{timestamps:true});
export const Order=mongoose.model('Order',schema);
