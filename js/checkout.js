/**
 * =========================================================================
 * NBS RAJ WATER - CHECKOUT & WHATSAPP ORDER SYSTEM
 * =========================================================================
 * Validates customer details (Indian mobile, 6-digit PIN, required fields),
 * formats the WhatsApp order strictly to specification, triggers click-to-chat,
 * stores orders in localStorage (and syncs to backend API), and displays
 * the Order Confirmed confirmation screen.
 * =========================================================================
 */

// Generate unique Order ID e.g. NBS12345678
function generateOrderId() {
  const randomPart = Math.floor(10000000 + Math.random() * 90000000);
  return `NBS${randomPart}`;
}

// Validation helpers
function validateIndianMobile(mobile) {
  const cleaned = String(mobile).replace(/\D/g, "");
  // Standard 10-digit Indian mobile starting with 6, 7, 8, or 9
  return /^[6-9]\d{9}$/.test(cleaned);
}

function validatePincode(pincode) {
  const cleaned = String(pincode).trim();
  // Standard 6-digit Indian PIN code (cannot start with 0)
  return /^[1-9][0-9]{5}$/.test(cleaned);
}

// Open Checkout Modal / View
function openCheckoutModal() {
  const summary = window.cart.getSummary();
  if (summary.items.length === 0) {
    if (window.showToast) {
      window.showToast("Your cart is empty! Please add products before checkout.", "warning");
    }
    return;
  }

  // Close cart drawer if open
  if (typeof closeCartDrawer === "function") {
    closeCartDrawer();
  }

  renderCheckoutSummary();
  const modal = document.getElementById("checkoutModal");
  if (modal) {
    modal.classList.add("open");
    document.body.classList.add("modal-open");
  }
}

function closeCheckoutModal() {
  const modal = document.getElementById("checkoutModal");
  if (modal) {
    modal.classList.remove("open");
    document.body.classList.remove("modal-open");
  }
}

// Render Order Summary inside the checkout form
function renderCheckoutSummary() {
  const summaryList = document.getElementById("checkoutItemsSummary");
  const subtotalEl = document.getElementById("checkoutSubtotal");
  const deliveryEl = document.getElementById("checkoutDelivery");
  const grandTotalEl = document.getElementById("checkoutGrandTotal");

  const summary = window.cart.getSummary();

  if (summaryList) {
    summaryList.innerHTML = summary.items.map(item => `
      <div class="checkout-item-line">
        <div class="checkout-item-title-col">
          <span class="checkout-item-name">${item.name}</span>
          <span class="checkout-item-meta">${item.packSize} × ${item.quantity}</span>
        </div>
        <span class="checkout-item-price">₹${item.price * item.quantity}</span>
      </div>
    `).join("");
  }

  if (subtotalEl) subtotalEl.textContent = `₹${summary.subtotal}`;
  if (deliveryEl) {
    deliveryEl.textContent = summary.isFreeDelivery ? "FREE" : `₹${summary.deliveryFee}`;
  }
  if (grandTotalEl) grandTotalEl.textContent = `₹${summary.grandTotal}`;
}

// Fast "Buy Now" handler from product cards
function handleBuyNow(productId) {
  // If item not yet in cart, add it
  const product = window.getProductById(productId);
  if (!product) return;

  // Add 1 unit
  window.cart.addItem(productId, 1);
  // Directly open checkout
  openCheckoutModal();
}

/**
 * =========================================================================
 * WHATSAPP MESSAGE BUILDER
 * Strict compliance with the requested message structure:
 *
 * NBS RAJ WATER - NEW ORDER
 *
 * Order ID: NBS12345678
 *
 * Customer Details:
 * Name:
 * Mobile:
 * WhatsApp:
 * Address:
 * City:
 * State:
 * Pincode:
 *
 * Order Details:
 * Product: ...
 * Quantity: ...
 * Price: ...
 * Total: ...
 *
 * Payment Method:
 *
 * Subtotal:
 * Delivery Charge:
 * Grand Total:
 *
 * Delivery Instructions:
 * =========================================================================
 */
function buildWhatsAppMessage(order) {
  // Formatted order items
  const productLines = order.items.map(item => 
    `• ${item.name} (${item.packSize}) | Qty: ${item.quantity} | ₹${item.price * item.quantity}`
  ).join("\n");

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const message = 
`*NBS RAJ WATER - NEW ORDER*

*Order ID:* ${order.orderId}

*Customer Details:*
Name: ${order.customer.name}
Mobile: ${order.customer.mobile}
WhatsApp: ${order.customer.whatsapp || order.customer.mobile}
Address: ${order.customer.address}
City: ${order.customer.city}
State: ${order.customer.state}
Pincode: ${order.customer.pincode}

*Order Details:*
${productLines}
Total Packs: ${totalQuantity}

*Payment Method:* ${order.paymentMethod}

*Subtotal:* ₹${order.summary.subtotal}
*Delivery Charge:* ${order.summary.isFreeDelivery ? "FREE (₹0)" : "₹" + order.summary.deliveryFee}
*Grand Total:* ₹${order.summary.grandTotal}

*Delivery Instructions:* ${order.customer.instructions || "None"}`;

  return message;
}

/**
 * =========================================================================
 * CHECKOUT FORM SUBMISSION & PROCESSOR
 * =========================================================================
 */
async function processCheckout(event) {
  event.preventDefault();

  const form = document.getElementById("checkoutForm");
  const summary = window.cart.getSummary();

  // Guard against empty cart
  if (summary.items.length === 0) {
    if (window.showToast) {
      window.showToast("Cannot place order with an empty cart!", "error");
    }
    return;
  }

  // Extract form inputs
  const fullName = document.getElementById("custName")?.value.trim();
  const mobile = document.getElementById("custMobile")?.value.trim();
  const whatsapp = document.getElementById("custWhatsapp")?.value.trim() || mobile;
  const address = document.getElementById("custAddress")?.value.trim();
  const city = document.getElementById("custCity")?.value.trim();
  const state = document.getElementById("custState")?.value.trim();
  const pincode = document.getElementById("custPincode")?.value.trim();
  const instructions = document.getElementById("custInstructions")?.value.trim();
  const paymentMethodEl = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentMethod = paymentMethodEl ? paymentMethodEl.value : "Cash on Delivery";

  // Front-end Validations
  let hasError = false;

  // Clear previous errors
  document.querySelectorAll(".field-error").forEach(el => el.textContent = "");

  if (!fullName) {
    showFieldError("custName", "Please enter your full name.");
    hasError = true;
  }

  if (!mobile || !validateIndianMobile(mobile)) {
    showFieldError("custMobile", "Please enter a valid 10-digit mobile number (e.g. 7355415447).");
    hasError = true;
  }

  if (whatsapp && !validateIndianMobile(whatsapp)) {
    showFieldError("custWhatsapp", "Please enter a valid 10-digit WhatsApp number.");
    hasError = true;
  }

  if (!address || address.length < 5) {
    showFieldError("custAddress", "Please provide complete street / door address.");
    hasError = true;
  }

  if (!city) {
    showFieldError("custCity", "City name is required.");
    hasError = true;
  }

  if (!state) {
    showFieldError("custState", "State is required.");
    hasError = true;
  }

  if (!pincode || !validatePincode(pincode)) {
    showFieldError("custPincode", "Please enter a valid 6-digit PIN code.");
    hasError = true;
  }

  if (hasError) {
    if (window.showToast) {
      window.showToast("Please correct the highlighted form errors.", "error");
    }
    return;
  }

  // Construct complete Order object
  const orderId = generateOrderId();
  const orderDate = new Date().toISOString();

  const orderData = {
    orderId,
    date: orderDate,
    customer: {
      name: fullName,
      mobile,
      whatsapp,
      address,
      city,
      state,
      pincode,
      instructions
    },
    items: summary.items,
    summary: {
      subtotal: summary.subtotal,
      deliveryFee: summary.deliveryFee,
      isFreeDelivery: summary.isFreeDelivery,
      grandTotal: summary.grandTotal,
      savings: summary.savings
    },
    paymentMethod,
    status: "Order Placed"
  };

  // 1. Save to LocalStorage for "My Orders"
  window.saveOrderToStorage(orderData);

  // 2. Synchronize with backend API if available
  try {
    if (window.APP_CONFIG?.API_CONFIG?.enableBackendSync) {
      fetch(`${window.APP_CONFIG.API_CONFIG.baseUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      }).catch(e => console.log("Backend offline or non-blocking sync note:", e));
    }
  } catch (err) {
    console.log("Backend sync skipped:", err);
  }

  // 3. Clear cart
  window.cart.clearCart();

  // 4. Generate formatted WhatsApp message
  const whatsappMsg = buildWhatsAppMessage(orderData);
  const targetNumber = window.APP_CONFIG?.WHATSAPP_NUMBER || "917355415447";
  const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(whatsappMsg)}`;

  // 5. Open WhatsApp in new tab / mobile app
  window.open(whatsappUrl, "_blank");

  // 6. Close checkout and show Order Confirmation modal
  closeCheckoutModal();
  showOrderConfirmationModal(orderData);

  if (window.showToast) {
    window.showToast(`Order #${orderId} generated! Connecting to WhatsApp...`, "success");
  }
}

function showFieldError(fieldId, errorText) {
  const inputEl = document.getElementById(fieldId);
  if (inputEl) {
    inputEl.classList.add("input-error");
    const parent = inputEl.closest(".form-group");
    if (parent) {
      let errEl = parent.querySelector(".field-error");
      if (!errEl) {
        errEl = document.createElement("span");
        errEl.className = "field-error";
        parent.appendChild(errEl);
      }
      errEl.textContent = errorText;
    }
    inputEl.addEventListener("input", () => {
      inputEl.classList.remove("input-error");
      const err = inputEl.closest(".form-group")?.querySelector(".field-error");
      if (err) err.textContent = "";
    }, { once: true });
  }
}

/**
 * =========================================================================
 * ORDER CONFIRMATION MODAL
 * =========================================================================
 */
function showOrderConfirmationModal(order) {
  const modal = document.getElementById("orderConfirmationModal");
  if (!modal) return;

  const idEl = document.getElementById("confirmOrderId");
  const summaryEl = document.getElementById("confirmOrderSummary");

  if (idEl) idEl.textContent = order.orderId;

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="confirm-summary-box">
        <div class="confirm-customer-brief">
          <strong>Deliver To:</strong> ${order.customer.name} (${order.customer.mobile})<br>
          ${order.customer.address}, ${order.customer.city} - ${order.customer.pincode}
        </div>
        <div class="confirm-items-brief">
          <strong>Items Ordered:</strong>
          <ul>
            ${order.items.map(i => `<li>${i.name} × ${i.quantity} (₹${i.price * i.quantity})</li>`).join("")}
          </ul>
        </div>
        <div class="confirm-total-line">
          <span>Payment Mode: <strong>${order.paymentMethod}</strong></span>
          <span class="confirm-grand-total">Total: <strong>₹${order.summary.grandTotal}</strong></span>
        </div>
      </div>
    `;
  }

  modal.classList.add("open");
  document.body.classList.add("modal-open");
}

function closeOrderConfirmationModal() {
  const modal = document.getElementById("orderConfirmationModal");
  if (modal) {
    modal.classList.remove("open");
    document.body.classList.remove("modal-open");
  }
}

// Bind checkout form submit event
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("checkoutForm");
  if (form) {
    form.addEventListener("submit", processCheckout);
  }
});
