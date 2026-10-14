/**
 * =========================================================================
 * NBS AQUAVEDA - "MY ORDERS" & LIVE TRACKING SYSTEM
 * =========================================================================
 * Manages customer order history in localStorage + Live Backend API Sync
 * (/api/orders), renders visual progress tracking steppers across all 6
 * statuses, supports live Order ID / Mobile lookup, and re-ordering.
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
    address: "Main Market Road, Near NTPC Gate, Unchahar",
    city: "Raebareli",
    state: "Uttar Pradesh",
    pincode: "229404",
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
    savings: 110
  },
  paymentMethod: "UPI (GPay / PhonePe / Paytm)",
  status: "Out for Delivery"
};

// Retrieve all stored orders
function getStoredOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([INITIAL_DEMO_ORDER]));
      return [INITIAL_DEMO_ORDER];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [INITIAL_DEMO_ORDER];
  } catch (err) {
    console.error("Error reading orders:", err);
    return [];
  }
}

// Save newly placed order to storage
function saveOrderToStorage(order) {
  const orders = getStoredOrders();
  const existingIdx = orders.findIndex(o => o.orderId === order.orderId);
  if (existingIdx > -1) {
    orders[existingIdx] = order;
  } else {
    orders.unshift(order);
  }
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error("Error storing order:", err);
  }
}
window.saveOrderToStorage = saveOrderToStorage;
window.getStoredOrders = getStoredOrders;
window.ORDERS_STORAGE_KEY = ORDERS_STORAGE_KEY;

// Synchronize stored order statuses with Cloud Topic & Express backend
async function syncOrdersFromBackend(searchFilter = "") {
  let cloudOrders = [];
  try {
    const cloudRes = await fetch("https://ntfy.sh/nbs_aquaveda_live_orders_7355415447/json?poll=1&since=all", { cache: "no-store" });
    if (cloudRes.ok) {
      const text = await cloudRes.text();
      const lines = text.split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.event === "message" && entry.message) {
            let parsed = null;
            try { 
              parsed = JSON.parse(entry.message); 
            } catch (_) {
              try {
                const fixed = entry.message.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
                parsed = JSON.parse(fixed);
              } catch (_) {}
            }
            if (parsed && parsed.orderId) cloudOrders.push(parsed);
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  let serverOrders = [];
  try {
    const baseUrl = window.APP_CONFIG?.API_CONFIG?.baseUrl || "/api";
    const res = await fetch(`${baseUrl}/orders`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        serverOrders = data.orders;
      }
    }
  } catch (_) {}

  if (cloudOrders.length > 0 || serverOrders.length > 0) {
    const localOrders = getStoredOrders();
    const orderMap = new Map();
    localOrders.forEach(loc => orderMap.set(loc.orderId, loc));
    cloudOrders.forEach(co => {
      if (orderMap.has(co.orderId)) {
        orderMap.set(co.orderId, { ...orderMap.get(co.orderId), ...co, status: co.status });
      }
    });
    serverOrders.forEach(srv => {
      if (orderMap.has(srv.orderId)) {
        orderMap.set(srv.orderId, { ...orderMap.get(srv.orderId), ...srv, status: srv.status });
      }
    });
    const merged = Array.from(orderMap.values()).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(merged));
    } catch (_) {}
    renderMyOrdersList(searchFilter);
  }
}

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

// Render My Orders List with optional search filter (by Order ID or Mobile)
function renderMyOrdersList(filterText = "") {
  const container = document.getElementById("myOrdersList");
  if (!container) return;

  const allOrders = getStoredOrders();
  const query = String(filterText).trim().toLowerCase();

  const orders = query
    ? allOrders.filter(o =>
        String(o.orderId).toLowerCase().includes(query) ||
        String(o.customer?.mobile || "").toLowerCase().includes(query) ||
        String(o.customer?.name || "").toLowerCase().includes(query)
      )
    : allOrders;

  const searchBarHtml = `
    <div style="display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap;">
      <input
        type="text"
        id="myOrdersSearchInput"
        class="form-control"
        placeholder="🔍 Track by Order ID (e.g. NBS...) or Mobile Number..."
        value="${filterText.replace(/"/g, '&quot;')}"
        oninput="renderMyOrdersList(this.value)"
        style="flex: 1; min-width: 220px; padding: 10px 14px; font-size: 0.9rem;"
      />
      <button type="button" class="btn btn-outline-sm" onclick="syncOrdersFromBackend(document.getElementById('myOrdersSearchInput')?.value || ''); if(window.showToast) window.showToast('Order status synced!', 'info');" title="Refresh Live Order Status">
        🔄 Refresh Status
      </button>
    </div>
  `;

  if (orders.length === 0) {
    container.innerHTML = `
      ${searchBarHtml}
      <div class="empty-orders-view">
        <div class="empty-icon-wrap">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00A8E8" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        </div>
        <h3>No Matching Orders Found</h3>
        <p>${query ? "No order matched your search query." : "You haven't placed any drinking water orders yet."}</p>
        <button type="button" class="btn btn-primary" onclick="closeMyOrdersModal(); scrollToSection('products');">
          Browse Products
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = searchBarHtml + orders.map(order => {
    const dateFormatted = new Date(order.date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    return `
      <div class="order-card-card">
        <div class="order-card-header">
          <div class="order-id-meta">
            <span class="order-id-pill">#${order.orderId}</span>
            <span class="order-date-text">${dateFormatted}</span>
          </div>
          <span class="status-badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
        </div>

        <!-- Tracking Stepper -->
        <div class="order-tracking-wrap">
          ${renderTrackingStepper(order.status)}
        </div>

        <div class="order-card-items-list">
          ${(order.items || []).map(item => `
            <div class="order-card-item-row">
              <span class="item-name-qty"><strong>${item.quantity}x</strong> ${item.name} (${item.packSize || ""})</span>
              <span class="item-price">₹${item.price * item.quantity}</span>
            </div>
          `).join("")}
        </div>

        <div class="order-card-footer">
          <div class="order-meta-info">
            <span class="payment-badge">Payment: <strong>${order.paymentMethod}</strong></span>
            <span class="order-total-sum">Total: <strong>₹${order.summary?.grandTotal || 0}</strong></span>
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

  // Restore focus if searching
  if (filterText) {
    const input = document.getElementById("myOrdersSearchInput");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
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
  syncOrdersFromBackend();
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

// Cross-tab real-time status updates when Admin updates an order
window.addEventListener("storage", (e) => {
  if (e.key === ORDERS_STORAGE_KEY) {
    const modal = document.getElementById("myOrdersModal");
    if (modal && modal.classList.contains("open")) {
      const currentSearch = document.getElementById("myOrdersSearchInput")?.value || "";
      renderMyOrdersList(currentSearch);
    }
  }
});

if (typeof BroadcastChannel !== "undefined") {
  try {
    const bc = new BroadcastChannel("nbs_aquaveda_orders_channel");
    bc.onmessage = (e) => {
      if (e.data && (e.data.type === "ORDER_STATUS_UPDATE" || e.data.type === "NEW_ORDER")) {
        const modal = document.getElementById("myOrdersModal");
        if (modal && modal.classList.contains("open")) {
          const currentSearch = document.getElementById("myOrdersSearchInput")?.value || "";
          renderMyOrdersList(currentSearch);
        }
      }
    };
  } catch (_) {}
}

window.openMyOrdersModal = openMyOrdersModal;
window.closeMyOrdersModal = closeMyOrdersModal;
window.reOrderItems = reOrderItems;
window.openOrderWhatsAppHelp = openOrderWhatsAppHelp;
window.renderMyOrdersList = renderMyOrdersList;
window.syncOrdersFromBackend = syncOrdersFromBackend;
