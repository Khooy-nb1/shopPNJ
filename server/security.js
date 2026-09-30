import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(scryptCallback);
export const digest=(v)=>createHash('sha256').update(v).digest('hex');
export async function hashPassword(password){ if(typeof password!=='string'||password.length<8||password.length>128) throw Object.assign(new Error('Mật khẩu cần từ 8 đến 128 ký tự'),{status:400}); const salt=randomBytes(16).toString('hex');return `scrypt:${salt}:${(await scrypt(password,salt,64)).toString('hex')}`; }
export async function checkPassword(password,hash){if(!hash?.startsWith('scrypt:')||typeof password!=='string'||password.length>128)return false;const [,salt,key]=hash.split(':');const actual=await scrypt(password,salt,64);const expected=Buffer.from(key,'hex');return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export const pick=(obj,keys)=>Object.fromEntries(keys.filter(k=>obj[k]!==undefined).map(k=>[k,obj[k]]));
export const slugify=(v)=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function isValidPhone(phone){if(!phone||typeof phone!=='string')return false;const c=phone.trim().replace(/[\s.-]/g,'');return /^(?:\+84|84|0)[35789]\d{8}$/.test(c)||/^(?:\+84|84|0)2\d{9}$/.test(c);}
export function normalizePhone(phone){if(!phone||typeof phone!=='string')return phone;const c=phone.trim().replace(/[\s.-]/g,'');if(c.startsWith('+84'))return '0'+c.slice(3);if(c.startsWith('84')&&c.length>=11)return '0'+c.slice(2);return c;}
