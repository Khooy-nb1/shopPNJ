/**
 * Currency and date formatting helpers for Vietnamese Luxury E-commerce
 */

export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatShortDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

export const calculateDiscountPercentage = (price: number, salePrice?: number): number => {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
};

/**
 * Kiểm tra số điện thoại Việt Nam hợp lệ:
 * - 10 chữ số bắt đầu bằng 0 (đầu số 03, 05, 07, 08, 09) hoặc quốc tế +84/84
 * - Hoặc số cố định 11 chữ số bắt đầu bằng 02
 */
export const isValidPhone = (phone: string | undefined | null): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.trim().replace(/[\s.-]/g, '');
  return /^(?:\+84|84|0)[35789]\d{8}$/.test(cleaned) || /^(?:\+84|84|0)2\d{9}$/.test(cleaned);
};

export const normalizePhone = (phone: string | undefined | null): string => {
  if (!phone || typeof phone !== 'string') return '';
  const cleaned = phone.trim().replace(/[\s.-]/g, '');
  if (cleaned.startsWith('+84')) return '0' + cleaned.slice(3);
  if (cleaned.startsWith('84') && cleaned.length >= 11) return '0' + cleaned.slice(2);
  return cleaned;
};

export const formatPhone = (phone: string | undefined | null): string => {
  const norm = normalizePhone(phone);
  if (norm.length === 10) {
    return `${norm.slice(0, 4)} ${norm.slice(4, 7)} ${norm.slice(7)}`;
  }
  return norm;
};
