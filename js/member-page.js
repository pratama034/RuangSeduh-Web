/**
 * js/member-page.js
 * Entry point halaman Membership & Riwayat Pesanan (member.html) — Kala Seduh.
 * Menggunakan shared modules (js/member.js, js/cart.js, js/shared-ui.js) agar
 * seluruh state localStorage selalu sinkron dengan index.html tanpa error DOM null.
 */

import {
  TIERS,
  formatRupiah,
  getMemberProgress,
  loadMemberState,
  resetMemberState,
} from './member.js';
import { loadCart, clearCart } from './cart.js';
import {
  escapeHtml,
  formatDateTime,
  showToast,
  renderNavbarTier,
  initSharedCartAndModals,
} from './shared-ui.js';

/* ================= STATE HALAMAN MEMBER ================= */
const state = {
  member: loadMemberState(),
  cart: loadCart(),
};

/* ================= REFERENSI DOM KHUSUS MEMBER.HTML ================= */
const dom = {
  // Section 1: Kartu Member Virtual
  memberCard: document.getElementById('memberCard'),
  memberTierBadge: document.getElementById('memberTierBadge'),
  memberDiscountBadge: document.getElementById('memberDiscountBadge'),
  memberTotalSpent: document.getElementById('memberTotalSpent'),
  memberProgressText: document.getElementById('memberProgressText'),
  memberProgressPercent: document.getElementById('memberProgressPercent'),
  memberProgressTrack: document.getElementById('memberProgressTrack'),
  memberProgressFill: document.getElementById('memberProgressFill'),
  tierSteps: document.getElementById('tierSteps'),
  memberOrdersMeta: document.getElementById('memberOrdersMeta'),
  resetProgressBtn: document.getElementById('resetProgressBtn'),

  // Section 2: Daftar Tier & Benefit
  tierBenefitsGrid: document.getElementById('tierBenefitsGrid'),

  // Section 3: Riwayat Pesanan Langsung di Halaman
  historySectionMeta: document.getElementById('historySectionMeta'),
  orderHistoryContainer: document.getElementById('orderHistoryContainer'),

  // Modal Reset Demo
  resetModal: document.getElementById('resetModal'),
  confirmResetBtn: document.getElementById('confirmResetBtn'),
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
  onCheckoutDone: (result) => {
    renderAllMemberSections({ animateLevelUp: result.leveledUp });
  },
});

/* ================= SECTION 1: KARTU MEMBER VIRTUAL ================= */
function renderMemberCard({ animateLevelUp = false } = {}) {
  const progress = getMemberProgress(state.member.totalSpent);
  const { currentTier, currentIndex, percentage, message } = progress;

  renderNavbarTier(state.member.totalSpent);

  if (dom.memberCard) dom.memberCard.dataset.tier = currentTier.name;
  if (dom.memberTierBadge) dom.memberTierBadge.textContent = currentTier.name;
  if (dom.memberDiscountBadge) {
    dom.memberDiscountBadge.textContent = `Diskon ${currentTier.discountPercent}%`;
  }
  if (dom.memberTotalSpent) {
    dom.memberTotalSpent.textContent = formatRupiah(state.member.totalSpent);
  }

  if (dom.memberProgressText) dom.memberProgressText.textContent = message;
  if (dom.memberProgressPercent) dom.memberProgressPercent.textContent = `${percentage}%`;
  if (dom.memberProgressTrack) {
    dom.memberProgressTrack.setAttribute('aria-valuenow', String(percentage));
  }
  if (dom.memberProgressFill) {
    dom.memberProgressFill.style.width = `${percentage}%`;
  }

  if (dom.tierSteps) {
    dom.tierSteps.querySelectorAll('.tier-step').forEach((stepEl, index) => {
      stepEl.classList.toggle('is-reached', index < currentIndex);
      stepEl.classList.toggle('is-current', index === currentIndex);
    });
  }

  if (dom.memberOrdersMeta) {
    const count = state.member.orderHistory.length;
    dom.memberOrdersMeta.textContent = `${count} transaksi tercatat`;
  }

  if (animateLevelUp && dom.memberCard) {
    dom.memberCard.classList.remove('is-leveling-up');
    void dom.memberCard.offsetWidth;
    dom.memberCard.classList.add('is-leveling-up');
  }
}

/* ================= SECTION 2: GRID 4 TIER & BENEFIT ================= */
function renderTierBenefits() {
  if (!dom.tierBenefitsGrid) return;

  const { currentTier, currentIndex } = getMemberProgress(state.member.totalSpent);

  dom.tierBenefitsGrid.innerHTML = TIERS.map((tier, index) => {
    const isActive = tier.name === currentTier.name;
    const isUnlocked = index < currentIndex;

    let statusBadgeHtml = '';
    if (isActive) {
      statusBadgeHtml = '<span class="tier-benefit-card__status tier-benefit-card__status--active">Tier Aktif</span>';
    } else if (isUnlocked) {
      statusBadgeHtml = '<span class="tier-benefit-card__status tier-benefit-card__status--unlocked">Tercapai</span>';
    }

    return `
      <article
        class="tier-benefit-card ${isActive ? 'is-active' : ''}"
        data-tier="${escapeHtml(tier.name)}"
        style="--card-tier-color: ${escapeHtml(tier.color)};"
      >
        <div class="tier-benefit-card__top">
          <div class="tier-benefit-card__name-wrap">
            <span class="tier-benefit-card__dot" aria-hidden="true"></span>
            <h3 class="tier-benefit-card__name">${escapeHtml(tier.name)}</h3>
          </div>
          ${statusBadgeHtml}
        </div>

        <div class="tier-benefit-card__discount">
          <span class="tier-benefit-card__percent">${tier.discountPercent}%</span>
          <span class="tier-benefit-card__discount-label">Diskon Member</span>
        </div>

        <p class="tier-benefit-card__range">${escapeHtml(tier.rangeLabel)}</p>
        <p class="tier-benefit-card__desc">${escapeHtml(tier.benefit)}</p>
      </article>
    `;
  }).join('');
}

/* ================= SECTION 3: RIWAYAT PESANAN LANGSUNG ================= */
function renderOrderHistory() {
  if (!dom.orderHistoryContainer) return;

  const history = state.member.orderHistory;

  if (dom.historySectionMeta) {
    dom.historySectionMeta.textContent =
      history.length === 0
        ? 'Belum ada transaksi tersimpan di perangkat ini.'
        : `Menampilkan ${history.length} riwayat pesanan terbaru di browser Anda.`;
  }

  if (history.length === 0) {
    dom.orderHistoryContainer.innerHTML = `
      <div class="history-empty-panel">
        <div class="history-empty-panel__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
            <line x1="6" y1="2" x2="6" y2="4" />
            <line x1="10" y1="2" x2="10" y2="4" />
            <line x1="14" y1="2" x2="14" y2="4" />
          </svg>
        </div>
        <h3 class="history-empty-panel__title">Belum Ada Riwayat Pesanan</h3>
        <p class="history-empty-panel__desc">
          Pesan seduhan kopi Nusantara pertama Anda untuk mulai mengumpulkan poin belanja dan membuka diskon tier Silver.
        </p>
        <a href="index.html" class="btn btn--primary btn--sm">Mulai Pesan Kopi</a>
      </div>
    `;
    return;
  }

  dom.orderHistoryContainer.innerHTML = history
    .map((order, index) => {
      const totalItems = order.items.reduce((sum, item) => sum + item.qty, 0);
      const itemsText = order.items.map((item) => `${item.qty}x ${item.name}`).join(', ');
      const discountLabel =
        order.discountAmount > 0
          ? `Diskon ${order.tierUsed} (${order.discountPercent}%)`
          : `Tier ${order.tierUsed} (0%)`;

      return `
        <article class="history-row-card">
          <div class="history-row-card__main">
            <div class="history-row-card__meta">
              <span class="history-row-card__id">${escapeHtml(order.id)}</span>
              <span class="history-row-card__sep">&bull;</span>
              <span class="history-row-card__date">${escapeHtml(formatDateTime(order.createdAt))}</span>
              <span class="history-row-card__badge">${totalItems} item</span>
            </div>
            <p class="history-row-card__items">${escapeHtml(itemsText)}</p>
            <span class="history-row-card__tier">${escapeHtml(discountLabel)}</span>
          </div>

          <div class="history-row-card__side">
            <div class="history-row-card__total-wrap">
              <span class="history-row-card__total-label">Total Bayar</span>
              <strong class="history-row-card__total">${formatRupiah(order.total)}</strong>
            </div>
            <button
              type="button"
              class="btn btn--ghost btn--xs"
              data-view-receipt="${index}"
            >
              Lihat Struk
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderAllMemberSections(options = {}) {
  renderMemberCard(options);
  renderTierBenefits();
  renderOrderHistory();
}

/* ================= EVENT LISTENERS KHUSUS MEMBER.HTML ================= */
function bindMemberEvents() {
  // Buka modal konfirmasi Reset Progress (Demo)
  dom.resetProgressBtn?.addEventListener('click', () => {
    sharedUI.openModal(dom.resetModal);
  });

  // Eksekusi Reset Progress
  dom.confirmResetBtn?.addEventListener('click', () => {
    state.member = resetMemberState();
    state.cart = clearCart();

    sharedUI.closeModal(dom.resetModal);
    sharedUI.renderCart();
    renderAllMemberSections();
    showToast('Progress membership & riwayat berhasil direset.');
  });

  // Lihat detail struk dari daftar riwayat langsung
  dom.orderHistoryContainer?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-view-receipt]');
    if (!btn) return;

    const index = Number(btn.dataset.viewReceipt);
    const order = state.member.orderHistory[index];
    if (!order) return;

    sharedUI.showReceiptModal(order, { leveledUp: false });
  });

  // Sinkronkan state bila ada perubahan localStorage dari tab lain
  window.addEventListener('storage', () => {
    state.member = loadMemberState();
    state.cart = loadCart();
    sharedUI.renderCart();
    renderAllMemberSections();
  });
}

/* ================= INISIALISASI HALAMAN MEMBER ================= */
function init() {
  sharedUI.renderCart();
  renderAllMemberSections();
  bindMemberEvents();
}

init();
