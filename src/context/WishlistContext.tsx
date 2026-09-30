import React,{createContext,useContext,useState,useEffect} from 'react';
import {Product} from '../types';
import {get,put} from '../services/api';
import {useToast} from './ToastContext';
import {useAuth} from './AuthContext';
interface ContextType{favorites:Product[];isFavorite:(id:string)=>boolean;toggleFavorite:(p:Product)=>void;removeFromFavorites:(id:string)=>void;clearWishlist:()=>void;}
const Context=createContext<ContextType|undefined>(undefined);
export const WishlistProvider=({children}:{children:React.ReactNode})=>{const {user}=useAuth(),{showToast}=useToast();const [favorites,setFavorites]=useState<Product[]>([]);useEffect(()=>{let live=true;if(user)get('/me/wishlist').then(r=>{if(live)setFavorites(r.data);}).catch(e=>showToast(e.message,'error'));else setFavorites([]);return()=>{live=false;};},[user?._id]);const save=async(next:Product[])=>{if(!user){showToast('Đăng nhập để lưu sản phẩm yêu thích','info');return;}try{await put('/me/wishlist',{ids:next.map(p=>p._id)});setFavorites(next);}catch(e:any){showToast(e.message,'error');}};return <Context.Provider value={{favorites,isFavorite:id=>favorites.some(p=>p._id===id),toggleFavorite:p=>save(favorites.some(i=>i._id===p._id)?favorites.filter(i=>i._id!==p._id):[...favorites,p]),removeFromFavorites:id=>save(favorites.filter(p=>p._id!==id)),clearWishlist:()=>save([])}}>{children}</Context.Provider>;};
export const useWishlist=()=>{const c=useContext(Context);if(!c)throw new Error('WishlistProvider required');return c;};
