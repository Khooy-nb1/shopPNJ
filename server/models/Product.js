import mongoose from 'mongoose';
const variant = new mongoose.Schema({ _id: String, sku: String, size: String, material: String, price: {type:Number,min:0}, stock: {type:Number,min:0,default:0} },{_id:false});
const schema = new mongoose.Schema({
 _id:String, name:{type:String,required:true},sku:{type:String,required:true,unique:true},slug:{type:String,required:true,unique:true},categoryId:{type:String,required:true},categoryName:String,
 price:{type:Number,required:true,min:0},salePrice:{type:Number,min:0},images:[String],description:String,shortDescription:String,details:String,
 carat:Number,cut:String,color:String,clarity:String,certificate:String,certificateNumber:String,material:String,diamondShape:String,gender:String,weight:Number,
 stock:{type:Number,min:0,default:0},sold:{type:Number,min:0,default:0},status:{type:String,enum:['active','inactive'],default:'active'},featured:Boolean,
 rating:{type:Number,default:0},reviewCount:{type:Number,default:0},size:String,availableSizes:[String],variants:[variant],tags:[String]
},{timestamps:true});
export const Product=mongoose.model('Product',schema);
