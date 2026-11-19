/**
 * js/member.js
 * Logika sistem membership Kala Seduh:
 * - Penentuan tier berdasarkan akumulasi totalSpent
 * - Perhitungan diskon otomatis & progress bar menuju tier berikutnya
 * - Penyimpanan dan pemulihan state (totalSpent, tier, orderHistory) ke localStorage
 */

export const STORAGE_KEYS = {
  TOTAL_SPENT: 'kalaSeduh_totalSpent',
  TIER: 'kalaSeduh_tier',
  CART: 'kalaSeduh_cart',
  ORDER_HISTORY: 'kalaSeduh_orderHistory',
};

/**
 * Konfigurasi 4 tingkatan tier membership.
 * Rentang nominal:
 * - Bronze   : Rp 0       - Rp 100.000 (0%)
 * - Silver   : Rp 100.001 - Rp 300.000 (5%)
 * - Gold     : Rp 300.001 - Rp 600.000 (10%)
 * - Platinum : > Rp 600.000            (15%)
 */
export const TIERS = [
  {
    name: 'Bronze',
    min: 0,
    max: 100000,
    rangeLabel: 'Rp 0 – Rp 100.000',
    discountRate: 0,
    discountPercent: 0,
    color: '#CD7F32',
    benefit: 'Akses penuh katalog Nusantara & pencatatan poin belanja otomatis.',
  },
  {
    name: 'Silver',
    min: 100001,
    max: 300000,
    rangeLabel: 'Rp 100.001 – Rp 300.000',
    discountRate: 0.05,
    discountPercent: 5,
    color: '#94A3B8',
    benefit: 'Potongan langsung 5% untuk setiap pesanan kopi & non-coffee.',
  },
  {
    name: 'Gold',
    min: 300001,
    max: 600000,
    rangeLabel: 'Rp 300.001 – Rp 600.000',
    discountRate: 0.1,
    discountPercent: 10,
    color: '#EAB308',
    benefit: 'Diskon otomatis 10% di seluruh menu Signature & Single Origin.',
  },
  {
    name: 'Platinum',
    min: 600001,
    max: Infinity,
    rangeLabel: '> Rp 600.000',
    discountRate: 0.15,
    discountPercent: 15,
    color: '#1E293B',
    benefit: 'Keuntungan tertinggi dengan diskon permanen 15% setiap transaksi.',
  },
];

// Formatter mata uang Rupiah standar Indonesia (tanpa desimal)
const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/**
 * Memformat angka integer ke format Rupiah, mis. 28000 -> "Rp 28.000"
 * @param {number} amount
 * @returns {string}
 */
export function formatRupiah(amount) {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  // Ganti non-breaking space dari Intl agar konsisten dan rapi di semua browser
  return rupiahFormatter.format(safeAmount).replace(/\u00A0/g, ' ');
}

/**
 * Menentukan objek tier aktif berdasarkan total belanja (totalSpent).
 * @param {number} totalSpent
 * @returns {Object}
 */
export function getTierBySpent(totalSpent) {
  const spent = Math.max(0, Number(totalSpent) || 0);
  const found = TIERS.find((tier) => spent >= tier.min && spent <= tier.max);
  return found || TIERS[0];
}

/**
 * Menghitung persentase progress bar & sisa nominal untuk naik ke tier berikutnya.
 * @param {number} totalSpent
 */
export function getMemberProgress(totalSpent) {
  const spent = Math.max(0, Number(totalSpent) || 0);
  const currentTier = getTierBySpent(spent);
  const currentIndex = TIERS.findIndex((t) => t.name === currentTier.name);
  const nextTier = TIERS[currentIndex + 1] || null;

  // Jika sudah di tier Platinum (tertinggi)
  if (!nextTier) {
    return {
      currentTier,
      currentIndex,
      nextTier: null,
      percentage: 100,
      remainingToNext: 0,
      isMaxTier: true,
      message: 'Tier Tertinggi Tercapai',
    };
  }

  // Basis awal tier saat ini: 0 untuk Bronze, batas atas tier sebelumnya untuk Silver/Gold
  const tierFloor = currentIndex === 0 ? 0 : TIERS[currentIndex - 1].max;
  const targetSpent = nextTier.min;
  const span = targetSpent - tierFloor;
  const progressInTier = Math.max(0, spent - tierFloor);

  const percentage = Math.min(99, Math.max(0, Math.round((progressInTier / span) * 100)));
  const remainingToNext = Math.max(1, targetSpent - spent);

  return {
    currentTier,
    currentIndex,
    nextTier,
    percentage,
    remainingToNext,
    isMaxTier: false,
    message: `Belanja ${formatRupiah(remainingToNext)} lagi untuk naik ke ${nextTier.name}`,
  };
}

/**
 * Memuat state membership dari localStorage secara aman.
 * @returns {{ totalSpent: number, tier: string, orderHistory: Array<Object> }}
 */
export function loadMemberState() {
  try {
    const rawSpent = localStorage.getItem(STORAGE_KEYS.TOTAL_SPENT);
    const totalSpent = Math.max(0, Number(rawSpent) || 0);

    const rawHistory = localStorage.getItem(STORAGE_KEYS.ORDER_HISTORY);
    const parsedHistory = rawHistory ? JSON.parse(rawHistory) : [];
    const orderHistory = Array.isArray(parsedHistory) ? parsedHistory : [];

    // Hitung ulang tier dari totalSpent agar selalu sinkron & konsisten
    const tierObj = getTierBySpent(totalSpent);
    localStorage.setItem(STORAGE_KEYS.TIER, tierObj.name);

    return {
      totalSpent,
      tier: tierObj.name,
      orderHistory,
    };
  } catch {
    return {
      totalSpent: 0,
      tier: TIERS[0].name,
      orderHistory: [],
    };
  }
}

/**
 * Menyimpan totalSpent, tier, dan orderHistory ke localStorage.
 * @param {{ totalSpent: number, tier: string, orderHistory: Array<Object> }} state
 */
export function saveMemberState(state) {
  try {
    localStorage.setItem(STORAGE_KEYS.TOTAL_SPENT, String(Math.round(state.totalSpent)));
    localStorage.setItem(STORAGE_KEYS.TIER, state.tier);
    localStorage.setItem(STORAGE_KEYS.ORDER_HISTORY, JSON.stringify(state.orderHistory));
  } catch {
    // Abaikan jika storage penuh / mode private membatasi penulisan
  }
}

/**
 * Memproses penambahan totalSpent & pencatatan riwayat saat checkout berhasil.
 * Mendeteksi secara otomatis jika transaksi memicu kenaikan tier (Level Up).
 * @param {{ totalSpent: number, tier: string, orderHistory: Array<Object> }} currentState
 * @param {Object} order Objek struk pesanan yang baru dibuat
 */
export function recordOrderToMember(currentState, order) {
  const previousTier = getTierBySpent(currentState.totalSpent);
  const newTotalSpent = currentState.totalSpent + order.total;
  const newTier = getTierBySpent(newTotalSpent);
  const leveledUp = newTier.name !== previousTier.name;

  const updatedHistory = [
    {
      ...order,
      leveledUp,
      newTierAfterOrder: newTier.name,
    },
    ...currentState.orderHistory,
  ];

  const nextState = {
    totalSpent: newTotalSpent,
    tier: newTier.name,
    orderHistory: updatedHistory,
  };

  saveMemberState(nextState);

  return {
    memberState: nextState,
    previousTier,
    newTier,
    leveledUp,
  };
}

/**
 * Mengecek pratinjau apakah transaksi saat ini akan menaikkan tier member.
 * @param {number} currentTotalSpent
 * @param {number} checkoutTotal
 */
export function previewTierAfterCheckout(currentTotalSpent, checkoutTotal) {
  if (checkoutTotal <= 0) return null;
  const currentTier = getTierBySpent(currentTotalSpent);
  const projectedTier = getTierBySpent(currentTotalSpent + checkoutTotal);
  if (projectedTier.name !== currentTier.name) {
    return projectedTier;
  }
  return null;
}

/**
 * Mereset seluruh progress membership & riwayat pesanan (khusus demo presentasi).
 */
export function resetMemberState() {
  const initialState = {
    totalSpent: 0,
    tier: TIERS[0].name,
    orderHistory: [],
  };
  saveMemberState(initialState);
  return initialState;
}
