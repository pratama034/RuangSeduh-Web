/**
 * js/api.js
 * Bertanggung jawab mengambil data menu kopi melalui Fetch API (async/await).
 *
 * Ganti konstanta API_URL ke endpoint MockAPI atau GitHub Raw JSON jika ingin
 * mengambil data secara remote. Default diarahkan ke dataset lokal agar
 * langsung berjalan lancar melalui VS Code Live Server.
 */

export const API_URL = './data/menu.json';

/**
 * Gambar fallback berbasis SVG lokal (data URI) jika gambar eksternal gagal dimuat
 * atau saat koneksi internet sedang tidak tersedia.
 */
export const FALLBACK_IMAGE_URL =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#F3E9DD"/>
      <g fill="none" stroke="#8B5A2B" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.72">
        <path d="M510 250h26a58 58 0 0 1 0 116h-26"/>
        <path d="M270 250h240v132a72 72 0 0 1-72 72H342a72 72 0 0 1-72-72V250z"/>
        <path d="M335 165c0 24 18 24 18 48"/>
        <path d="M395 150c0 24 18 24 18 48"/>
        <path d="M455 165c0 24 18 24 18 48"/>
      </g>
      <text x="400" y="520" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="600" font-size="26" fill="#6B5B53">
        Kala Seduh
      </text>
    </svg>
  `);

/**
 * Helper jeda singkat agar transisi skeleton loading terasa natural
 * dan tidak berkedip terlalu cepat saat membaca file lokal.
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mengambil daftar menu kopi dari API_URL menggunakan async/await fetch().
 * @param {Object} options
 * @param {Function} [options.onLoadingChange] Callback perubahan status loading (true/false)
 * @param {number} [options.minDelayMs=350] Durasi minimal skeleton loading (ms)
 * @returns {Promise<Array<Object>>} Array data menu kopi
 */
export async function fetchMenu({ onLoadingChange, minDelayMs = 350 } = {}) {
  const startTime = Date.now();
  if (typeof onLoadingChange === 'function') {
    onLoadingChange(true);
  }

  try {
    const response = await fetch(API_URL, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Gagal memuat menu (HTTP ${response.status})`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Format data menu tidak valid (harus berupa array JSON).');
    }

    // Pastikan skeleton tampil sejenak agar transisi UI terasa halus
    const elapsed = Date.now() - startTime;
    if (elapsed < minDelayMs) {
      await delay(minDelayMs - elapsed);
    }

    return data;
  } catch (error) {
    // Teruskan error agar ditangani oleh error state di UI
    throw new Error(
      error?.message || 'Tidak dapat terhubung ke sumber data menu.'
    );
  } finally {
    if (typeof onLoadingChange === 'function') {
      onLoadingChange(false);
    }
  }
}
