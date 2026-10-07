/**
 * =========================================================================
 * NBS RAJ WATER - "MY ORDERS" & TRACKING SYSTEM
 * =========================================================================
 * Manages customer order history in localStorage, renders visual progress
 * tracking steppers across all 6 statuses, and provides re-order capability.
 * =========================================================================
 */

const ORDERS_STORAGE_KEY = "nbs_raj_orders_history_v1";

// Default initial demo order so new users immediately see the tracking UI
const INITIAL_DEMO_ORDER = {
  orderId: "NBS88294150",
  date: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
  customer: {
    name: "Rajesh Kumar",
    mobile: "7355415447",
    whatsapp: "7355415447",
    address: "Flat 402, Lotus Towers, City Center",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    instructions: "Please ring bell and leave near door."
  },
  items: [
    {
      id: "nbs-20l",
      name: "NBS AQUAVEDA 20 Litre",
      packSize: "For Home & Office",
      price: 50,
      quantity: 2,
      image: "assets/images/can-20l.png"
    },
    {
      id: "nbs-1000ml",
      name: "NBS AQUAVEDA 1 Litre",
      packSize: "15 + 1 Bottles",
      price: 130,
      quantity: 1,
      image: "assets/images/bottle-1000ml.png"
    }
  ],
  summary: {
    subtotal: 230,
    deliveryFee: 30,
    isFreeDelivery: false,
    grandTotal: 260,
    savings: 60
  },
  paymentMethod: "UPI",
  status: "Out for Delivery"
};

// Retrieve all stored orders
function getStoredOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      // Seed initial demo order
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([INITIAL_DEMO_ORDER]));
      return [INITIAL_DEMO_ORDER];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading orders:", err);
    return [];
  }
}

// Save newly placed order to storage
function saveOrderToStorage(order) {
  const orders = getStoredOrders();
  // Prepend newest order to top
  orders.unshift(order);
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error("Error storing order:", err);
  }
}
window.saveOrderToStorage = saveOrderToStorage;

// Status styling badge helpers
function getStatusBadgeClass(status) {
  switch (status) {
    case "Order Placed": return "status-placed";
    case "Order Confirmed": return "status-confirmed";
    case "Preparing": return "status-preparing";
    case "Out for Delivery": return "status-out";
    case "Delivered": return "status-delivered";
    case "Cancelled": return "status-cancelled";
    default: return "status-default";
  }
}

// Generate the visual tracking stepper for an order
function renderTrackingStepper(currentStatus) {
  const steps = [
    { name: "Order Placed", label: "Placed" },
    { name: "Order Confirmed", label: "Confirmed" },
    { name: "Preparing", label: "Preparing" },
    { name: "Out for Delivery", label: "Out for Delivery" },
    { name: "Delivered", label: "Delivered" }
  ];

  if (currentStatus === "Cancelled") {
    return `
      <div class="stepper-cancelled">
        <span class="cancel-icon">✕</span> This order was marked as <strong>Cancelled</strong>.
      </div>
    `;
  }

  const currentIndex = steps.findIndex(s => s.name === currentStatus);
  const activeIdx = currentIndex > -1 ? currentIndex : 0;

  return `
    <div class="order-stepper">
      ${steps.map((step, idx) => {
        let stepClass = "step-pending";
        if (idx < activeIdx) stepClass = "step-completed";
        if (idx === activeIdx) stepClass = "step-current";

        return `
          <div class="step-item ${stepClass}">
            <div class="step-circle">
              ${idx < activeIdx ? "✓" : idx + 1}
            </div>
            <div class="step-label">${step.label}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// Render My Orders List
function renderMyOrdersList() {
  const container = document.getElementById("myOrdersList");
  if (!container) return;

  const orders = getStoredOrders();

  if (orders.length === 0) {
    container.innerHTML = `
      <div class="empty-orders-view">
        <div class="empty-icon-wrap">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00A8E8" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </div>
        <h3>No Orders Found</h3>
        <p>You haven't placed any drinking water orders yet.</p>
        <button type="button" class="btn btn-primary" onclick="closeMyOrdersModal(); scrollToSection('products');">
          Browse Products
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const dateFormatted = new Date(order.date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);

    return `
      <div class="order-card-card">
        <div class="order-card-header">
          <div class="order-id-meta">
            <span class="order-id-pill">${order.orderId}</span>
            <span class="order-date-text">${dateFormatted}</span>
          </div>
          <span class="status-badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
        </div>

        <!-- Tracking Stepper -->
        <div class="order-tracking-wrap">
          ${renderTrackingStepper(order.status)}
        </div>

        <div class="order-card-items-list">
          ${order.items.map(item => `
            <div class="order-card-item-row">
              <span class="item-name-qty"><strong>${item.quantity}x</strong> ${item.name} (${item.packSize})</span>
              <span class="item-price">₹${item.price * item.quantity}</span>
            </div>
          `).join("")}
        </div>

        <div class="order-card-footer">
          <div class="order-meta-info">
            <span class="payment-badge">Paid via: <strong>${order.paymentMethod}</strong></span>
            <span class="order-total-sum">Total: <strong>₹${order.summary.grandTotal}</strong></span>
          </div>
          <div class="order-actions-row">
            <button type="button" class="btn btn-outline-sm" onclick="reOrderItems('${order.orderId}')">
              ↻ Re-Order
            </button>
            <button type="button" class="btn btn-primary-sm" onclick="openOrderWhatsAppHelp('${order.orderId}')">
              Support on WhatsApp
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Re-order past items into cart
function reOrderItems(orderId) {
  const orders = getStoredOrders();
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return;

  order.items.forEach(item => {
    window.cart.addItem(item.id, item.quantity);
  });

  closeMyOrdersModal();
  if (typeof openCartDrawer === "function") {
    openCartDrawer();
  }

  if (window.showToast) {
    window.showToast(`Items from #${orderId} added to cart!`, "success");
  }
}

// Help with order via WhatsApp
function openOrderWhatsAppHelp(orderId) {
  const targetNumber = window.APP_CONFIG?.WHATSAPP_NUMBER || "917355415447";
  const msg = `Hello NBS AQUAVEDA, I need an update / support regarding my Order #${orderId}.`;
  window.open(`https://wa.me/${targetNumber}?text=${encodeURIComponent(msg)}`, "_blank");
}

// Modal controls
function openMyOrdersModal() {
  renderMyOrdersList();
  const modal = document.getElementById("myOrdersModal");
  if (modal) {
    modal.classList.add("open");
    document.body.classList.add("modal-open");
  }
}

function closeMyOrdersModal() {
  const modal = document.getElementById("myOrdersModal");
  if (modal) {
    modal.classList.remove("open");
    document.body.classList.remove("modal-open");
  }
}

window.openMyOrdersModal = openMyOrdersModal;
window.closeMyOrdersModal = closeMyOrdersModal;
window.reOrderItems = reOrderItems;
window.openOrderWhatsAppHelp = openOrderWhatsAppHelp;
