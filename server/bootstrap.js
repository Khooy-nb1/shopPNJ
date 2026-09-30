import fs from 'node:fs';
import mongoose from 'mongoose';
import {randomUUID} from 'node:crypto';
import {Product} from './models/Product.js';
import {Category} from './models/Category.js';
import {Coupon} from './models/Coupon.js';
import {User} from './models/User.js';
import {Banner,Content,Session} from './models/Extra.js';
import {hashPassword} from './security.js';
const read=name=>JSON.parse(fs.readFileSync(new URL('./data/'+name,import.meta.url),'utf8'));
const catalog=read('catalog.json'),news=read('news.json');

export async function restoreCatalog(){
 const categoryIds=new Map();
 for(const c of catalog.categories){
  const existing=await Category.findOne({$or:[{_id:c._id},{slug:c.slug}]}).lean();
  if(!existing)await Category.create(c);
  categoryIds.set(c._id,existing?._id||c._id);
 }
 for(const p of catalog.products){
  const existing=await Product.findOne({$or:[{_id:p._id},{sku:p.sku},{slug:p.slug}]}).lean();
  if(existing){
   // Fill absent fields only: keep edited prices, stock and inactive products.
   const missing={};
   for(const key of ['categoryId','categoryName','carat','diamondShape','color','clarity','cut','material','status'])
    if(existing[key]==null&&p[key]!=null)missing[key]=key==='categoryId'?categoryIds.get(p.categoryId):p[key];
   if(existing.images?.some(url=>url.includes('images.unsplash.com/')))missing.images=p.images;
   if(Object.keys(missing).length)await Product.updateOne({_id:existing._id},{$set:missing});
   continue;
  }
  const item={...p,categoryId:categoryIds.get(p.categoryId),rating:0,reviewCount:0,sold:0,certificateNumber:undefined};
  if(p.availableSizes?.length){const n=p.availableSizes.length;item.variants=p.availableSizes.map((size,i)=>({_id:p._id+'-'+size,sku:p.sku+'-'+size,size,material:p.material,price:p.salePrice??p.price,stock:Math.floor(p.stock/n)+(i<p.stock%n?1:0)}));}
  await Product.create(item);
 }
 for(const b of catalog.banners)await Banner.updateOne({_id:b._id},{$setOnInsert:{...b,mobileImage:b.image}},{upsert:true});
 for(const c of catalog.coupons)await Coupon.updateOne({code:c.code},{$setOnInsert:{...c,usedCount:0}},{upsert:true});
 for(const article of news)await Content.updateOne({slug:article.slug},{$setOnInsert:article},{upsert:true});
 return {products:await Product.countDocuments(),categories:await Category.countDocuments(),articles:await Content.countDocuments({kind:'news'})};
}

export async function ensureAdmin({reset=false}={}){
 const email=process.env.ADMIN_EMAIL?.trim().toLowerCase(),password=process.env.ADMIN_PASSWORD;
 if(!email||!password){if(reset)throw new Error('Điền ADMIN_EMAIL và ADMIN_PASSWORD trong .env.');return;}
 const existing=await User.findOne({email}).select('+password');
 if(!existing)await User.create({_id:randomUUID(),name:process.env.ADMIN_NAME||'Quản trị viên',email,password:await hashPassword(password),role:'admin'});
 else if(reset){
  await User.updateOne({_id:existing._id},{$set:{password:await hashPassword(password),role:'admin',status:'active',isLocked:false}});
  await Session.deleteMany({userId:existing._id});
 }
}

export async function bootstrap(){
 const migrations=mongoose.connection.collection('app_migrations');
 if(!await migrations.findOne({_id:'restore-original-catalog-v1'})){
  const counts=await restoreCatalog();
  // Imported original orders predate the idempotency key. Backfill before indexes.
  const orders=mongoose.connection.collection('orders');
  for await(const row of orders.find({$or:[{requestKey:{$exists:false}},{requestKey:null}]}))
   await orders.updateOne({_id:row._id},{$set:{requestKey:'legacy:'+String(row._id)}});
  // Preserve old passwords while upgrading the original plaintext storage.
  for await(const row of User.collection.find({password:{$type:'string'}})){
   if(!row.password.startsWith('scrypt:')&&row.password.length>=8&&row.password.length<=128)
    await User.collection.updateOne({_id:row._id,password:row.password},{$set:{password:await hashPassword(row.password)}});
  }
  await migrations.updateOne({_id:'restore-original-catalog-v1'},{$set:{completedAt:new Date()}},{upsert:true});
  console.log('Đã khôi phục dữ liệu gốc:',counts);
 }
 await ensureAdmin();
}
