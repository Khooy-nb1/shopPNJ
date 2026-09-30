import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {MongoMemoryServer} from 'mongodb-memory-server';
import request from 'supertest';
import {app} from '../server/app.js';
import {bootstrap,restoreCatalog,ensureAdmin} from '../server/bootstrap.js';
import {Product} from '../server/models/Product.js';
import {User} from '../server/models/User.js';
import {checkPassword} from '../server/security.js';
let mongo;
before(async()=>{mongo=await MongoMemoryServer.create({instance:{args:['--nounixsocket']},binary:{version:'7.0.14'}});await mongoose.connect(mongo.getUri('catalog'),{autoIndex:false});process.env.ADMIN_EMAIL='admin@catalog.test';process.env.ADMIN_PASSWORD='CatalogAdmin123!';}, {timeout:180000});
after(async()=>{await mongoose.disconnect();if(mongo)await mongo.stop();});
test('standalone startup restores original menu data and articles without manual seed',async()=>{
 await bootstrap();await Promise.all(Object.values(mongoose.models).map(m=>m.createIndexes()));
 for(const [category,count] of [['nhan-kim-cuong-nu',5],['trang-suc-cuoi',2],['kim-cuong-vien',5]]){
  const r=await request(app).get('/api/products').query({category}).expect(200);assert.equal(r.body.total,count);
 }
 const r=await request(app).get('/api/content').expect(200);const news=r.body.data.filter(x=>x.kind==='news');assert.equal(news.length,4);assert.match(news.find(x=>x._id==='news-1').title,/Cầu Hôn/);assert.ok(news.every(x=>x.body&&x.image.startsWith('/images/')));
 await request(app).post('/api/auth/login').send({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD}).expect(200);
});
test('repair preserves inventory, edited prices and inactive state; explicit admin reset works',async()=>{
 await Product.updateOne({_id:'prod-2'},{$set:{price:1234567,stock:3,status:'inactive'}});
 await restoreCatalog();const p=await Product.findById('prod-2');assert.equal(p.price,1234567);assert.equal(p.stock,3);assert.equal(p.status,'inactive');assert.equal(await Product.countDocuments(),20);
 process.env.ADMIN_PASSWORD='ResetAdmin456!';await ensureAdmin();assert.equal(await checkPassword(process.env.ADMIN_PASSWORD,(await User.findOne({email:process.env.ADMIN_EMAIL}).select('+password')).password),false);
 await ensureAdmin({reset:true});await request(app).post('/api/auth/login').send({email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD}).expect(200);
});
test('legacy order keys and plaintext account passwords migrate without deleting records',async()=>{
 await mongoose.connection.collection('app_migrations').deleteMany({});
 await mongoose.connection.collection('orders').insertOne({_id:'legacy-order',orderCode:'LEGACY'});
 await User.collection.insertOne({_id:'legacy-user',name:'Legacy',email:'legacy@test.vn',password:'Original123!',role:'customer'});
 await bootstrap();assert.equal((await mongoose.connection.collection('orders').findOne({_id:'legacy-order'})).requestKey,'legacy:legacy-order');
 const user=await User.findById('legacy-user').select('+password');assert.ok(await checkPassword('Original123!',user.password));
 await request(app).post('/api/auth/login').send({email:'legacy@test.vn',password:'Original123!'}).expect(200);
});
test('carat filter does not lose fractional values at band boundaries',async()=>{
 await Product.updateOne({_id:'prod-1'},{$set:{carat:0.995}});
 const r=await request(app).get('/api/products').query({caratMin:0.5,caratMax:1,caratMaxExclusive:true}).expect(200);assert.ok(r.body.data.some(x=>x._id==='prod-1'));assert.ok(r.body.data.every(x=>x.carat>=0.5&&x.carat<1));
});
