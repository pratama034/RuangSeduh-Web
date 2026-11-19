/**
 * js/app.js
 * Entry point halaman Katalog Menu (index.html) — Kala Seduh.
 * Menangani fetch menu API, skeleton/error state, live search, filter pill,
 * strip info member ringkas, serta integrasi Cart Drawer bersama.
 */

import { fetchMenu } from './api.js';
import { formatRupiah, getTierBySpent, loadMemberState } from './member.js';
import { loadCart, addToCart, updateCartItemQty } from './cart.js';
import {
  escapeHtml,
  attachImageFallbacks,
  showToast,
  renderNavbarTier,
  initSharedCartAndModals,
} from './shared-ui.js';

/* ================= STATE HALAMAN MENU ================= */
const state = {
  menu: [],
  activeFilter: 'Semua',
  searchQuery: '',
  isLoading: true,
  errorMessage: null,
  member: loadMemberState(),
  cart: loadCart(),
};

/* ================= REFERENSI DOM KHUSUS INDEX.HTML ================= */
const dom = {
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),

  // Strip Member Ringkas di atas katalog
  memberStrip: document.getElementById('memberStrip'),
  stripTierDot: document.getElementById('stripTierDot'),
  stripTierName: document.getElementById('stripTierName'),
  stripDiscountText: document.getElementById('stripDiscountText'),

  // Filter & Grid Menu
  filterBar: document.getElementById('filterBar'),
  menuResultMeta: document.getElementById('menuResultMeta'),
  menuGrid: document.getElementById('menuGrid'),
};

/* ================= SHARED CART DRAWER & MODAL STRUK ================= */
const sharedUI = initSharedCartAndModals({
  getMember: () => state.member,
  setMember: (nextMember) => {
    state.member = nextMember;
  },
  getCart: () => state.cart,
  setCart: (nextCart) => {
    state.cart = nextCart;
  },
  onCartChanged: () => {
    renderMenuGrid();
  },
  onCheckoutDone: () => {
    renderMemberStrip();
    renderMenuGrid();
  },
});

/* ================= RENDER STRIP INFO MEMBER RINGKAS ================= */
function renderMemberStrip() {
  const currentTier = getTierBySpent(state.member.totalSpent);

  renderNavbarTier(state.member.totalSpent);

  if (dom.memberStrip) dom.memberStrip.dataset.tier = currentTier.name;
  if (dom.stripTierDot) dom.stripTierDot.style.backgroundColor = currentTier.color;
  if (dom.stripTierName) dom.stripTierName.textContent = currentTier.name;
  if (dom.stripDiscountText) {
    dom.stripDiscountText.textContent = `Diskon otomatis ${currentTier.discountPercent}%`;
  }
}

/* ================= FILTER & RENDER MENU GRID ================= */
function getFilteredMenu() {
  const query = state.searchQuery.trim().toLowerCase();

  return state.menu.filter((item) => {
    const matchesFilter =
      state.activeFilter === 'Semua' ||
      item.category === state.activeFilter ||
      item.type === state.activeFilter;

    if (!matchesFilter) return false;
    if (!query) return true;

    const haystack = `${item.name} ${item.origin} ${item.category} ${item.type}`.toLowerCase();
    return haystack.includes(query);
  });
}

function renderSkeletonGrid(count = 8) {
  if (dom.menuResultMeta) {
    dom.menuResultMeta.textContent = 'Menyiapkan racikan kopi terbaik untuk Anda...';
  }
  if (!dom.menuGrid) return;

  dom.menuGrid.innerHTML = Array.from(
    { length: count },
    () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-card__media"></div>
      <div class="skeleton-card__body">
        <div class="skeleton skeleton-line skeleton-line--short"></div>
        <div class="skeleton skeleton-line skeleton-line--title"></div>
        <div class="skeleton skeleton-line skeleton-line--full"></div>
        <div class="skeleton skeleton-line skeleton-line--price"></div>
      </div>
    </div>
  `
  ).join('');
}

function renderErrorState(message) {
  if (dom.menuResultMeta) dom.menuResultMeta.textContent = 'Gagal memuat daftar menu';
  if (!dom.menuGrid) return;

  dom.menuGrid.innerHTML = `
    <div class="state-panel">
      <div class="state-panel__icon state-panel__icon--error" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 class="state-panel__title">Menu Tidak Dapat Dimuat</h3>
      <p class="state-panel__desc">${escapeHtml(message)}</p>
      <button type="button" class="btn btn--primary btn--sm" id="retryFetchBtn">Coba Lagi</button>
    </div>
  `;

  document.getElementById('retryFetchBtn')?.addEventListener('click', loadMenuData);
}

function syncFilterPills() {
  if (!dom.filterBar) return;
  dom.filterBar.querySelectorAll('.filter-pill').forEach((pill) => {
    const isActive = pill.dataset.filter === state.activeFilter;
    pill.classList.toggle('is-active', isActive);
    pill.setAttribute('aria-selected', String(isActive));
  });
}

function renderMenuGrid() {
  if (state.isLoading) {
    renderSkeletonGrid();
    return;
  }

  if (state.errorMessage) {
    renderErrorState(state.errorMessage);
    return;
  }

  if (!dom.menuGrid) return;

  const filtered = getFilteredMenu();
  const totalMenu = state.menu.length;

  if (dom.menuResultMeta) {
    if (state.searchQuery.trim()) {
      dom.menuResultMeta.textContent = `Menampilkan ${filtered.length} hasil untuk "${state.searchQuery.trim()}"`;
    } else if (state.activeFilter !== 'Semua') {
      dom.menuResultMeta.textContent = `Menampilkan ${filtered.length} menu kategori ${state.activeFilter}`;
    } else {
      dom.menuResultMeta.textContent = `Menampilkan ${totalMenu} racikan kopi & minuman Nusantara`;
    }
  }

  if (filtered.length === 0) {
    dom.menuGrid.innerHTML = `
      <div class="state-panel">
        <div class="state-panel__icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <h3 class="state-panel__title">Menu Tidak Ditemukan</h3>
        <p class="state-panel__desc">
          Tidak ada seduhan yang cocok dengan filter atau kata kunci saat ini. Coba kata kunci lain seperti "Gayo", "Aren", atau "Bali".
        </p>
        <button type="button" class="btn btn--ghost btn--sm" id="resetFilterBtn">Tampilkan Semua Menu</button>
      </div>
    `;

    document.getElementById('resetFilterBtn')?.addEventListener('click', () => {
      state.activeFilter = 'Semua';
      state.searchQuery = '';
      if (dom.searchInput) dom.searchInput.value = '';
      dom.clearSearchBtn?.classList.add('hidden');
      syncFilterPills();
      renderMenuGrid();
    });
    return;
  }

  const cartQtyMap = new Map(state.cart.map((item) => [item.id, item.qty]));

  dom.menuGrid.innerHTML = filtered
    .map((item) => {
      const qtyInCart = cartQtyMap.get(item.id) || 0;
      const typeClass = item.type === 'Hot' ? 'chip--hot' : 'chip--iced';

      const actionHtml =
        qtyInCart > 0
          ? `
            <div class="card-stepper" aria-label="Atur jumlah ${escapeHtml(item.name)}">
              <button type="button" class="card-stepper__btn" data-action="dec" data-id="${escapeHtml(item.id)}" aria-label="Kurangi">&minus;</button>
              <span class="card-stepper__qty">${qtyInCart}</span>
              <button type="button" class="card-stepper__btn" data-action="inc" data-id="${escapeHtml(item.id)}" aria-label="Tambah">+</button>
            </div>
          `
          : `
            <button type="button" class="add-btn" data-action="add" data-id="${escapeHtml(item.id)}">
              + Tambah
            </button>
          `;

      return `
        <article class="menu-card">
          <div class="menu-card__media">
            <img
              class="menu-card__img"
              src="${escapeHtml(item.image)}"
              alt="${escapeHtml(item.name)}"
              loading="lazy"
              data-fallback="true"
            />
            <div class="menu-card__badges">
              <span class="chip chip--category">${escapeHtml(item.category)}</span>
              <span class="chip ${typeClass}">${escapeHtml(item.type)}</span>
            </div>
          </div>

          <div class="menu-card__body">
            <span class="menu-card__origin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              ${escapeHtml(item.origin)}
            </span>

            <h2 class="menu-card__title">${escapeHtml(item.name)}</h2>
            <p class="menu-card__desc">${escapeHtml(item.description)}</p>

            <div class="menu-card__footer">
              <span class="menu-card__price">${formatRupiah(item.price)}</span>
              ${actionHtml}
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  attachImageFallbacks(dom.menuGrid);
}

/* ================= FETCH DATA MENU ================= */
async function loadMenuData() {
  state.errorMessage = null;

  try {
    const items = await fetchMenu({
      onLoadingChange: (loading) => {
        state.isLoading = loading;
        if (loading) renderSkeletonGrid();
      },
      minDelayMs: 320,
    });

    state.menu = items;
    state.isLoading = false;
    renderMenuGrid();
  } catch (error) {
    state.isLoading = false;
    state.errorMessage = error.message;
    renderMenuGrid();
  }
}

/* ================= EVENT LISTENERS KHUSUS MENU ================= */
function bindCatalogEvents() {
  dom.searchInput?.addEventListener('input', (event) => {
    state.searchQuery = event.target.value;
    dom.clearSearchBtn?.classList.toggle('hidden', state.searchQuery.length === 0);
    renderMenuGrid();
  });

  dom.clearSearchBtn?.addEventListener('click', () => {
    state.searchQuery = '';
    if (dom.searchInput) {
      dom.searchInput.value = '';
      dom.searchInput.focus();
    }
    dom.clearSearchBtn.classList.add('hidden');
    renderMenuGrid();
  });

  dom.filterBar?.addEventListener('click', (event) => {
    const pill = event.target.closest('.filter-pill');
    if (!pill) return;

    state.activeFilter = pill.dataset.filter;
    syncFilterPills();
    renderMenuGrid();
  });

  dom.menuGrid?.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;

    const { action, id } = actionBtn.dataset;
    const menuItem = state.menu.find((item) => item.id === id);
    if (!menuItem) return;

    if (action === 'add') {
      state.cart = addToCart(state.cart, menuItem);
      showToast(`${menuItem.name} ditambahkan ke keranjang.`);
    } else if (action === 'inc') {
      state.cart = updateCartItemQty(state.cart, id, 1);
    } else if (action === 'dec') {
      state.cart = updateCartItemQty(state.cart, id, -1);
    }

    sharedUI.renderCart({ bumpBadge: action === 'add' || action === 'inc' });
    renderMenuGrid();
  });

  // Sinkronkan state bila ada perubahan localStorage dari tab lain
  window.addEventListener('storage', () => {
    state.member = loadMemberState();
    state.cart = loadCart();
    renderMemberStrip();
    sharedUI.renderCart();
    renderMenuGrid();
  });
}

/* ================= INISIALISASI HALAMAN MENU ================= */
function init() {
  renderMemberStrip();
  sharedUI.renderCart();
  bindCatalogEvents();
  loadMenuData();
}

init();
