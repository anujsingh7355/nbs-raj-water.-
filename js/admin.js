/**
 * =========================================================================
 * NBS AQUAVEDA - STANDALONE ADMIN & DELIVERY APP CONTROLLER (js/admin.js)
 * =========================================================================
 * Full-stack Dual-Engine Sync:
 * - Works as a 100% standalone Admin App on Netlify / Tiiny.host / Mobile PWA
 * - Connects live to Express Backend REST API (/api/*) when running on Node
 * - Includes 1-Click WhatsApp Order Importer + Phone Order Creator
 * =========================================================================
 */

const ADMIN_LOCK_KEY = "nbs_aquaveda_admin_locked_v1";
const INQUIRIES_KEY = "nbs_aquaveda_inquiries_v1";
const CONTACTS_KEY = "nbs_aquaveda_contacts_v1";
const DELETED_ORDERS_KEY = "nbs_aquaveda_deleted_orders_v1";

// Cloud Realtime Sync Topics (Works globally across Netlify, Mobile, Localhost & Cloud)
const ORDERS_CLOUD_TOPIC = "https://ntfy.sh/nbs_aquaveda_live_orders_7355415447";
const INQUIRIES_CLOUD_TOPIC = "https://ntfy.sh/nbs_aquaveda_inquiries_7355415447";
const CONTACTS_CLOUD_TOPIC = "https://ntfy.sh/nbs_aquaveda_contacts_7355415447";

let adminOrders = [];
let adminProducts = [];
let adminInquiries = [];
let adminContacts = [];
let currentOrderStatusFilter = "all";
let isBackendOnline = false;

const API_BASE = window.APP_CONFIG?.API_CONFIG?.baseUrl || "/api";

function getDeletedOrderIds() {
  try {
    const raw = localStorage.getItem(DELETED_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function safeParseJson(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch (_) {
    try {
      const fixed = raw.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      return JSON.parse(fixed);
    } catch (e) {
      return null;
    }
  }
}

function playOrderAlertChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(987.77, now + 0.15);
    gain2.gain.setValueAtTime(0.22, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.log("Audio chime note:", e);
  }
}

function showAdminToast(msg) {
  const el = document.getElementById("adminToast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(window._adminToastTimer);
  window._adminToastTimer = setTimeout(() => {
    el.classList.remove("show");
  }, 3200);
}
window.showAdminToast = showAdminToast;

/**
 * =========================================================================
 * 1. ADMIN PIN LOCK / UNLOCK
 * =========================================================================
 */
function checkAdminSession() {
  const isLocked = sessionStorage.getItem(ADMIN_LOCK_KEY) === "true";
  const screen = document.getElementById("adminLoginScreen");
  if (isLocked && screen) {
    screen.classList.add("open");
  } else {
    if (screen) screen.classList.remove("open");
  }
  refreshAllAdminData();
}

function quickFillPin() {
  const input = document.getElementById("adminPinInput");
  if (input) {
    input.value = "7355";
    document.getElementById("adminLoginForm")?.requestSubmit();
  }
}
window.quickFillPin = quickFillPin;

async function handleAdminLogin(e) {
  e.preventDefault();
  const pin = document.getElementById("adminPinInput")?.value.trim();

  let valid = (pin === "7355" || pin === "admin123");
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) valid = true;
    }
  } catch (_) {}

  if (valid) {
    sessionStorage.removeItem(ADMIN_LOCK_KEY);
    document.getElementById("adminLoginScreen")?.classList.remove("open");
    showAdminToast("✅ Admin App Unlocked!");
    refreshAllAdminData();
  } else {
    showAdminToast("❌ Invalid PIN! Default PIN is 7355.");
  }
}

function logoutAdmin() {
  sessionStorage.setItem(ADMIN_LOCK_KEY, "true");
  document.getElementById("adminLoginScreen")?.classList.add("open");
  const input = document.getElementById("adminPinInput");
  if (input) input.value = "";
}
window.logoutAdmin = logoutAdmin;

/**
 * =========================================================================
 * 2. TAB NAVIGATION
 * =========================================================================
 */
function switchAdminTab(tabId, btnEl) {
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-tab-btn").forEach(b => b.classList.remove("active"));

  const target = document.getElementById(tabId);
  if (target) target.classList.add("active");
  if (btnEl) btnEl.classList.add("active");
}
window.switchAdminTab = switchAdminTab;

/**
 * =========================================================================
 * 3. DATA LOADING & SYNC
 * =========================================================================
 */
async function refreshAllAdminData(isManual = false) {
  if (isManual) showAdminToast("🔄 Syncing latest orders from Cloud & Server...");
  await Promise.all([
    loadAdminOrders(),
    loadAdminProducts(),
    loadAdminInquiries(),
    loadAdminContacts()
  ]);
  updateKpiStats();
  if (isManual) showAdminToast(`✅ Sync Complete: ${adminOrders.length} Order(s) Active`);
}
window.refreshAllAdminData = () => refreshAllAdminData(true);

function setConnectionStatus(online) {
  isBackendOnline = online;
  const textEl = document.getElementById("connectionText");
  const badgeEl = document.getElementById("connectionBadge");
  if (!textEl || !badgeEl) return;

  if (online) {
    textEl.textContent = "Live Cloud Sync";
    badgeEl.style.background = "rgba(16, 185, 129, 0.18)";
    badgeEl.style.color = "#34d399";
  } else {
    textEl.textContent = "App Active (Offline)";
    badgeEl.style.background = "rgba(245, 158, 11, 0.18)";
    badgeEl.style.color = "#f59e0b";
  }
}

function handleIncomingLiveOrder(newOrder) {
  if (!newOrder || !newOrder.orderId) return;

  const deletedIds = new Set(getDeletedOrderIds());
  if (deletedIds.has(newOrder.orderId)) return;

  const existingIdx = adminOrders.findIndex(o => o.orderId === newOrder.orderId);
  const isBrandNew = (existingIdx === -1);

  if (isBrandNew) {
    adminOrders.unshift(newOrder);
    playOrderAlertChime();
    showAdminToast(`🔔 Naya Order Aaya! #${newOrder.orderId} - ₹${newOrder.summary?.grandTotal || 0} (${newOrder.customer?.name || "Customer"})`);
  } else {
    adminOrders[existingIdx] = { ...adminOrders[existingIdx], ...newOrder };
    showAdminToast(`🔔 Order #${newOrder.orderId} status: ${newOrder.status}`);
  }

  try {
    localStorage.setItem(window.ORDERS_STORAGE_KEY || "nbs_raj_orders_history_v1", JSON.stringify(adminOrders));
  } catch (_) {}

  const countEl = document.getElementById("tabOrdersCount");
  if (countEl) countEl.textContent = adminOrders.length;

  renderAdminOrders();
  updateKpiStats();
}

let liveEventSource = null;
function setupRealtimePush() {
  if (typeof EventSource === "undefined") return;
  if (liveEventSource) {
    try { liveEventSource.close(); } catch (_) {}
  }

  try {
    liveEventSource = new EventSource(`${ORDERS_CLOUD_TOPIC}/sse`);
    liveEventSource.onopen = () => {
      console.log("🟢 Live Cloud Real-Time Push Connected!");
      setConnectionStatus(true);
    };
    liveEventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === "message" && payload.message) {
          const incomingOrder = safeParseJson(payload.message);
          if (incomingOrder && incomingOrder.orderId) {
            handleIncomingLiveOrder(incomingOrder);
          }
        }
      } catch (err) {
        console.log("SSE message parse note:", err);
      }
    };
    liveEventSource.onerror = () => {
      console.log("Cloud stream reconnecting...");
    };
  } catch (err) {
    console.log("SSE setup note:", err);
  }
}

function setupBroadcastChannel() {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const bc = new BroadcastChannel("nbs_aquaveda_orders_channel");
    bc.onmessage = (ev) => {
      if (ev.data && (ev.data.type === "NEW_ORDER" || ev.data.type === "ORDER_STATUS_UPDATE") && ev.data.order) {
        handleIncomingLiveOrder(ev.data.order);
      }
    };
  } catch (_) {}
}

async function loadAdminOrders() {
  const localOrders = window.getStoredOrders ? window.getStoredOrders() : [];
  const deletedIds = new Set(getDeletedOrderIds());
  let serverOrders = [];
  let cloudOrders = [];

  // 1. Fetch from Express Backend API
  try {
    const res = await fetch(`${API_BASE}/orders`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        serverOrders = data.orders;
        setConnectionStatus(true);
      }
    } else {
      setConnectionStatus(false);
    }
  } catch (_) {
    setConnectionStatus(false);
  }

  // 2. Fetch from Cloud Realtime Channel (since=all)
  try {
    const cloudRes = await fetch(`${ORDERS_CLOUD_TOPIC}/json?poll=1&since=all`, { cache: "no-store" });
    if (cloudRes.ok) {
      const text = await cloudRes.text();
      const lines = text.split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.event === "message" && entry.message) {
            const parsed = safeParseJson(entry.message);
            if (parsed && parsed.orderId) {
              cloudOrders.push(parsed);
            }
          }
        } catch (_) {}
      }
      setConnectionStatus(true);
    }
  } catch (err) {
    console.log("Cloud poll note:", err);
  }

  // 3. Merge all orders with smart deduplication
  const orderMap = new Map();

  // Cloud orders first
  cloudOrders.forEach(o => {
    if (o && o.orderId && !deletedIds.has(o.orderId)) {
      orderMap.set(o.orderId, o);
    }
  });

  // Server orders merge
  serverOrders.forEach(o => {
    if (o && o.orderId && !deletedIds.has(o.orderId)) {
      if (orderMap.has(o.orderId)) {
        orderMap.set(o.orderId, { ...orderMap.get(o.orderId), ...o });
      } else {
        orderMap.set(o.orderId, o);
      }
    }
  });

  // Local orders merge
  localOrders.forEach(loc => {
    if (loc && loc.orderId && !deletedIds.has(loc.orderId)) {
      if (!orderMap.has(loc.orderId)) {
        orderMap.set(loc.orderId, loc);
      } else {
        const existing = orderMap.get(loc.orderId);
        if (loc.updatedAt && (!existing.updatedAt || new Date(loc.updatedAt) > new Date(existing.updatedAt))) {
          orderMap.set(loc.orderId, { ...existing, ...loc });
        }
      }
    }
  });

  adminOrders = Array.from(orderMap.values()).sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
  );

  try {
    localStorage.setItem(window.ORDERS_STORAGE_KEY || "nbs_raj_orders_history_v1", JSON.stringify(adminOrders));
  } catch (_) {}

  const countEl = document.getElementById("tabOrdersCount");
  if (countEl) countEl.textContent = adminOrders.length;

  renderAdminOrders();
  updateKpiStats();
}

async function loadAdminProducts() {
  let prods = window.PRODUCTS || [];
  try {
    const res = await fetch(`${API_BASE}/products`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.products) && data.products.length > 0) {
        prods = data.products;
      }
    }
  } catch (_) {}

  adminProducts = prods;
  try {
    localStorage.setItem(window.PRODUCTS_STORAGE_KEY || "nbs_aquaveda_products_v1", JSON.stringify(adminProducts));
  } catch (_) {}

  const countEl = document.getElementById("tabProductsCount");
  if (countEl) countEl.textContent = adminProducts.length;

  renderAdminProducts();
}

async function loadAdminInquiries() {
  let localInq = [];
  try {
    localInq = JSON.parse(localStorage.getItem(INQUIRIES_KEY) || "[]");
  } catch (_) {}

  let serverInq = [];
  try {
    const res = await fetch(`${API_BASE}/bulk-inquiry`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.inquiries)) {
        serverInq = data.inquiries;
      }
    }
  } catch (_) {}

  let cloudInq = [];
  try {
    const cloudRes = await fetch(`${INQUIRIES_CLOUD_TOPIC}/json?poll=1&since=all`, { cache: "no-store" });
    if (cloudRes.ok) {
      const text = await cloudRes.text();
      const lines = text.split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.event === "message" && entry.message) {
            const parsed = safeParseJson(entry.message);
            if (parsed && parsed.id) cloudInq.push(parsed);
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  const map = new Map();
  cloudInq.forEach(i => map.set(i.id, i));
  serverInq.forEach(i => map.set(i.id, i));
  localInq.forEach(i => { if (!map.has(i.id)) map.set(i.id, i); });
  adminInquiries = Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
  );

  try {
    localStorage.setItem(INQUIRIES_KEY, JSON.stringify(adminInquiries));
  } catch (_) {}

  const countEl = document.getElementById("tabBulkCount");
  if (countEl) countEl.textContent = adminInquiries.length;

  renderAdminInquiries();
}

async function loadAdminContacts() {
  let localCon = [];
  try {
    localCon = JSON.parse(localStorage.getItem(CONTACTS_KEY) || "[]");
  } catch (_) {}

  let serverCon = [];
  try {
    const res = await fetch(`${API_BASE}/contact`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.contacts)) {
        serverCon = data.contacts;
      }
    }
  } catch (_) {}

  let cloudCon = [];
  try {
    const cloudRes = await fetch(`${CONTACTS_CLOUD_TOPIC}/json?poll=1&since=all`, { cache: "no-store" });
    if (cloudRes.ok) {
      const text = await cloudRes.text();
      const lines = text.split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.event === "message" && entry.message) {
            const parsed = safeParseJson(entry.message);
            if (parsed && parsed.id) cloudCon.push(parsed);
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  const map = new Map();
  cloudCon.forEach(c => map.set(c.id, c));
  serverCon.forEach(c => map.set(c.id, c));
  localCon.forEach(c => { if (!map.has(c.id)) map.set(c.id, c); });
  adminContacts = Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
  );

  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(adminContacts));
  } catch (_) {}

  const countEl = document.getElementById("tabContactsCount");
  if (countEl) countEl.textContent = adminContacts.length;

  renderAdminContacts();
}

function updateKpiStats() {
  const validOrders = adminOrders.filter(o => o.status !== "Cancelled");
  const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.summary?.grandTotal) || 0), 0);
  const pendingCount = adminOrders.filter(o => !["Delivered", "Cancelled"].includes(o.status)).length;
  const deliveredCount = adminOrders.filter(o => o.status === "Delivered").length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = adminOrders.filter(o => String(o.date).startsWith(todayStr)).length;

  const revEl = document.getElementById("kpiRevenue");
  const totEl = document.getElementById("kpiTotalOrders");
  const todEl = document.getElementById("kpiTodayOrders");
  const penEl = document.getElementById("kpiPending");
  const delEl = document.getElementById("kpiDelivered");

  if (revEl) revEl.textContent = `₹${totalRevenue.toLocaleString("en-IN")}`;
  if (totEl) totEl.textContent = adminOrders.length;
  if (todEl) todEl.textContent = `Today: ${todayCount} order(s)`;
  if (penEl) penEl.textContent = pendingCount;
  if (delEl) delEl.textContent = deliveredCount;
}

/**
 * =========================================================================
 * 4. LIVE ORDERS TAB RENDERING & ACTIONS
 * =========================================================================
 */
function setOrderStatusFilter(status, btnEl) {
  currentOrderStatusFilter = status;
  document.querySelectorAll("#orderStatusFilters .filter-chip").forEach(c => c.classList.remove("active"));
  if (btnEl) btnEl.classList.add("active");
  renderAdminOrders();
}
window.setOrderStatusFilter = setOrderStatusFilter;

function getStatusPillClass(status) {
  switch (status) {
    case "Order Placed": return "st-placed";
    case "Order Confirmed": return "st-confirmed";
    case "Preparing": return "st-preparing";
    case "Out for Delivery": return "st-out";
    case "Delivered": return "st-delivered";
    case "Cancelled": return "st-cancelled";
    default: return "st-placed";
  }
}

function renderAdminOrders() {
  const container = document.getElementById("adminOrdersContainer");
  if (!container) return;

  const query = (document.getElementById("orderSearchInput")?.value || "").trim().toLowerCase();

  const filtered = adminOrders.filter(o => {
    const matchesStatus = (currentOrderStatusFilter === "all") || (o.status === currentOrderStatusFilter);
    const matchesQuery = !query ||
      String(o.orderId).toLowerCase().includes(query) ||
      String(o.customer?.name || "").toLowerCase().includes(query) ||
      String(o.customer?.mobile || "").toLowerCase().includes(query) ||
      String(o.customer?.address || "").toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="toolbar-card" style="text-align: center; padding: 40px 20px;">
        <h3 style="color: var(--navy); margin-bottom: 6px;">No Matching Orders Found</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Click "📋 Paste WhatsApp Order" or "➕ Create Phone Order" to add a new order.</p>
      </div>
    `;
    return;
  }

  const statuses = ["Order Placed", "Order Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"];

  container.innerHTML = filtered.map(o => {
    const dt = new Date(o.date).toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });

    return `
      <div class="admin-order-card">
        <div class="order-top-bar">
          <div>
            <span class="order-id-badge">#${o.orderId}</span>
            <span class="order-time">🕒 ${dt}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">💳 ${o.paymentMethod || "COD"}</span>
            <span class="status-pill ${getStatusPillClass(o.status)}">${o.status}</span>
          </div>
        </div>

        <div class="order-body-cols">
          <div class="cust-box">
            <h4>👤 ${o.customer?.name || "Customer"}</h4>
            <p>📞 <strong>Mobile:</strong> <a href="tel:${o.customer?.mobile || ''}" style="color: var(--primary); font-weight: 700;">${o.customer?.mobile || "N/A"}</a></p>
            <p>📍 <strong>Address:</strong> ${o.customer?.address || ""}, ${o.customer?.city || ""} - <strong>${o.customer?.pincode || ""}</strong></p>
            ${o.customer?.instructions ? `<p style="color: #b45309; margin-top: 4px;">📝 <strong>Note:</strong> ${o.customer.instructions}</p>` : ""}
          </div>

          <div class="items-box">
            <h4 style="font-size: 0.9rem; color: var(--navy); margin-bottom: 6px;">🛒 Ordered Water Packs</h4>
            ${(o.items || []).map(item => `
              <div class="item-row">
                <span><strong>${item.quantity}x</strong> ${item.name} <small style="color: var(--text-muted);">(${item.packSize || ""})</small></span>
                <strong>₹${item.price * item.quantity}</strong>
              </div>
            `).join("")}
            <div class="order-total-banner">
              <span>Grand Total (incl. Delivery)</span>
              <span style="color: var(--primary-dark);">₹${o.summary?.grandTotal || 0}</span>
            </div>
          </div>
        </div>

        <div class="order-actions-bar">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <label style="font-size: 0.82rem; font-weight: 700; color: var(--navy);">Update Status:</label>
            <select class="status-select" onchange="updateOrderStatus('${o.orderId}', this.value)">
              ${statuses.map(st => `<option value="${st}" ${o.status === st ? "selected" : ""}>${st}</option>`).join("")}
            </select>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <a href="tel:${o.customer?.mobile || ''}" class="btn-act btn-call">📞 Call</a>
            <button type="button" class="btn-act btn-wa" onclick="sendWhatsAppStatusUpdate('${o.orderId}')">
              💬 WhatsApp Status Alert
            </button>
            <button type="button" class="btn-act btn-print" onclick="printOrderBill('${o.orderId}')">
              🖨️ Print Bill
            </button>
            <button type="button" class="btn-act btn-del" onclick="deleteOrder('${o.orderId}')">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}
window.renderAdminOrders = renderAdminOrders;

async function updateOrderStatus(orderId, newStatus) {
  const idx = adminOrders.findIndex(o => o.orderId === orderId);
  if (idx === -1) return;

  adminOrders[idx].status = newStatus;
  adminOrders[idx].updatedAt = new Date().toISOString();

  try {
    localStorage.setItem(window.ORDERS_STORAGE_KEY || "nbs_raj_orders_history_v1", JSON.stringify(adminOrders));
  } catch (_) {}

  // Broadcast updated order to Cloud Channel
  try {
    fetch(ORDERS_CLOUD_TOPIC, {
      method: "POST",
      headers: {
        "Title": `Order #${orderId}: ${newStatus}`,
        "Tags": "package,truck"
      },
      body: JSON.stringify(adminOrders[idx]),
      keepalive: true
    }).catch(() => {});
  } catch (_) {}

  // Broadcast to Cross-Tab Channel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("nbs_aquaveda_orders_channel");
      bc.postMessage({ type: "ORDER_STATUS_UPDATE", order: adminOrders[idx] });
      bc.close();
    }
  } catch (_) {}

  try {
    await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
  } catch (_) {}

  renderAdminOrders();
  updateKpiStats();
  showAdminToast(`✅ Order #${orderId} marked as "${newStatus}"!`);
}
window.updateOrderStatus = updateOrderStatus;

function sendWhatsAppStatusUpdate(orderId) {
  const order = adminOrders.find(o => o.orderId === orderId);
  if (!order) return;

  const rawPhone = String(order.customer?.whatsapp || order.customer?.mobile || "").replace(/\D/g, "");
  const cleanPhone = rawPhone.length === 10 ? "91" + rawPhone : rawPhone;

  const itemsList = (order.items || []).map(i => `• ${i.quantity}x ${i.name} (₹${i.price * i.quantity})`).join("\n");

  const statusEmoji = {
    "Order Placed": "📝",
    "Order Confirmed": "✅",
    "Preparing": "💧",
    "Out for Delivery": "🚚",
    "Delivered": "🎉",
    "Cancelled": "❌"
  }[order.status] || "📦";

  const msg =
`*NBS AQUAVEDA - ORDER STATUS UPDATE* ${statusEmoji}

Namaste *${order.customer?.name || "Customer"}* ji,
Aapke Drinking Water Order *#${order.orderId}* ka current status update:

*Current Status:* *${order.status.toUpperCase()}* ${statusEmoji}

*Order Items:*
${itemsList}
*Grand Total:* ₹${order.summary?.grandTotal || 0} (${order.paymentMethod || "COD"})

📍 *Delivery Address:* ${order.customer?.address || ""}, ${order.customer?.city || ""} - ${order.customer?.pincode || ""}

Thank you for choosing *NBS AQUAVEDA*!
📞 Support: +91 73554 15447
📍 Unchahar, Raebareli, UP - 229404`;

  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
}
window.sendWhatsAppStatusUpdate = sendWhatsAppStatusUpdate;

function printOrderBill(orderId) {
  const order = adminOrders.find(o => o.orderId === orderId);
  if (!order) return;

  const dt = new Date(order.date).toLocaleString("en-IN");
  const rowsHtml = (order.items || []).map((item, i) => `
    <tr>
      <td style="padding:8px; border-bottom:1px solid #ddd;">${i + 1}</td>
      <td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${item.name}</strong><br><small>${item.packSize || ""}</small></td>
      <td style="padding:8px; border-bottom:1px solid #ddd; text-align:center;">${item.quantity}</td>
      <td style="padding:8px; border-bottom:1px solid #ddd; text-align:right;">₹${item.price}</td>
      <td style="padding:8px; border-bottom:1px solid #ddd; text-align:right;"><strong>₹${item.price * item.quantity}</strong></td>
    </tr>
  `).join("");

  const win = window.open("", "_blank", "width=750,height=800");
  if (!win) {
    showAdminToast("Please allow popups to print the invoice.");
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice #${order.orderId} - NBS AQUAVEDA</title>
      <style>
        body { font-family: Arial, sans-serif; color: #0f172a; padding: 30px; max-width: 700px; margin: 0 auto; }
        .bill-header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 14px; margin-bottom: 20px; }
        .brand-title { font-size: 24px; font-weight: 900; color: #0284c7; margin: 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f1f5f9; padding: 10px 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }
        .tot-box { text-align: right; margin-top: 14px; font-size: 16px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="background:#0284c7; color:#fff; border:none; padding:10px 18px; border-radius:6px; font-weight:bold; cursor:pointer;">🖨️ Print Invoice / Save PDF</button>
      </div>
      <div class="bill-header">
        <div>
          <h1 class="brand-title">NBS AQUAVEDA</h1>
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">
            PURE • SAFE • HEALTHY PACKAGED DRINKING WATER<br>
            Plant: 229404 Unchahar, Raebareli, UP, India<br>
            Phone: +91 73554 15447 | Email: anujs58340@gmail.com
          </div>
        </div>
        <div style="text-align: right;">
          <h3 style="margin: 0; color: #0f172a;">DELIVERY INVOICE</h3>
          <div style="font-size: 13px; margin-top: 6px;">
            <strong>Order ID:</strong> #${order.orderId}<br>
            <strong>Date:</strong> ${dt}<br>
            <strong>Status:</strong> ${order.status}
          </div>
        </div>
      </div>

      <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px;">
        <strong>Customer Name:</strong> ${order.customer?.name || ""}<br>
        <strong>Mobile:</strong> ${order.customer?.mobile || ""}<br>
        <strong>Delivery Address:</strong> ${order.customer?.address || ""}, ${order.customer?.city || ""}, ${order.customer?.state || ""} - ${order.customer?.pincode || ""}
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Product Description</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Rate</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <div class="tot-box">
        <div>Subtotal: <strong>₹${order.summary?.subtotal || 0}</strong></div>
        <div>Delivery Charge: <strong>${order.summary?.isFreeDelivery ? "FREE" : "₹" + (order.summary?.deliveryFee || 0)}</strong></div>
        <div style="font-size: 20px; color: #0284c7; margin-top: 6px;">Grand Total: <strong>₹${order.summary?.grandTotal || 0}</strong></div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Payment Mode: ${order.paymentMethod || "COD"}</div>
      </div>

      <div style="margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 12px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
        <span>Thank you for choosing NBS AQUAVEDA!</span>
        <span>Authorized Signatory (NBS AQUAVEDA)</span>
      </div>
    </body>
    </html>
  `);
  win.document.close();
}
window.printOrderBill = printOrderBill;

async function deleteOrder(orderId) {
  if (!confirm(`Delete Order #${orderId}?`)) return;

  const deletedIds = getDeletedOrderIds();
  if (!deletedIds.includes(orderId)) {
    deletedIds.push(orderId);
    try {
      localStorage.setItem(DELETED_ORDERS_KEY, JSON.stringify(deletedIds));
    } catch (_) {}
  }

  adminOrders = adminOrders.filter(o => o.orderId !== orderId);
  try {
    localStorage.setItem(window.ORDERS_STORAGE_KEY || "nbs_raj_orders_history_v1", JSON.stringify(adminOrders));
  } catch (_) {}

  try {
    await fetch(`${API_BASE}/orders/${orderId}`, { method: "DELETE" });
  } catch (_) {}

  const countEl = document.getElementById("tabOrdersCount");
  if (countEl) countEl.textContent = adminOrders.length;

  renderAdminOrders();
  updateKpiStats();
  showAdminToast(`🗑️ Order #${orderId} deleted.`);
}
window.deleteOrder = deleteOrder;

/**
 * =========================================================================
 * 5. CREATE MANUAL ORDER & 1-CLICK WHATSAPP ORDER IMPORTER
 * =========================================================================
 */
function openNewOrderModal() {
  const select = document.getElementById("moProductSelect");
  if (select) {
    select.innerHTML = adminProducts.map(p =>
      `<option value="${p.id}">${p.name} (${p.packSize}) - ₹${p.price}</option>`
    ).join("");
  }
  document.getElementById("newOrderModal")?.classList.add("open");
}
window.openNewOrderModal = openNewOrderModal;

function closeNewOrderModal() {
  document.getElementById("newOrderModal")?.classList.remove("open");
}
window.closeNewOrderModal = closeNewOrderModal;

function openImportWhatsAppModal() {
  document.getElementById("importWhatsAppModal")?.classList.add("open");
}
window.openImportWhatsAppModal = openImportWhatsAppModal;

function closeImportWhatsAppModal() {
  document.getElementById("importWhatsAppModal")?.classList.remove("open");
}
window.closeImportWhatsAppModal = closeImportWhatsAppModal;

async function handleImportWhatsAppOrder(e) {
  e.preventDefault();
  const rawText = document.getElementById("waOrderPasteText")?.value.trim();
  if (!rawText) return;

  const extractField = (label) => {
    const regex = new RegExp(`${label}:\\*?\\s*(.+)`, "i");
    const m = rawText.match(regex);
    return m ? m[1].replace(/\*/g, "").trim() : "";
  };

  const orderId = extractField("Order ID") || ("NBS" + Math.floor(10000000 + Math.random() * 90000000));
  const name = extractField("Name") || "WhatsApp Customer";
  const mobile = extractField("Mobile") || "7355415447";
  const whatsapp = extractField("WhatsApp") || mobile;
  const address = extractField("Address") || "Unchahar, Raebareli";
  const city = extractField("City") || "Unchahar, Raebareli";
  const state = extractField("State") || "Uttar Pradesh";
  const pincode = extractField("Pincode") || "229404";
  const paymentMethod = extractField("Payment Method") || "Cash on Delivery";
  const instructions = extractField("Delivery Instructions") || "";

  // Parse item lines: • Name (Pack) | Qty: 2 | ₹100
  const itemLines = rawText.split("\n").filter(l => l.trim().startsWith("•"));
  const items = [];
  itemLines.forEach(line => {
    const m = line.match(/•\s*(.+?)\s*\((.+?)\)\s*\|\s*Qty:\s*(\d+)\s*\|\s*₹(\d+)/i);
    if (m) {
      const qty = parseInt(m[3], 10) || 1;
      const lineTotal = parseInt(m[4], 10) || 50;
      items.push({
        id: "nbs-wa-" + items.length,
        name: m[1].trim(),
        packSize: m[2].trim(),
        quantity: qty,
        price: Math.round(lineTotal / qty)
      });
    }
  });

  const gtMatch = rawText.match(/Grand Total:\*?\s*₹(\d+)/i);
  const stMatch = rawText.match(/Subtotal:\*?\s*₹(\d+)/i);
  const subtotal = stMatch ? parseInt(stMatch[1], 10) : items.reduce((s, i) => s + i.price * i.quantity, 0) || 100;
  const grandTotal = gtMatch ? parseInt(gtMatch[1], 10) : subtotal;

  if (items.length === 0) {
    items.push({
      id: "nbs-20l",
      name: "NBS AQUAVEDA Water Order",
      packSize: "Standard Pack",
      quantity: 1,
      price: grandTotal
    });
  }

  const importedOrder = {
    orderId,
    date: new Date().toISOString(),
    customer: { name, mobile, whatsapp, address, city, state, pincode, instructions },
    items,
    summary: {
      subtotal,
      deliveryFee: Math.max(0, grandTotal - subtotal),
      isFreeDelivery: (grandTotal - subtotal) <= 0,
      grandTotal,
      savings: 0
    },
    paymentMethod,
    status: "Order Confirmed"
  };

  adminOrders.unshift(importedOrder);
  try {
    localStorage.setItem(window.ORDERS_STORAGE_KEY || "nbs_raj_orders_history_v1", JSON.stringify(adminOrders));
  } catch (_) {}

  try {
    await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(importedOrder)
    });
  } catch (_) {}

  // Broadcast to Cloud Topic & Cross-Tab
  try {
    fetch(ORDERS_CLOUD_TOPIC, {
      method: "POST",
      headers: {
        "Title": `Imported Order: #${orderId} (Rs ${grandTotal})`,
        "Priority": "high",
        "Tags": "droplet,package"
      },
      body: JSON.stringify(importedOrder),
      keepalive: true
    }).catch(() => {});
  } catch (_) {}

  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("nbs_aquaveda_orders_channel");
      bc.postMessage({ type: "NEW_ORDER", order: importedOrder });
      bc.close();
    }
  } catch (_) {}

  closeImportWhatsAppModal();
  document.getElementById("importWhatsAppForm")?.reset();
  const countEl = document.getElementById("tabOrdersCount");
  if (countEl) countEl.textContent = adminOrders.length;

  renderAdminOrders();
  updateKpiStats();
  showAdminToast(`📥 WhatsApp Order #${orderId} Imported Successfully!`);
}

async function handleCreateManualOrder(e) {
  e.preventDefault();
  const name = document.getElementById("moCustName")?.value.trim();
  const mobile = document.getElementById("moCustMobile")?.value.trim();
  const address = document.getElementById("moCustAddress")?.value.trim();
  const prodId = document.getElementById("moProductSelect")?.value;
  const qty = Math.max(1, parseInt(document.getElementById("moProductQty")?.value, 10) || 1);
  const paymentMethod = document.getElementById("moPayment")?.value || "Cash on Delivery";
  const status = document.getElementById("moStatus")?.value || "Order Confirmed";

  const product = adminProducts.find(p => p.id === prodId) || adminProducts[0];
  if (!product) return;

  const subtotal = product.price * qty;
  const isFreeDelivery = subtotal >= 299;
  const deliveryFee = isFreeDelivery ? 0 : 30;
  const grandTotal = subtotal + deliveryFee;

  const newOrder = {
    orderId: "NBS" + Math.floor(10000000 + Math.random() * 90000000),
    date: new Date().toISOString(),
    customer: {
      name,
      mobile,
      whatsapp: mobile,
      address,
      city: "Unchahar, Raebareli",
      state: "Uttar Pradesh",
      pincode: "229404",
      instructions: "Phone / Walk-in Order"
    },
    items: [
      {
        id: product.id,
        name: product.name,
        packSize: product.packSize,
        price: product.price,
        quantity: qty,
        image: product.image
      }
    ],
    summary: {
      subtotal,
      deliveryFee,
      isFreeDelivery,
      grandTotal,
      savings: (product.oldPrice ? (product.oldPrice - product.price) * qty : 0)
    },
    paymentMethod,
    status
  };

  adminOrders.unshift(newOrder);
  try {
    localStorage.setItem(window.ORDERS_STORAGE_KEY || "nbs_raj_orders_history_v1", JSON.stringify(adminOrders));
  } catch (_) {}

  try {
    await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrder)
    });
  } catch (_) {}

  // Broadcast to Cloud Topic & Cross-Tab
  try {
    fetch(ORDERS_CLOUD_TOPIC, {
      method: "POST",
      headers: {
        "Title": `New Admin Order: #${newOrder.orderId} (Rs ${grandTotal})`,
        "Priority": "high",
        "Tags": "droplet,package"
      },
      body: JSON.stringify(newOrder),
      keepalive: true
    }).catch(() => {});
  } catch (_) {}

  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("nbs_aquaveda_orders_channel");
      bc.postMessage({ type: "NEW_ORDER", order: newOrder });
      bc.close();
    }
  } catch (_) {}

  closeNewOrderModal();
  document.getElementById("newAdminOrderForm")?.reset();
  const countEl = document.getElementById("tabOrdersCount");
  if (countEl) countEl.textContent = adminOrders.length;

  renderAdminOrders();
  updateKpiStats();
  showAdminToast(`✅ New Order #${newOrder.orderId} created!`);
}

/**
 * =========================================================================
 * 6. PRODUCTS & PRICING MANAGEMENT TAB
 * =========================================================================
 */
function renderAdminProducts() {
  const container = document.getElementById("adminProductsContainer");
  if (!container) return;

  container.innerHTML = adminProducts.map(p => `
    <div class="prod-admin-card">
      <div class="prod-admin-top">
        <img src="${p.image}" alt="${p.name}" class="prod-admin-img" />
        <div>
          <span style="font-size: 0.72rem; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 2px 8px; border-radius: 99px;">
            ${p.badge || p.category}
          </span>
          <h4 style="color: var(--navy); font-size: 1rem; margin-top: 4px;">${p.name}</h4>
          <p style="font-size: 0.82rem; color: var(--text-muted);">📦 ${p.packSize}</p>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: baseline; background: #f8fafc; padding: 10px 12px; border-radius: 10px;">
        <div>
          <span class="prod-price-big">₹${p.price}</span>
          ${p.oldPrice ? `<span class="prod-old-price">₹${p.oldPrice}</span>` : ""}
        </div>
        <span style="font-size: 0.78rem; font-weight: 700; color: var(--success);">● Active on Store</span>
      </div>

      <div style="display: flex; gap: 8px; margin-top: auto;">
        <button type="button" class="btn-act btn-primary-app" style="flex: 1; justify-content: center;" onclick="openProductModal('${p.id}')">
          ✏️ Edit Price / Pack
        </button>
        <button type="button" class="btn-act btn-del" onclick="deleteProduct('${p.id}')" title="Delete Product">
          🗑️
        </button>
      </div>
    </div>
  `).join("");
}

function openProductModal(productId = null) {
  const modal = document.getElementById("productEditModal");
  const title = document.getElementById("productModalTitle");
  const form = document.getElementById("productEditForm");
  if (!modal || !form) return;

  form.reset();

  if (productId) {
    const p = adminProducts.find(item => item.id === productId);
    if (!p) return;
    if (title) title.textContent = `Edit: ${p.name}`;
    document.getElementById("editProdId").value = p.id;
    document.getElementById("editProdName").value = p.name;
    document.getElementById("editProdPrice").value = p.price;
    document.getElementById("editProdOldPrice").value = p.oldPrice || p.price;
    document.getElementById("editProdPackSize").value = p.packSize;
    document.getElementById("editProdCategory").value = p.category || "bottles";
    document.getElementById("editProdBadge").value = p.badge || "";
    document.getElementById("editProdImage").value = p.image || "assets/images/bottle-1000ml.png";
    document.getElementById("editProdDesc").value = p.description || "";
  } else {
    if (title) title.textContent = "➕ Add New Water Pack";
    document.getElementById("editProdId").value = "";
  }

  modal.classList.add("open");
}
window.openProductModal = openProductModal;

function closeProductModal() {
  document.getElementById("productEditModal")?.classList.remove("open");
}
window.closeProductModal = closeProductModal;

async function handleSaveProduct(e) {
  e.preventDefault();
  const id = document.getElementById("editProdId")?.value.trim();
  const name = document.getElementById("editProdName")?.value.trim();
  const price = Number(document.getElementById("editProdPrice")?.value);
  const oldPrice = Number(document.getElementById("editProdOldPrice")?.value) || price;
  const packSize = document.getElementById("editProdPackSize")?.value.trim();
  const category = document.getElementById("editProdCategory")?.value;
  const badge = document.getElementById("editProdBadge")?.value.trim();
  const image = document.getElementById("editProdImage")?.value;
  const description = document.getElementById("editProdDesc")?.value.trim() || "Pure, safe and healthy packaged drinking water.";

  if (id) {
    const idx = adminProducts.findIndex(p => p.id === id);
    if (idx > -1) {
      adminProducts[idx] = {
        ...adminProducts[idx],
        name,
        price,
        oldPrice,
        packSize,
        category,
        badge,
        image,
        description
      };

      try {
        await fetch(`${API_BASE}/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(adminProducts[idx])
        });
      } catch (_) {}
    }
  } else {
    const newProd = {
      id: "nbs-" + Date.now(),
      name,
      shortName: name.slice(0, 18),
      category,
      packSize,
      price,
      oldPrice,
      image,
      badge: badge || "New Pack",
      inStock: true,
      description,
      features: ["100% Hygienic PET", "RO + UV + Ozonised"]
    };
    adminProducts.push(newProd);

    try {
      await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProd)
      });
    } catch (_) {}
  }

  try {
    localStorage.setItem(window.PRODUCTS_STORAGE_KEY || "nbs_aquaveda_products_v1", JSON.stringify(adminProducts));
  } catch (_) {}

  closeProductModal();
  const countEl = document.getElementById("tabProductsCount");
  if (countEl) countEl.textContent = adminProducts.length;
  renderAdminProducts();
  showAdminToast("💾 Product & Price saved!");
}

async function deleteProduct(productId) {
  if (!confirm("Delete this product from catalog?")) return;
  adminProducts = adminProducts.filter(p => p.id !== productId);
  try {
    localStorage.setItem(window.PRODUCTS_STORAGE_KEY || "nbs_aquaveda_products_v1", JSON.stringify(adminProducts));
  } catch (_) {}

  try {
    await fetch(`${API_BASE}/products/${productId}`, { method: "DELETE" });
  } catch (_) {}

  const countEl = document.getElementById("tabProductsCount");
  if (countEl) countEl.textContent = adminProducts.length;
  renderAdminProducts();
  showAdminToast("🗑️ Product removed.");
}
window.deleteProduct = deleteProduct;

async function resetDefaultProducts() {
  if (!confirm("Restore all 6 default NBS AQUAVEDA products & prices?")) return;
  adminProducts = [...(window.DEFAULT_PRODUCTS_LIST || [])];
  try {
    localStorage.setItem(window.PRODUCTS_STORAGE_KEY || "nbs_aquaveda_products_v1", JSON.stringify(adminProducts));
  } catch (_) {}

  for (const prod of adminProducts) {
    try {
      await fetch(`${API_BASE}/products/${prod.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prod)
      });
    } catch (_) {}
  }
  renderAdminProducts();
  showAdminToast("↺ Default 6 products restored!");
}
window.resetDefaultProducts = resetDefaultProducts;

/**
 * =========================================================================
 * 7. BULK INQUIRIES & CUSTOMER MESSAGES RENDERING
 * =========================================================================
 */
function renderAdminInquiries() {
  const container = document.getElementById("adminBulkContainer");
  if (!container) return;

  if (adminInquiries.length === 0) {
    container.innerHTML = `
      <div class="toolbar-card" style="text-align: center; padding: 36px;">
        <h4 style="color: var(--navy);">No Bulk Inquiries Yet</h4>
        <p style="font-size: 0.86rem; color: var(--text-muted);">When hotels, wedding organizers, or offices submit bulk requests, they appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = adminInquiries.map(inq => `
    <div class="admin-order-card">
      <div class="order-top-bar">
        <div>
          <span class="order-id-badge">${inq.orgType || "Bulk Inquiry"}</span>
          <strong style="margin-left: 8px; color: var(--navy);">${inq.orgName || ""}</strong>
        </div>
        <span class="order-time">${new Date(inq.timestamp || Date.now()).toLocaleString("en-IN")}</span>
      </div>
      <p style="font-size: 0.9rem; margin-bottom: 6px;">👤 <strong>Contact Person:</strong> ${inq.contactPerson || ""} | 📞 <strong>Phone:</strong> <a href="tel:${inq.phone}">${inq.phone}</a></p>
      <p style="font-size: 0.9rem; margin-bottom: 6px;">📦 <strong>Estimated Requirement:</strong> ${inq.estimatedQty || "Not specified"}</p>
      <p style="font-size: 0.9rem; background: #f8fafc; padding: 10px; border-radius: 8px;">📝 ${inq.requirements || ""}</p>
      <div style="display: flex; gap: 10px; margin-top: 12px;">
        <a href="tel:${inq.phone}" class="btn-act btn-call">📞 Call Client</a>
        <a href="https://wa.me/91${String(inq.phone || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Namaste ${inq.contactPerson}, regarding your Bulk Water Inquiry for ${inq.orgName} at NBS AQUAVEDA.`)}" target="_blank" class="btn-act btn-wa">💬 Send Quote on WhatsApp</a>
      </div>
    </div>
  `).join("");
}

function renderAdminContacts() {
  const container = document.getElementById("adminContactsContainer");
  if (!container) return;

  if (adminContacts.length === 0) {
    container.innerHTML = `
      <div class="toolbar-card" style="text-align: center; padding: 36px;">
        <h4 style="color: var(--navy);">No Support Messages Yet</h4>
        <p style="font-size: 0.86rem; color: var(--text-muted);">Customer contact form messages will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = adminContacts.map(c => `
    <div class="admin-order-card">
      <div class="order-top-bar">
        <div>
          <span class="order-id-badge">${c.subject || "Inquiry"}</span>
          <strong style="margin-left: 8px; color: var(--navy);">${c.name || ""}</strong>
        </div>
        <span class="order-time">${new Date(c.timestamp || Date.now()).toLocaleString("en-IN")}</span>
      </div>
      <p style="font-size: 0.9rem; margin-bottom: 6px;">📞 <strong>Phone:</strong> <a href="tel:${c.phone}">${c.phone}</a> | ✉️ <strong>Email:</strong> ${c.email || "N/A"}</p>
      <p style="font-size: 0.9rem; background: #f8fafc; padding: 10px; border-radius: 8px;">💬 ${c.message || ""}</p>
      <div style="display: flex; gap: 10px; margin-top: 12px;">
        <a href="tel:${c.phone}" class="btn-act btn-call">📞 Call</a>
        <a href="https://wa.me/91${String(c.phone || '').replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Namaste ${c.name}, thank you for contacting NBS AQUAVEDA support.`)}" target="_blank" class="btn-act btn-wa">💬 Reply on WhatsApp</a>
      </div>
    </div>
  `).join("");
}

window.addEventListener("storage", (e) => {
  if (e.key === (window.ORDERS_STORAGE_KEY || "nbs_raj_orders_history_v1")) {
    loadAdminOrders();
    updateKpiStats();
    showAdminToast("🔔 New Order / Update synced!");
  }
});

function initAdminApp() {
  document.getElementById("adminLoginForm")?.addEventListener("submit", handleAdminLogin);
  document.getElementById("productEditForm")?.addEventListener("submit", handleSaveProduct);
  document.getElementById("newAdminOrderForm")?.addEventListener("submit", handleCreateManualOrder);
  document.getElementById("importWhatsAppForm")?.addEventListener("submit", handleImportWhatsAppOrder);
  checkAdminSession();
  setupRealtimePush();
  setupBroadcastChannel();
  setInterval(() => {
    loadAdminOrders();
  }, 5000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAdminApp);
} else {
  initAdminApp();
}
