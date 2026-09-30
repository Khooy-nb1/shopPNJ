import mongoose from 'mongoose';
const schema=new mongoose.Schema({_id:String,name:{type:String,required:true},email:{type:String,required:true,unique:true},phone:String,
 password:{type:String,required:true,select:false},address:String,avatar:String,role:{type:String,enum:['customer','admin'],default:'customer'},
 isPhoneVerified:{type:Boolean,default:false},status:{type:String,enum:['active','locked'],default:'active'},isLocked:{type:Boolean,default:false},lockedAt:Date,lockReason:String,
 addresses:{type:[mongoose.Schema.Types.Mixed],default:[]},cart:{type:[mongoose.Schema.Types.Mixed],default:[]},wishlist:{type:[String],default:[]}
},{timestamps:true});
export const User=mongoose.model('User',schema);
