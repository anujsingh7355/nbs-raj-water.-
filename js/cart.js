/**
 * =========================================================================
 * NBS RAJ WATER - SHOPPING CART SYSTEM
 * =========================================================================
 * Full shopping cart state management with localStorage persistence,
 * quantity modifiers, delivery fee calculation, and reactive UI sync.
 *
 * CRITICAL RULE: "Add to Cart" MUST NOT immediately open WhatsApp.
 * It strictly adds the item to the cart with toast notification!
 * =========================================================================
 */

const CART_STORAGE_KEY = "nbs_raj_cart_v1";

class ShoppingCart {
  constructor() {
    this.items = this.loadCart();
    this.listeners = [];
  }

  // Load items from localStorage
  loadCart() {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Error loading cart from localStorage:", e);
      return [];
    }
  }

  // Save items to localStorage
  saveCart() {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
      this.notifyListeners();
    } catch (e) {
      console.error("Error saving cart to localStorage:", e);
    }
  }

  // Register listener for reactive UI updates
  subscribe(callback) {
    if (typeof callback === "function") {
      this.listeners.push(callback);
    }
  }

  notifyListeners() {
    const summary = this.getSummary();
    this.listeners.forEach(cb => {
      try {
        cb(this.items, summary);
      } catch (err) {
        console.error("Cart listener error:", err);
      }
    });
  }

  // Add product to cart (or increment quantity)
  // CRITICAL: Does NOT trigger WhatsApp!
  addItem(productId, quantity = 1) {
    const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);
    const product = window.getProductById(productId);

    if (!product) {
      console.error(`Product not found: ${productId}`);
      return false;
    }

    const existingIndex = this.items.findIndex(item => item.id === productId);

    if (existingIndex > -1) {
      this.items[existingIndex].quantity += qtyToAdd;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        packSize: product.packSize,
        price: product.price,
        oldPrice: product.oldPrice,
        image: product.image,
        quantity: qtyToAdd
      });
    }

    this.saveCart();

    // Trigger visual toast
    if (window.showToast) {
      window.showToast(`Added ${qtyToAdd}x "${product.name}" to cart!`, "success");
    }

    return true;
  }

  // Increase quantity by 1
  increaseQty(productId) {
    const item = this.items.find(i => i.id === productId);
    if (item) {
      item.quantity += 1;
      this.saveCart();
    }
  }

  // Decrease quantity by 1 (removes if reaches 0)
  decreaseQty(productId) {
    const index = this.items.findIndex(i => i.id === productId);
    if (index > -1) {
      if (this.items[index].quantity > 1) {
        this.items[index].quantity -= 1;
      } else {
        this.items.splice(index, 1);
        if (window.showToast) {
          window.showToast("Item removed from cart", "info");
        }
      }
      this.saveCart();
    }
  }

  // Explicitly remove an item
  removeItem(productId) {
    const item = this.items.find(i => i.id === productId);
    this.items = this.items.filter(i => i.id !== productId);
    this.saveCart();
    if (window.showToast && item) {
      window.showToast(`Removed "${item.name}" from cart`, "info");
    }
  }

  // Clear entire cart
  clearCart() {
    this.items = [];
    this.saveCart();
    if (window.showToast) {
      window.showToast("Cart has been cleared", "info");
    }
  }

  // Total count of bottles / units
  getTotalItemCount() {
    return this.items.reduce((total, item) => total + item.quantity, 0);
  }

  // Number of unique items
  getDistinctCount() {
    return this.items.length;
  }

  // Financial calculations
  getSummary() {
    const subtotal = this.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const originalTotal = this.items.reduce((acc, item) => acc + ((item.oldPrice || item.price) * item.quantity), 0);
    const savings = Math.max(0, originalTotal - subtotal);

    const deliveryThreshold = window.APP_CONFIG?.DELIVERY_CONFIG?.freeDeliveryThreshold || 299;
    const standardFee = window.APP_CONFIG?.DELIVERY_CONFIG?.standardDeliveryFee || 30;

    let deliveryFee = 0;
    let isFreeDelivery = false;
    let amountForFreeDelivery = 0;

    if (subtotal === 0) {
      deliveryFee = 0;
      isFreeDelivery = false;
    } else if (subtotal >= deliveryThreshold) {
      deliveryFee = 0;
      isFreeDelivery = true;
    } else {
      deliveryFee = standardFee;
      amountForFreeDelivery = deliveryThreshold - subtotal;
    }

    const grandTotal = subtotal + deliveryFee;

    return {
      subtotal,
      originalTotal,
      savings,
      deliveryFee,
      isFreeDelivery,
      amountForFreeDelivery,
      grandTotal,
      itemCount: this.getTotalItemCount(),
      items: [...this.items]
    };
  }
}

// Instantiate global cart
const cart = new ShoppingCart();
window.cart = cart;

/**
 * =========================================================================
 * CART UI RENDERING & EVENT HANDLERS
 * =========================================================================
 */
function updateCartBadges(count) {
  const badgeElements = document.querySelectorAll(".cart-count-badge");
  badgeElements.forEach(badge => {
    badge.textContent = count;
    if (count > 0) {
      badge.classList.remove("hidden");
      badge.classList.add("bump");
      setTimeout(() => badge.classList.remove("bump"), 300);
    } else {
      badge.classList.add("hidden");
    }
  });
}

function renderCartDrawer() {
  const itemsContainer = document.getElementById("cartItemsList");
  const emptyState = document.getElementById("cartEmptyState");
  const footerContent = document.getElementById("cartDrawerFooter");
  const subtotalEl = document.getElementById("cartSubtotalDisplay");
  const deliveryEl = document.getElementById("cartDeliveryDisplay");
  const grandTotalEl = document.getElementById("cartGrandTotalDisplay");
  const savingsBannerEl = document.getElementById("cartSavingsBanner");
  const freeDeliveryBannerEl = document.getElementById("cartFreeDeliveryBanner");

  if (!itemsContainer) return;

  const summary = cart.getSummary();

  // Update badge
  updateCartBadges(summary.itemCount);

  if (summary.items.length === 0) {
    if (itemsContainer) itemsContainer.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    if (footerContent) footerContent.classList.add("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");
  if (footerContent) footerContent.classList.remove("hidden");

  // Render items list
  itemsContainer.innerHTML = summary.items.map(item => {
    const itemTotal = item.price * item.quantity;
    return `
      <div class="cart-item-row" data-product-id="${item.id}">
        <div class="cart-item-img-wrap">
          <img src="${item.image}" alt="${item.name}" loading="lazy" />
        </div>
        <div class="cart-item-info">
          <h4 class="cart-item-title">${item.name}</h4>
          <span class="cart-item-pack">${item.packSize}</span>
          <div class="cart-item-pricing">
            <span class="cart-item-unit-price">₹${item.price} each</span>
            <span class="cart-item-total-price">₹${itemTotal}</span>
          </div>
          <div class="cart-item-controls">
            <div class="qty-stepper">
              <button type="button" class="qty-btn btn-dec" onclick="cart.decreaseQty('${item.id}')" aria-label="Decrease quantity">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <span class="qty-val">${item.quantity}</span>
              <button type="button" class="qty-btn btn-inc" onclick="cart.increaseQty('${item.id}')" aria-label="Increase quantity">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            </div>
            <button type="button" class="cart-remove-btn" onclick="cart.removeItem('${item.id}')" title="Remove item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              <span>Remove</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Update summary fields
  if (subtotalEl) subtotalEl.textContent = `₹${summary.subtotal}`;
  if (deliveryEl) {
    if (summary.isFreeDelivery) {
      deliveryEl.innerHTML = `<span class="badge-free">FREE</span>`;
    } else {
      deliveryEl.textContent = `₹${summary.deliveryFee}`;
    }
  }
  if (grandTotalEl) grandTotalEl.textContent = `₹${summary.grandTotal}`;

  // Free delivery threshold banner
  if (freeDeliveryBannerEl) {
    if (summary.isFreeDelivery) {
      freeDeliveryBannerEl.innerHTML = `
        <div class="delivery-progress-unlocked">
          <span class="badge-check-icon">✓</span> You've unlocked <strong>FREE Delivery!</strong>
        </div>
      `;
    } else {
      freeDeliveryBannerEl.innerHTML = `
        <div class="delivery-progress-locked">
          Add <strong>₹${summary.amountForFreeDelivery}</strong> more to get <strong>FREE Delivery</strong>
        </div>
      `;
    }
  }

  // Savings banner
  if (savingsBannerEl) {
    if (summary.savings > 0) {
      savingsBannerEl.classList.remove("hidden");
      savingsBannerEl.textContent = `You save ₹${summary.savings} on this order!`;
    } else {
      savingsBannerEl.classList.add("hidden");
    }
  }
}

// Drawer Open / Close helpers
function openCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  if (drawer && overlay) {
    renderCartDrawer();
    drawer.classList.add("open");
    overlay.classList.add("open");
    document.body.classList.add("modal-open");
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  if (drawer && overlay) {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    document.body.classList.remove("modal-open");
  }
}

// Initialize Cart event listener
cart.subscribe(() => {
  renderCartDrawer();
});

document.addEventListener("DOMContentLoaded", () => {
  renderCartDrawer();
});
