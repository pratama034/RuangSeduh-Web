/**
 * js/cart.js
 * Logika keranjang belanja Kala Seduh:
 * - Penyimpanan state keranjang di localStorage
 * - Tambah, tambah/kurang jumlah, hapus item, dan kosongkan keranjang
 * - Perhitungan subtotal, diskon member berdasarkan tier aktif, total akhir, dan pembuatan struk checkout
 */

import { STORAGE_KEYS } from './member.js';

/**
 * Memuat daftar item keranjang dari localStorage.
 * @returns {Array<Object>}
 */
export function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CART);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Menyimpan array keranjang ke localStorage.
 * @param {Array<Object>} cart
 */
export function saveCart(cart) {
  try {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  } catch {
    // Abaikan jika penyimpanan tidak tersedia
  }
}

/**
 * Menambahkan menu ke keranjang (atau menambah qty jika item sudah ada).
 * @param {Array<Object>} cart
 * @param {Object} menuItem
 * @returns {Array<Object>}
 */
export function addToCart(cart, menuItem) {
  const existingIndex = cart.findIndex((item) => item.id === menuItem.id);
  let nextCart;

  if (existingIndex !== -1) {
    nextCart = cart.map((item, idx) =>
      idx === existingIndex ? { ...item, qty: item.qty + 1 } : item
    );
  } else {
    nextCart = [
      ...cart,
      {
        id: menuItem.id,
        name: menuItem.name,
        origin: menuItem.origin,
        type: menuItem.type,
        price: menuItem.price,
        image: menuItem.image,
        qty: 1,
      },
    ];
  }

  saveCart(nextCart);
  return nextCart;
}

/**
 * Mengubah kuantitas item (delta +1 atau -1). Jika qty <= 0, item dihapus.
 * @param {Array<Object>} cart
 * @param {string} itemId
 * @param {number} delta
 * @returns {Array<Object>}
 */
export function updateCartItemQty(cart, itemId, delta) {
  const nextCart = cart
    .map((item) =>
      item.id === itemId ? { ...item, qty: item.qty + delta } : item
    )
    .filter((item) => item.qty > 0);

  saveCart(nextCart);
  return nextCart;
}

/**
 * Menghapus item tertentu dari keranjang.
 * @param {Array<Object>} cart
 * @param {string} itemId
 * @returns {Array<Object>}
 */
export function removeFromCart(cart, itemId) {
  const nextCart = cart.filter((item) => item.id !== itemId);
  saveCart(nextCart);
  return nextCart;
}

/**
 * Mengosongkan keranjang belanja.
 * @returns {Array<Object>}
 */
export function clearCart() {
  saveCart([]);
  return [];
}

/**
 * Menghitung subtotal, potongan diskon member aktif, total bayar, dan jumlah total cup.
 * @param {Array<Object>} cart
 * @param {Object} tierObj Objek tier aktif dari js/member.js
 */
export function calculateCartSummary(cart, tierObj) {
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountRate = tierObj?.discountRate || 0;
  const discountPercent = tierObj?.discountPercent || 0;
  const discountAmount = Math.round(subtotal * discountRate);
  const total = Math.max(0, subtotal - discountAmount);

  return {
    itemCount,
    subtotal,
    discountPercent,
    discountAmount,
    total,
  };
}

/**
 * Membuat nomor pesanan unik sederhana untuk struk (mis. KS-241119-4821).
 * @returns {string}
 */
function generateOrderId() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `KS-${yy}${mm}${dd}-${rand}`;
}

/**
 * Membangun objek struk pesanan lengkap dari kondisi keranjang & tier aktif saat checkout.
 * @param {Array<Object>} cart
 * @param {Object} tierObj
 * @returns {Object}
 */
export function createOrderReceipt(cart, tierObj) {
  const summary = calculateCartSummary(cart, tierObj);

  return {
    id: generateOrderId(),
    createdAt: new Date().toISOString(),
    tierUsed: tierObj.name,
    items: cart.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      price: item.price,
      qty: item.qty,
      lineTotal: item.price * item.qty,
    })),
    subtotal: summary.subtotal,
    discountPercent: summary.discountPercent,
    discountAmount: summary.discountAmount,
    total: summary.total,
  };
}
