import React,{useEffect,useState} from 'react';
import {useSearchParams,Link} from 'react-router-dom';
import {BookOpen,ArrowRight,Calendar} from 'lucide-react';
import {get} from '../services/api';
export const NewsPage=()=>{
 const [rows,setRows]=useState<any[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [params,setParams]=useSearchParams();
 useEffect(()=>{let active=true;get('/content').then(r=>{if(active)setRows(r.data.filter((x:any)=>x.kind==='news'));}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 const selected=rows.find(row=>row.slug===params.get('article'));
 return <main className="bg-[#FAF8F5] min-h-screen py-12"><div className="shop-wrap">
  <header className="text-center max-w-2xl mx-auto mb-10"><BookOpen className="mx-auto mb-3 text-[#997A15]"/><p className="text-xs tracking-widest uppercase text-[#997A15] mb-3">Tạp chí kim hoàn</p><h1 className="shop-title">Tin Tức & Cẩm Nang Trang Sức</h1><p>Kiến thức kim cương, cảm hứng mùa cưới và cách chăm sóc trang sức.</p></header>
  {loading&&<p role="status">Đang tải bài viết…</p>}{error&&<p role="alert" className="shop-panel text-red-700">{error} <button onClick={()=>window.location.reload()} className="underline">Thử lại</button></p>}
  {selected?<article className="shop-panel max-w-3xl mx-auto"><button className="text-[#997A15] mb-6" onClick={()=>setParams({})}>← Tất cả bài viết</button><img alt={selected.title} src={selected.image} className="w-full max-h-96 object-cover rounded-xl mb-6"/><p className="text-xs text-[#997A15] mb-3">{selected.category} · {selected.date}</p><h2 className="text-2xl font-serif font-bold mb-4">{selected.title}</h2><p className="text-sm text-gray-500 mb-6">{selected.author}</p><p className="whitespace-pre-line leading-8">{selected.body}</p></article>:<div className="grid md:grid-cols-2 gap-8">{rows.map(r=><article key={r._id} className="bg-white border border-[#E8E2D5] rounded-3xl overflow-hidden hover:shadow-lg transition-shadow"><Link to={'/news?article='+encodeURIComponent(r.slug)}><img alt={r.title} src={r.image||'/images/prod_diamond_round.jpg'} className="w-full h-64 object-cover"/><div className="p-6"><p className="text-xs text-[#997A15] mb-3">{r.category||'Kiến thức kim cương'}</p>{r.date&&<p className="text-xs text-gray-500 flex items-center gap-2 mb-3"><Calendar size={14}/>{r.date}</p>}<h2 className="font-serif text-xl font-bold mb-3">{r.title}</h2><p className="text-sm text-gray-600 line-clamp-3 leading-6">{r.excerpt||r.body}</p><span className="text-[#997A15] flex items-center gap-2 mt-6 text-sm font-semibold">Đọc tiếp cẩm nang <ArrowRight size={16}/></span></div></Link></article>)}</div>}
  {!loading&&!rows.length&&!error&&<p>Cửa hàng chưa có bài viết.</p>}
 </div></main>;
};
