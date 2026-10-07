/**
 * =========================================================================
 * NBS RAJ WATER - MAIN APPLICATION LOGIC
 * =========================================================================
 * Dynamic product rendering, live search & category filters,
 * mobile drawer navigation, toast notifications, bulk order inquiries,
 * contact form handling, and WhatsApp floating actions.
 * =========================================================================
 */

// Toast notification helper
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconSvg = type === "success" 
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : type === "warning"
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

  toast.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-message">${message}</div>
    <button type="button" class="toast-close" onclick="this.parentElement.remove()" aria-label="Close">×</button>
  `;

  container.appendChild(toast);

  // Auto remove after 3.5s
  setTimeout(() => {
    toast.classList.add("toast-fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showToast = showToast;

/**
 * =========================================================================
 * DYNAMIC PRODUCT RENDERING & FILTERING
 * =========================================================================
 */
let currentCategory = "all";
let currentSearchQuery = "";

// State to store local quantity selection for each product card before adding to cart
const productQuantityState = {};

function getCardQuantity(productId) {
  return productQuantityState[productId] || 1;
}

function setCardQuantity(productId, newQty) {
  const val = Math.max(1, parseInt(newQty, 10) || 1);
  productQuantityState[productId] = val;
  const qtyEl = document.getElementById(`cardQty_${productId}`);
  if (qtyEl) qtyEl.textContent = val;
}

function incrementCardQty(productId) {
  const cur = getCardQuantity(productId);
  setCardQuantity(productId, cur + 1);
}

function decrementCardQty(productId) {
  const cur = getCardQuantity(productId);
  if (cur > 1) {
    setCardQuantity(productId, cur - 1);
  }
}

// Add to cart from product card
function handleAddToCartClick(productId) {
  const qty = getCardQuantity(productId);
  window.cart.addItem(productId, qty);
  // Reset card quantity counter back to 1
  setCardQuantity(productId, 1);
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const noResults = document.getElementById("noProductsFound");
  if (!grid) return;

  const all = window.getAllProducts();
  const filtered = all.filter(p => {
    const matchesCat = (currentCategory === "all") || (p.category === currentCategory);
    const query = currentSearchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      p.name.toLowerCase().includes(query) ||
      p.packSize.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query);

    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (noResults) noResults.classList.remove("hidden");
    return;
  }

  if (noResults) noResults.classList.add("hidden");

  grid.innerHTML = filtered.map(p => {
    const cardQty = getCardQuantity(p.id);
    const discountPercent = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;

    return `
      <div class="product-card" data-product-id="${p.id}" data-category="${p.category}">
        <!-- Top Badge -->
        <div class="card-badge-row">
          ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ""}
          ${discountPercent > 0 ? `<span class="discount-pill">${discountPercent}% OFF</span>` : ""}
        </div>

        <!-- Product Image -->
        <div class="product-image-wrap">
          <img src="${p.image}" alt="${p.name}" loading="lazy" class="product-thumb-img" />
        </div>

        <!-- Product Details -->
        <div class="product-details-body">
          <span class="pack-size-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
            ${p.packSize}
          </span>
          <h3 class="product-title">${p.name}</h3>
          <p class="product-desc-snippet">${p.description}</p>

          <!-- Price Display -->
          <div class="product-pricing-box">
            <div class="current-price-wrap">
              <span class="currency">₹</span>
              <span class="price-val">${p.price}</span>
            </div>
            ${p.oldPrice ? `<span class="old-price-val">₹${p.oldPrice}</span>` : ""}
          </div>

          <!-- Quantity Selector -->
          <div class="card-qty-row">
            <span class="qty-label">Quantity:</span>
            <div class="card-qty-stepper">
              <button type="button" class="btn-qty-minus" onclick="decrementCardQty('${p.id}')" aria-label="Decrease quantity">−</button>
              <span class="card-qty-display" id="cardQty_${p.id}">${cardQty}</span>
              <button type="button" class="btn-qty-plus" onclick="incrementCardQty('${p.id}')" aria-label="Increase quantity">+</button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="product-card-actions">
            <button type="button" class="btn btn-add-cart" onclick="handleAddToCartClick('${p.id}')">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              <span>Add to Cart</span>
            </button>
            <button type="button" class="btn btn-buy-now" onclick="handleBuyNow('${p.id}')">
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Category filter tabs
function setupCategoryFilters() {
  const tabs = document.querySelectorAll(".cat-filter-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentCategory = tab.dataset.category || "all";
      renderProducts();
    });
  });
}

// Live Search handler
function setupSearchInputs() {
  const headerSearch = document.getElementById("headerSearchInput");
  const sectionSearch = document.getElementById("productSearchInput");
  const clearBtn = document.getElementById("clearSearchBtn");

  function handleSearchUpdate(val) {
    currentSearchQuery = val;
    if (headerSearch && headerSearch.value !== val) headerSearch.value = val;
    if (sectionSearch && sectionSearch.value !== val) sectionSearch.value = val;
    renderProducts();
  }

  if (headerSearch) {
    headerSearch.addEventListener("input", (e) => handleSearchUpdate(e.target.value));
  }
  if (sectionSearch) {
    sectionSearch.addEventListener("input", (e) => handleSearchUpdate(e.target.value));
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      handleSearchUpdate("");
      if (headerSearch) headerSearch.value = "";
      if (sectionSearch) sectionSearch.value = "";
    });
  }
}

/**
 * =========================================================================
 * NAVIGATION & SCROLLING
 * =========================================================================
 */
function scrollToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (target) {
    const navHeight = document.querySelector(".site-header")?.offsetHeight || 80;
    const targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
    window.scrollTo({
      top: targetPos,
      behavior: "smooth"
    });
  }
  closeMobileMenu();
}
window.scrollToSection = scrollToSection;

function setupStickyHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      header.classList.add("header-scrolled");
    } else {
      header.classList.remove("header-scrolled");
    }
  }, { passive: true });
}

function setupMobileMenu() {
  const toggleBtn = document.getElementById("mobileMenuBtn");
  const drawer = document.getElementById("mobileNavDrawer");
  const overlay = document.getElementById("mobileNavOverlay");
  const closeBtn = document.getElementById("mobileNavClose");

  if (!toggleBtn || !drawer) return;

  function toggle() {
    drawer.classList.toggle("open");
    if (overlay) overlay.classList.toggle("open");
    document.body.classList.toggle("modal-open");
  }

  toggleBtn.addEventListener("click", toggle);
  if (closeBtn) closeBtn.addEventListener("click", closeMobileMenu);
  if (overlay) overlay.addEventListener("click", closeMobileMenu);
}

function closeMobileMenu() {
  const drawer = document.getElementById("mobileNavDrawer");
  const overlay = document.getElementById("mobileNavOverlay");
  if (drawer) drawer.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
  document.body.classList.remove("modal-open");
}

/**
 * =========================================================================
 * BULK ORDER MODAL & INQUIRY SYSTEM
 * =========================================================================
 */
function openBulkOrderModal() {
  const modal = document.getElementById("bulkOrderModal");
  if (modal) {
    modal.classList.add("open");
    document.body.classList.add("modal-open");
  }
}
window.openBulkOrderModal = openBulkOrderModal;

function closeBulkOrderModal() {
  const modal = document.getElementById("bulkOrderModal");
  if (modal) {
    modal.classList.remove("open");
    document.body.classList.remove("modal-open");
  }
}
window.closeBulkOrderModal = closeBulkOrderModal;

function setupBulkOrderForm() {
  const form = document.getElementById("bulkOrderForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const orgType = document.getElementById("bulkOrgType")?.value;
    const orgName = document.getElementById("bulkOrgName")?.value.trim();
    const contactPerson = document.getElementById("bulkContactPerson")?.value.trim();
    const phone = document.getElementById("bulkPhone")?.value.trim();
    const requirements = document.getElementById("bulkRequirements")?.value.trim();
    const estimatedQty = document.getElementById("bulkEstimatedQty")?.value.trim();

    if (!orgName || !contactPerson || !phone || !requirements) {
      showToast("Please fill in all required bulk inquiry fields.", "error");
      return;
    }

    if (!window.validateIndianMobile(phone)) {
      showToast("Please provide a valid 10-digit contact number.", "error");
      return;
    }

    // WhatsApp bulk inquiry message
    const bulkMessage = 
`*NBS AQUAVEDA - BULK ORDER INQUIRY*

*Organization Type:* ${orgType}
*Organization / Business:* ${orgName}
*Contact Person:* ${contactPerson}
*Phone:* ${phone}
*Estimated Requirement:* ${estimatedQty || "Not specified"}
*Details / Notes:*
${requirements}`;

    const targetNumber = window.APP_CONFIG?.WHATSAPP_NUMBER || "917355415447";
    const waUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(bulkMessage)}`;

    // Optional backend sync
    try {
      fetch(`${window.APP_CONFIG.API_CONFIG.baseUrl}/bulk-inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgType, orgName, contactPerson, phone, requirements, estimatedQty })
      }).catch(err => console.log("Backend offline for bulk sync:", err));
    } catch (_) {}

    window.open(waUrl, "_blank");
    closeBulkOrderModal();
    form.reset();
    showToast("Bulk inquiry forwarded to WhatsApp! Our team will contact you.", "success");
  });
}

/**
 * =========================================================================
 * CONTACT FORM SYSTEM
 * =========================================================================
 */
function setupContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("contactName")?.value.trim();
    const email = document.getElementById("contactEmail")?.value.trim();
    const phone = document.getElementById("contactPhone")?.value.trim();
    const subject = document.getElementById("contactSubject")?.value.trim();
    const message = document.getElementById("contactMessage")?.value.trim();

    if (!name || !phone || !message) {
      showToast("Please complete the required contact fields.", "error");
      return;
    }

    if (!window.validateIndianMobile(phone)) {
      showToast("Please enter a valid 10-digit mobile number.", "error");
      return;
    }

    // Prepare WhatsApp message
    const contactMsg = 
`*NBS AQUAVEDA - CUSTOMER INQUIRY*

*Name:* ${name}
*Phone:* ${phone}
*Email:* ${email || "Not provided"}
*Subject:* ${subject || "General Inquiry"}

*Message:*
${message}`;

    const targetNumber = window.APP_CONFIG?.WHATSAPP_NUMBER || "917355415447";
    const waUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(contactMsg)}`;

    // Optional backend sync
    try {
      fetch(`${window.APP_CONFIG.API_CONFIG.baseUrl}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, subject, message })
      }).catch(err => console.log("Backend sync offline:", err));
    } catch (_) {}

    window.open(waUrl, "_blank");
    form.reset();
    showToast("Message sent to NBS AQUAVEDA WhatsApp support!", "success");
  });
}

/**
 * =========================================================================
 * DIRECT WHATSAPP ACTION (FLOATING & HERO BUTTONS)
 * =========================================================================
 */
function openDirectWhatsAppChat(defaultText) {
  const targetNumber = window.APP_CONFIG?.WHATSAPP_NUMBER || "917355415447";
  const msg = defaultText || "Hello NBS AQUAVEDA, I would like to place an order for pure drinking water.";
  window.open(`https://wa.me/${targetNumber}?text=${encodeURIComponent(msg)}`, "_blank");
}
window.openDirectWhatsAppChat = openDirectWhatsAppChat;

/**
 * =========================================================================
 * INITIALIZE APP ON DOM READY
 * =========================================================================
 */
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  setupCategoryFilters();
  setupSearchInputs();
  setupStickyHeader();
  setupMobileMenu();
  setupBulkOrderForm();
  setupContactForm();
});
