import axios from 'axios';
import type {User} from '../types';
export const apiClient=axios.create({baseURL:'/api',withCredentials:true,timeout:15000});
apiClient.interceptors.response.use(r=>r,e=>{const err=new Error(e.response?.data?.message||'Không kết nối được máy chủ. Vui lòng thử lại.');(err as any).status=e.response?.status;throw err;});
export const get=async(url:string,params?:any)=>(await apiClient.get(url,{params})).data;
export const post=async(url:string,data?:any)=>(await apiClient.post(url,data)).data;
export const put=async(url:string,data?:any)=>(await apiClient.put(url,data)).data;
export const patch=async(url:string,data?:any)=>(await apiClient.patch(url,data)).data;
export const del=async(url:string)=>(await apiClient.delete(url)).data;
const crud=(url:string)=>({getAll:(params?:any)=>get(url,params),getById:(id:string)=>get(`${url}/${id}`),create:(d:any)=>post(url,d),update:(id:string,d:any)=>put(`${url}/${id}`,d),delete:(id:string)=>del(`${url}/${id}`)});
export const apiService={
 auth:{register:(d:any)=>post('/auth/register',d),login:(d:any)=>post('/auth/login',d),logout:()=>post('/auth/logout'),
  getCurrentUser:async():Promise<User|null>=>{try{return (await get('/auth/me')).data;}catch(e:any){if(e.status===401||e.status===403)return null;throw e;}},
  sendOtp:(target:string,type='REGISTER')=>post('/auth/send-otp',{target,type}),
  resetPassword:(target:string,otp:string,newPassword:string)=>post('/auth/reset-password',{target,otp,newPassword}),
  updateProfile:(_id:string,data:Partial<User>)=>patch('/me',data)},
 products:crud('/products'),categories:crud('/categories'),
 orders:{...crud('/orders'),getAll:(userId?:string)=>get('/orders',userId?{userId}:undefined),
  create:async(data:any)=>{let key=sessionStorage.getItem('checkout-request');if(!key){key=crypto.randomUUID();sessionStorage.setItem('checkout-request',key);}const r=(await apiClient.post('/orders',data,{headers:{'Idempotency-Key':key}})).data;sessionStorage.removeItem('checkout-request');return r;},
  updateStatus:(id:string,status:string,note?:string)=>put(`/orders/${id}/status`,{status,note}),
  cancelOrder:(id:string,reason='Khách yêu cầu hủy')=>post(`/orders/${id}/cancel`,{reason})},
 coupons:{...crud('/coupons'),check:(code:string,subtotal:number)=>post('/coupons/apply',{code,orderTotal:subtotal})},
 reviews:{getAll:()=>get('/reviews'),getByProduct:(productId:string)=>get('/reviews',{productId}),addReview:(d:any)=>post('/reviews',d),updateStatus:(id:string,status:string)=>patch(`/reviews/${id}`,{status})},
 banners:{...crud('/banners'),getAllAdmin:()=>get('/admin/banners')},
 users:{...crud('/users'),lock:(id:string,reason?:string)=>patch(`/users/${id}/lock`,{reason}),unlock:(id:string)=>patch(`/users/${id}/unlock`)},
 admin:{getUsers:()=>get('/users'),getDashboardStats:()=>get('/admin/stats'),updateUserRole:(id:string,role:string)=>put(`/users/${id}`,{role})}
};
