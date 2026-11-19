/**
 * js/shared-ui.js
 * Utilitas DOM bersama & kontroler Cart Drawer + Modal Struk
 * yang digunakan bersama oleh index.html (js/app.js) dan member.html (js/member-page.js).
 */

import { FALLBACK_IMAGE_URL } from './api.js';
import {
  formatRupiah,
  getTierBySpent,
  recordOrderToMember,
  previewTierAfterCheckout,
} from './member.js';
import {
  updateCartItemQty,
  removeFromCart,
  clearCart,
  calculateCartSummary,
  createOrderReceipt,
} from './cart.js';

/**
 * Mencegah XSS dengan meng-escape karakter HTML pada teks dinamis.
 */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Memformat tanggal ISO menjadi format lokal Indonesia yang ringkas.
 */
export function formatDateTime(isoString) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return String(isoString || '');
  }
}

/**
 * Memasang fallback image handler agar gambar yang gagal dimuat otomatis
 * diganti ke ilustrasi SVG lokal tanpa broken image.
 */
export function attachImageFallbacks(container) {
  if (!container) return;
  const images = container.querySelectorAll('img[data-fallback]');
  images.forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        if (img.src !== FALLBACK_IMAGE_URL) {
          img.src = FALLBACK_IMAGE_URL;
        }
      },
      { once: true }
    );
  });
}

/**
 * Menampilkan notifikasi toast ringan di pojok layar.
 * @param {string} message
 * @param {'default' | 'success' | 'levelup'} [variant='default']
 */
export function showToast(message, variant = 'default') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${variant !== 'default' ? `toast--${variant}` : ''}`;
  toast.textContent = message;
  container.appendChild(toast);

  const duration = variant === 'levelup' ? 4200 : 2500;
  setTimeout(() => {
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/**
 * Memperbarui Pill Badge Tier Member di Navbar secara konsisten di kedua halaman.
 */
export function renderNavbarTier(totalSpent) {
  const navTierDot = document.getElementById('navTierDot');
  const navTierName = document.getElementById('navTierName');
  const currentTier = getTierBySpent(totalSpent);

  if (navTierDot) navTierDot.style.backgroundColor = currentTier.color;
  if (navTierName) navTierName.textContent = currentTier.name;
}

/**
 * Menginisialisasi Slide-Over Cart Drawer & Modal Struk Pesanan
 * agar bisa dipakai ulang di index.html maupun member.html tanpa duplikasi.
 */
export function initSharedCartAndModals({
  getMember,
  setMember,
  getCart,
  setCart,
  onCartChanged,
  onCheckoutDone,
}) {
  const dom = {
    openCartBtn: document.getElementById('openCartBtn'),
    cartCount: document.getElementById('cartCount'),
    cartBackdrop: document.getElementById('cartBackdrop'),
    cartDrawer: document.getElementById('cartDrawer'),
    closeCartBtn: document.getElementById('closeCartBtn'),
    cartItemSummary: document.getElementById('cartItemSummary'),
    cartItemsContainer: document.getElementById('cartItemsContainer'),
    cartLevelUpHint: document.getElementById('cartLevelUpHint'),
    cartSubtotal: document.getElementById('cartSubtotal'),
    cartDiscountLabel: document.getElementById('cartDiscountLabel'),
    cartDiscountAmount: document.getElementById('cartDiscountAmount'),
    cartTotal: document.getElementById('cartTotal'),
    checkoutBtn: document.getElementById('checkoutBtn'),

    receiptModal: document.getElementById('receiptModal'),
    levelUpBanner: document.getElementById('levelUpBanner'),
    levelUpTitle: document.getElementById('levelUpTitle'),
    levelUpDesc: document.getElementById('levelUpDesc'),
    receiptMeta: document.getElementById('receiptMeta'),
    receiptItemsList: document.getElementById('receiptItemsList'),
    receiptSubtotal: document.getElementById('receiptSubtotal'),
    receiptDiscountLabel: document.getElementById('receiptDiscountLabel'),
    receiptDiscountAmount: document.getElementById('receiptDiscountAmount'),
    receiptTotal: document.getElementById('receiptTotal'),
  };

  function syncBodyScroll() {
    const anyModalOpen = Array.from(document.querySelectorAll('.modal-overlay')).some(
      (el) => !el.classList.contains('hidden')
    );
    const drawerOpen = Boolean(dom.cartDrawer?.classList.contains('is-open'));
    document.body.classList.toggle('no-scroll', anyModalOpen || drawerOpen);
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('hidden');
    syncBodyScroll();
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    syncBodyScroll();
  }

  function openCartDrawer() {
    if (!dom.cartBackdrop || !dom.cartDrawer) return;
    dom.cartBackdrop.classList.remove('hidden');
    dom.cartDrawer.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      dom.cartBackdrop.classList.add('is-open');
      dom.cartDrawer.classList.add('is-open');
      syncBodyScroll();
    });
  }

  function closeCartDrawer() {
    if (!dom.cartBackdrop || !dom.cartDrawer) return;
    dom.cartBackdrop.classList.remove('is-open');
    dom.cartDrawer.classList.remove('is-open');
    dom.cartDrawer.setAttribute('aria-hidden', 'true');
    syncBodyScroll();

    setTimeout(() => {
      if (!dom.cartDrawer.classList.contains('is-open')) {
        dom.cartBackdrop.classList.add('hidden');
      }
    }, 300);
  }

  function renderCart({ bumpBadge = false } = {}) {
    const cart = getCart();
    const member = getMember();
    const currentTier = getTierBySpent(member.totalSpent);
    const summary = calculateCartSummary(cart, currentTier);

    if (dom.cartCount) {
      dom.cartCount.textContent = String(summary.itemCount);
      if (bumpBadge) {
        dom.cartCount.classList.remove('is-bump');
        void dom.cartCount.offsetWidth;
        dom.cartCount.classList.add('is-bump');
        setTimeout(() => dom.cartCount.classList.remove('is-bump'), 250);
      }
    }

    if (dom.cartItemSummary) {
      dom.cartItemSummary.textContent =
        summary.itemCount === 0
          ? 'Belum ada kopi dipilih'
          : `${summary.itemCount} item dipilih`;
    }

    if (dom.cartItemsContainer) {
      if (cart.length === 0) {
        dom.cartItemsContainer.innerHTML = `
          <div class="cart-empty">
            <div class="cart-empty__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <h3 class="cart-empty__title">Keranjang Masih Kosong</h3>
            <p class="cart-empty__desc">Pilih kopi favorit Anda dari daftar menu untuk mulai memesan.</p>
          </div>
        `;
      } else {
        dom.cartItemsContainer.innerHTML = cart
          .map(
            (item) => `
            <div class="cart-item">
              <img
                class="cart-item__img"
                src="${escapeHtml(item.image)}"
                alt="${escapeHtml(item.name)}"
                data-fallback="true"
              />
              <div class="cart-item__content">
                <div class="cart-item__top">
                  <div>
                    <h4 class="cart-item__name">${escapeHtml(item.name)}</h4>
                    <p class="cart-item__meta">${escapeHtml(item.type)} &bull; ${formatRupiah(item.price)}</p>
                  </div>
                  <button
                    type="button"
                    class="cart-item__remove"
                    data-cart-action="remove"
                    data-id="${escapeHtml(item.id)}"
                    aria-label="Hapus ${escapeHtml(item.name)}"
                  >
                    Hapus
                  </button>
                </div>

                <div class="cart-item__bottom">
                  <div class="qty-control">
                    <button
                      type="button"
                      class="qty-control__btn"
                      data-cart-action="dec"
                      data-id="${escapeHtml(item.id)}"
                      aria-label="Kurangi jumlah"
                    >&minus;</button>
                    <span class="qty-control__value">${item.qty}</span>
                    <button
                      type="button"
                      class="qty-control__btn"
                      data-cart-action="inc"
                      data-id="${escapeHtml(item.id)}"
                      aria-label="Tambah jumlah"
                    >+</button>
                  </div>

                  <span class="cart-item__subtotal">${formatRupiah(item.price * item.qty)}</span>
                </div>
              </div>
            </div>
          `
          )
          .join('');

        attachImageFallbacks(dom.cartItemsContainer);
      }
    }

    if (dom.cartSubtotal) dom.cartSubtotal.textContent = formatRupiah(summary.subtotal);
    if (dom.cartDiscountLabel) {
      dom.cartDiscountLabel.textContent = `Diskon ${currentTier.name} (${summary.discountPercent}%)`;
    }
    if (dom.cartDiscountAmount) {
      dom.cartDiscountAmount.textContent =
        summary.discountAmount > 0 ? `- ${formatRupiah(summary.discountAmount)}` : 'Rp 0';
    }
    if (dom.cartTotal) dom.cartTotal.textContent = formatRupiah(summary.total);
    if (dom.checkoutBtn) dom.checkoutBtn.disabled = cart.length === 0;

    if (dom.cartLevelUpHint) {
      const nextTierAfterOrder = previewTierAfterCheckout(member.totalSpent, summary.total);
      if (nextTierAfterOrder) {
        dom.cartLevelUpHint.textContent = `Pesanan ini akan menaikkan tier Anda ke ${nextTierAfterOrder.name} (Diskon ${nextTierAfterOrder.discountPercent}% pada pesanan berikutnya)!`;
        dom.cartLevelUpHint.classList.remove('hidden');
      } else {
        dom.cartLevelUpHint.classList.add('hidden');
      }
    }
  }

  function showReceiptModal(order, { leveledUp = false, newTier = null } = {}) {
    if (!dom.receiptModal) return;

    if (dom.levelUpBanner) {
      if (leveledUp && newTier) {
        if (dom.levelUpTitle) {
          dom.levelUpTitle.textContent = `Selamat! Anda Naik ke Tier ${newTier.name}`;
        }
        if (dom.levelUpDesc) {
          dom.levelUpDesc.textContent = `Mulai transaksi berikutnya, nikmati diskon otomatis ${newTier.discountPercent}% di setiap pesanan.`;
        }
        dom.levelUpBanner.classList.remove('hidden');
      } else {
        dom.levelUpBanner.classList.add('hidden');
      }
    }

    if (dom.receiptMeta) {
      dom.receiptMeta.textContent = `${order.id} • ${formatDateTime(order.createdAt)}`;
    }

    if (dom.receiptItemsList) {
      dom.receiptItemsList.innerHTML = order.items
        .map(
          (item) => `
          <li class="receipt-item">
            <div>
              <span class="receipt-item__name">${escapeHtml(item.name)}</span>
              <span class="receipt-item__qty">${item.qty}x ${formatRupiah(item.price)} (${escapeHtml(item.type)})</span>
            </div>
            <span class="receipt-item__price">${formatRupiah(item.lineTotal)}</span>
          </li>
        `
        )
        .join('');
    }

    if (dom.receiptSubtotal) dom.receiptSubtotal.textContent = formatRupiah(order.subtotal);
    if (dom.receiptDiscountLabel) {
      dom.receiptDiscountLabel.textContent = `Diskon ${order.tierUsed} (${order.discountPercent}%)`;
    }
    if (dom.receiptDiscountAmount) {
      dom.receiptDiscountAmount.textContent =
        order.discountAmount > 0 ? `- ${formatRupiah(order.discountAmount)}` : 'Rp 0';
    }
    if (dom.receiptTotal) dom.receiptTotal.textContent = formatRupiah(order.total);

    openModal(dom.receiptModal);
  }

  function handleCheckout() {
    const cart = getCart();
    if (cart.length === 0) return;

    const member = getMember();
    const currentTier = getTierBySpent(member.totalSpent);
    const order = createOrderReceipt(cart, currentTier);

    const result = recordOrderToMember(member, order);
    setMember(result.memberState);
    setCart(clearCart());

    closeCartDrawer();
    renderNavbarTier(result.memberState.totalSpent);
    renderCart();

    if (typeof onCheckoutDone === 'function') {
      onCheckoutDone(result, order);
    }

    showReceiptModal(order, {
      leveledUp: result.leveledUp,
      newTier: result.newTier,
    });

    if (result.leveledUp) {
      showToast(
        `Level Up! Selamat bergabung di tier ${result.newTier.name} (Diskon ${result.newTier.discountPercent}%)`,
        'levelup'
      );
    } else {
      showToast(`Pesanan ${order.id} berhasil diproses.`, 'success');
    }
  }

  // Event Listeners Drawer & Modal Bersama
  dom.openCartBtn?.addEventListener('click', openCartDrawer);
  dom.closeCartBtn?.addEventListener('click', closeCartDrawer);
  dom.cartBackdrop?.addEventListener('click', closeCartDrawer);
  dom.checkoutBtn?.addEventListener('click', handleCheckout);

  dom.cartItemsContainer?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-cart-action]');
    if (!btn) return;

    const { cartAction, id } = btn.dataset;
    const cart = getCart();
    const existing = cart.find((item) => item.id === id);

    let nextCart = cart;
    if (cartAction === 'inc') {
      nextCart = updateCartItemQty(cart, id, 1);
    } else if (cartAction === 'dec') {
      nextCart = updateCartItemQty(cart, id, -1);
    } else if (cartAction === 'remove') {
      nextCart = removeFromCart(cart, id);
      if (existing) showToast(`${existing.name} dihapus dari keranjang.`);
    }

    setCart(nextCart);
    renderCart();
    if (typeof onCartChanged === 'function') {
      onCartChanged(nextCart);
    }
  });

  // Tutup modal via tombol [data-close-modal] atau klik overlay
  document.addEventListener('click', (event) => {
    const closeBtn = event.target.closest('[data-close-modal]');
    if (closeBtn) {
      const targetModal = document.getElementById(closeBtn.dataset.closeModal);
      if (targetModal) closeModal(targetModal);
      return;
    }

    if (event.target.classList.contains('modal-overlay')) {
      closeModal(event.target);
    }
  });

  // Tutup modal aktif atau cart drawer dengan tombol Escape
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    const openModals = Array.from(document.querySelectorAll('.modal-overlay')).filter(
      (el) => !el.classList.contains('hidden')
    );
    if (openModals.length > 0) {
      closeModal(openModals[openModals.length - 1]);
    } else if (dom.cartDrawer?.classList.contains('is-open')) {
      closeCartDrawer();
    }
  });

  return {
    renderCart,
    openCartDrawer,
    closeCartDrawer,
    openModal,
    closeModal,
    showReceiptModal,
  };
}
