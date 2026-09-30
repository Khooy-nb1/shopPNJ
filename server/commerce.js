import mongoose from 'mongoose';
import {randomUUID} from 'node:crypto';
import {Product} from './models/Product.js';
import {Coupon} from './models/Coupon.js';
import {Order} from './models/Order.js';
import {StockMove,Notification} from './models/Extra.js';
import {fail, isValidPhone, normalizePhone} from './security.js';

export const config=()=>({
 vatRate:Number(process.env.VAT_RATE||0),
 shippingFee:Number(process.env.SHIPPING_FEE||150000),
 freeShipping:Number(process.env.FREE_SHIPPING_FROM||50000000),
 bankId:process.env.BANK_ID||'',
 bankAccount:process.env.BANK_ACCOUNT||'',
 bankName:process.env.BANK_ACCOUNT_NAME||''
});

export async function couponQuote(code,subtotal,session){
 if(!code)return {discount:0};

 const coupon=await Coupon.findOne({
  code:String(code).trim().toUpperCase(),
  status:'active'
 }).session(session||null);

 if(
  !coupon||
  (coupon.expiryDate&&new Date(coupon.expiryDate+'T23:59:59.999Z')<new Date())||
  coupon.usedCount>=coupon.usageLimit
 ){
  fail('Voucher không hợp lệ, đã hết hạn hoặc hết lượt');
 }

 if(subtotal<coupon.minOrderValue){
  fail(`Đơn hàng tối thiểu ${coupon.minOrderValue.toLocaleString('vi-VN')}đ`);
 }

 let discount=coupon.discountType==='percentage'
  ?Math.round(subtotal*coupon.discountValue/100)
  :coupon.discountValue;

 if(coupon.maxDiscount){
  discount=Math.min(discount,coupon.maxDiscount);
 }

 return {coupon,discount:Math.min(subtotal,discount)};
}

export async function quote(body,session){
 if(!Array.isArray(body.items)||body.items.length===0||body.items.length>100){
  fail('Giỏ hàng phải có từ 1 đến 100 dòng');
 }

 const grouped=new Map();

 for(const i of body.items){
  const quantity=Number(i.quantity);

  if(!Number.isInteger(quantity)||quantity<=0||quantity>999){
   fail('Số lượng không hợp lệ');
  }

  const productId=i.productId||i.product?._id;
  const size=i.selectedSize||i.size||'';
  const material=i.selectedMaterial||i.material||'';
  const key=JSON.stringify([productId,size,material]);
  const old=grouped.get(key);

  grouped.set(key,{
   productId,
   size,
   material,
   quantity:quantity+(old?.quantity||0)
  });
 }

 const items=[];
 let subtotal=0;
 const totals=new Map();

 for(const i of grouped.values()){
  const p=await Product.findById(i.productId).session(session||null);

  if(!p||p.status!=='active'){
   fail('Sản phẩm không còn bán');
  }

  let v;

  if(p.variants.length){
   v=p.variants.find(v=>
    (v.size||'')===i.size&&
    (v.material||p.material||'')===(i.material||p.material||'')
   );

   if(!v){
    fail(`Chọn đúng size/chất liệu của ${p.name}`);
   }
  }else if(p.availableSizes.length&&!p.availableSizes.includes(i.size)){
   fail(`Chọn size hợp lệ cho ${p.name}`);
  }

  const stock=v?v.stock:p.stock;
  const inventoryKey=p._id+':'+(v?._id||'base');
  const need=(totals.get(inventoryKey)||0)+i.quantity;

  totals.set(inventoryKey,need);

  if(need>stock){
   fail(`${p.name} chỉ còn ${stock} sản phẩm`);
  }

  const price=v?.price??p.salePrice??p.price;
  subtotal+=price*i.quantity;

  items.push({
   ...i,
   productName:p.name,
   productSku:v?.sku||p.sku,
   productImage:p.images[0],
   variantId:v?._id,
   material:i.material||p.material,
   price
  });
 }

 const {coupon,discount}=await couponQuote(body.couponCode,subtotal,session);
 const c=config();
 const shippingFee=subtotal>=c.freeShipping?0:c.shippingFee;
 const vatAmount=Math.round((subtotal-discount)*c.vatRate/100);

 return {
  items,
  subtotal,
  discount,
  shippingFee,
  vatRate:c.vatRate,
  vatAmount,
  total:subtotal-discount+shippingFee+vatAmount,
  couponCode:coupon?.code
 };
}

export function isReplicaSet(){
 const client=mongoose.connection?.client;
 const type=client?.topology?.description?.type;
 return type==='ReplicaSetWithPrimary'||type==='Sharded';
}

export async function transact(fn){
 if(!isReplicaSet()){
  return await fn(null);
 }

 const session=await mongoose.startSession();

 try{
  let result;

  await session.withTransaction(async()=>{
   result=await fn(session);
  });

  return result;
 }finally{
  await session.endSession();
 }
}

export async function moveStock(item,delta,session,userId,orderId){
 const filter={_id:item.productId};
 let update;

 if(item.variantId){
  filter.variants={
   $elemMatch:{
    _id:item.variantId,
    ...(delta<0?{stock:{$gte:-delta}}:{})
   }
  };

  update={
   $inc:{
    'variants.$.stock':delta,
    stock:delta
   }
  };
 }else{
  if(delta<0){
   filter.stock={$gte:-delta};
  }

  update={$inc:{stock:delta}};
 }

 const r=await Product.updateOne(filter,update,{session});

 if(!r.modifiedCount){
  fail('Tồn kho đã thay đổi, vui lòng kiểm tra lại',409);
 }

 await StockMove.create([{
  _id:randomUUID(),
  productId:item.productId,
  variantId:item.variantId,
  quantity:delta,
  reason:orderId?'Đơn hàng':'Điều chỉnh',
  userId,
  orderId
 }],{session});
}

export async function createOrder(body,user,key){
 if(typeof key!=='string'||key.length<12||key.length>100){
  fail('Thiếu mã chống đặt hàng lặp');
 }

 const requestKey=user._id+':'+key;
 const old=await Order.findOne({requestKey});

 if(old)return old;

 try{
  return await transact(async session=>{
   const existing=await Order.findOne({requestKey}).session(session);

   if(existing)return existing;

   const q=await quote(body,session);

   if(!['COD','BANK_TRANSFER'].includes(body.paymentMethod)){
    fail('Phương thức thanh toán chưa được cấu hình');
   }

   if(body.paymentMethod==='BANK_TRANSFER'&&!config().bankAccount){
    fail('Cửa hàng chưa cấu hình chuyển khoản, vui lòng chọn COD');
   }

   const address=body.shippingAddress||{};
   const customer=body.customerInfo||{};

   if(
    !customer.fullName?.trim()||
    !isValidPhone(customer.phone||'')||
    !address.streetAddress?.trim()||
    !address.province?.trim()||
    !address.ward?.trim()
   ){
    fail('Vui lòng điền đầy đủ họ tên, địa chỉ nhận hàng và số điện thoại Việt Nam hợp lệ (10 chữ số)');
   }
   customer.phone=normalizePhone(customer.phone);

   if(
    body.isCompanyInvoiceRequested&&
    (!body.companyInvoice?.companyName||!body.companyInvoice?.taxCode)
   ){
    fail('Thiếu thông tin công ty');
   }

   const id=randomUUID();

   for(const item of q.items){
    await moveStock(item,-item.quantity,session,user._id,id);
   }

   if(q.couponCode){
    const c=await Coupon.updateOne(
     {
      code:q.couponCode,
      $expr:{$lt:['$usedCount','$usageLimit']}
     },
     {$inc:{usedCount:1}},
     {session}
    );

    if(!c.modifiedCount){
     fail('Voucher vừa hết lượt',409);
    }
   }

   const [order]=await Order.create([{
    _id:id,
    orderCode:'3AE-'+new Date().getFullYear()+'-'+randomUUID().slice(0,8).toUpperCase(),
    requestKey,
    userId:user._id,
    ...q,
    customerInfo:customer,
    shippingAddress:address,
    paymentMethod:body.paymentMethod,
    note:String(body.note||address.note||'').slice(0,2000),
    isCompanyInvoiceRequested:!!body.isCompanyInvoiceRequested,
    companyInvoice:body.companyInvoice,
    expiresAt:body.paymentMethod==='BANK_TRANSFER'
     ?new Date(Date.now()+24*3600000)
     :undefined,
    timeline:[{
     status:'Chờ xác nhận',
     time:new Date().toISOString(),
     description:'Đã tiếp nhận đơn hàng và giữ hàng.'
    }]
   }],{session});

   await Notification.create([{
    _id:randomUUID(),
    userId:user._id,
    title:'Đặt hàng thành công',
    message:order.orderCode
   }],{session});

   return order;
  });
 }catch(e){
  if(e.code===11000){
   const order=await Order.findOne({requestKey});
   if(order)return order;
  }

  throw e;
 }
}

export const nextStates={
 'Chờ xác nhận':['Đã xác nhận','Đã hủy'],
 'Đã xác nhận':['Đang chuẩn bị','Đã hủy'],
 'Đang chuẩn bị':['Đang giao hàng','Đã hủy'],
 'Đang giao hàng':['Đã giao hàng','Đã hủy'],
 'Đã giao hàng':[],
 'Đã hủy':[]
};

export async function transition(id,status,user,reason){
 return transact(async session=>{
  const order=await Order.findById(id).session(session);

  if(!order){
   fail('Không tìm thấy đơn',404);
  }

  if(user.role!=='admin'&&order.userId!==user._id){
   fail('Không có quyền',403);
  }

  if(
   user.role!=='admin'&&
   (status!=='Đã hủy'||order.orderStatus!=='Chờ xác nhận')
  ){
   fail('Chỉ được hủy đơn chờ xác nhận');
  }

  if(order.orderStatus===status)return order;

  // Admin được chuyển tiến, không được chuyển lùi hoặc mở lại đơn đã kết thúc.
  const fulfillmentStates=[
   'Chờ xác nhận',
   'Đã xác nhận',
   'Đang chuẩn bị',
   'Đang giao hàng',
   'Đã giao hàng'
  ];

  const currentStep=fulfillmentStates.indexOf(order.orderStatus);
  const nextStep=fulfillmentStates.indexOf(status);

  const adminDirectUpdate=
   user.role==='admin'&&
   currentStep>=0&&
   currentStep<fulfillmentStates.length-1&&
   nextStep>currentStep;

  if(!nextStates[order.orderStatus]?.includes(status)&&!adminDirectUpdate){
   fail('Chuyển trạng thái không hợp lệ');
  }

  if(status==='Đã hủy'){
   if(!reason?.trim()){
    fail('Vui lòng nhập lý do hủy');
   }

   if(order.paymentStatus==='Đã thanh toán'){
    fail('Đơn đã thu tiền: xác nhận hoàn tiền trước khi hủy');
   }

   if(!order.stockReleased){
    for(const i of order.items){
     await moveStock(i,i.quantity,session,user._id,order._id);
    }

    order.stockReleased=true;

    if(order.couponCode){
     await Coupon.updateOne(
      {code:order.couponCode,usedCount:{$gt:0}},
      {$inc:{usedCount:-1}},
      {session}
     );
    }
   }
  }

  if(status==='Đã giao hàng'&&!order.soldCounted){
   for(const i of order.items){
    await Product.updateOne(
     {_id:i.productId},
     {$inc:{sold:i.quantity}},
     {session}
    );
   }

   order.soldCounted=true;
  }

  if(
   status==='Đã giao hàng'&&
   order.paymentMethod==='COD'&&
   order.paymentStatus==='Chưa thanh toán'
  ){
   order.paymentStatus='Đã thanh toán';
   order.paidAt=new Date();
   order.paymentReference='COD — thu khi giao hàng';
  }

  order.orderStatus=status;

  order.timeline.push({
   status,
   time:new Date().toISOString(),
   description:reason||'Cập nhật bởi cửa hàng'
  });

  await order.save({session});

  await Notification.create([{
   _id:randomUUID(),
   userId:order.userId,
   title:order.orderCode,
   message:status
  }],{session});

  return order;
 });
}