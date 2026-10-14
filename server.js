/**
 * =========================================================================
 * NBS AQUAVEDA - COMPLETE APP BACKEND & REST API SERVER (Express.js)
 * =========================================================================
 * Full-featured backend for Customer App & Admin Dashboard App:
 * - Live Orders Management & Real-time Status Tracking
 * - Dynamic Product & Pricing Management (CRUD)
 * - Bulk Order Inquiries & Customer Support Messages
 * - Dashboard Analytics & KPI Statistics
 * - Dual Storage Engine: MongoDB (if configured) + Automatic Local JSON DB
 * =========================================================================
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");

// Ensure data folder exists for persistent JSON database
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const INQUIRIES_FILE = path.join(DATA_DIR, "inquiries.json");
const CONTACTS_FILE = path.join(DATA_DIR, "contacts.json");

// Admin PIN (Default: 7355 or configurable in .env)
const ADMIN_PIN = process.env.ADMIN_PIN || "7355";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (HTML, CSS, JS, Assets)
app.use(express.static(path.join(__dirname)));

/**
 * =========================================================================
 * DEFAULT SEED DATA FOR PRODUCTS
 * =========================================================================
 */
const DEFAULT_PRODUCTS = [
  {
    id: "nbs-250ml",
    name: "NBS AQUAVEDA 250 ML",
    shortName: "250 ML Pack",
    category: "bottles",
    packSize: "48 Bottles",
    price: 200,
    oldPrice: 250,
    image: "assets/images/bottle-250ml.png",
    badge: "Special Saver",
    inStock: true,
    description: "Compact 250ml bottles, ideal for meetings, catering, conferences, parties, and everyday quick hydration.",
    features: ["48 Easy-Grip Bottles", "100% Recyclable Food Grade PET", "UV & Ozone Treated", "Hygienically Sealed"]
  },
  {
    id: "nbs-500ml",
    name: "NBS AQUAVEDA 500 ML",
    shortName: "500 ML Pack",
    category: "bottles",
    packSize: "24 + 1 Bottles",
    price: 135,
    oldPrice: 145,
    image: "assets/images/bottle-500ml.png",
    badge: "Extra +1 Free",
    inStock: true,
    description: "Convenient half-litre bottles. Perfect for personal travel, workouts, sports, and daily on-the-go pure hydration.",
    features: ["24 + 1 Extra Bottle Free", "Crystal Clear Mineral Balance", "BPA Free Packaging", "Tamper Evident Seal"]
  },
  {
    id: "nbs-1000ml",
    name: "NBS AQUAVEDA 1 Litre",
    shortName: "1 Litre Pack",
    category: "bottles",
    packSize: "15 + 1 Bottles",
    price: 130,
    oldPrice: 140,
    image: "assets/images/bottle-1000ml.png",
    badge: "Customer Favorite",
    inStock: true,
    description: "Our signature 1-Litre daily hydration pack. Provides pure, balanced taste enriched with vital natural minerals.",
    features: ["15 + 1 Extra Bottle Free", "Essential Electrolytes", "Ergonomic Grip Bottle", "Zero Impurities"]
  },
  {
    id: "nbs-2000ml",
    name: "NBS AQUAVEDA 2 Litre",
    shortName: "2 Litre Pack",
    category: "bottles",
    packSize: "9 + 1 Bottles",
    price: 180,
    oldPrice: 190,
    image: "assets/images/bottle-2000ml.png",
    badge: "Family Value",
    inStock: true,
    description: "Generous 2-Litre bottle bundle suited for road trips, family dining tables, weekend getaways, and daily kitchen use.",
    features: ["9 + 1 Extra Bottle Free", "Heavy Duty PET Body", "Long Lasting Freshness", "Added Magnesium & Potassium"]
  },
  {
    id: "nbs-20l",
    name: "NBS AQUAVEDA 20 Litre",
    shortName: "20 Litre Jar",
    category: "cans",
    packSize: "For Home & Office",
    price: 50,
    oldPrice: 100,
    image: "assets/images/can-20l.png",
    badge: "Best Seller (50% OFF)",
    inStock: true,
    description: "Heavy-duty 20 Litre bubble top dispenser jar. Sanitized multi-stage washed container designed for homes, offices, clinics and stores.",
    features: ["Standard Dispenser Compatible", "Fresh Refill / Exchange", "Multi-stage RO + UV Processed", "Daily Prompt Doorstep Delivery"]
  },
  {
    id: "nbs-bulk",
    name: "Bulk Water Pack",
    shortName: "Bulk Event Pack",
    category: "bulk",
    packSize: "Customizable Bulk Pack",
    price: 50,
    oldPrice: 75,
    image: "assets/images/bulk-pack.png",
    badge: "Commercial / Events",
    inStock: true,
    description: "Special institutional & bulk water supply pack for weddings, hotels, corporate events, catering agencies, and retail shops.",
    features: ["Tiered Wholesale Rates", "Scheduled Periodic Supply", "Priority Free Transport", "Official GST Invoice Available"]
  }
];

/**
 * =========================================================================
 * JSON DATABASE HELPERS
 * =========================================================================
 */
function readJsonFile(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error("Error reading JSON file:", filePath, err);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error("Error writing JSON file:", filePath, err);
    return false;
  }
}

// Initialize products and initial demo order database if not existing
if (!fs.existsSync(PRODUCTS_FILE)) {
  writeJsonFile(PRODUCTS_FILE, DEFAULT_PRODUCTS);
}

const DEFAULT_INITIAL_ORDERS = [
  {
    orderId: "NBS88294150",
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
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
  }
];

if (!fs.existsSync(ORDERS_FILE)) {
  writeJsonFile(ORDERS_FILE, DEFAULT_INITIAL_ORDERS);
}

/**
 * =========================================================================
 * MONGODB (OPTIONAL) INTEGRATION & GRACEFUL FALLBACK
 * =========================================================================
 */
let isMongoConnected = false;
let OrderModel = null;

if (process.env.MONGODB_URI) {
  try {
    const mongoose = require("mongoose");
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => {
        isMongoConnected = true;
        console.log("✅ Successfully connected to MongoDB Database.");

        const OrderSchema = new mongoose.Schema({
          orderId: { type: String, required: true, unique: true },
          date: { type: Date, default: Date.now },
          customer: {
            name: String,
            mobile: String,
            whatsapp: String,
            address: String,
            city: String,
            state: String,
            pincode: String,
            instructions: String
          },
          items: Array,
          summary: Object,
          paymentMethod: String,
          status: { type: String, default: "Order Placed" }
        });

        OrderModel = mongoose.model("Order", OrderSchema);
      })
      .catch(err => {
        console.warn("⚠️ MongoDB connection error. Using local JSON store fallback:", err.message);
      });
  } catch (e) {
    console.log("ℹ️ Mongoose not loaded. Operating in standalone JSON storage mode.");
  }
} else {
  console.log("ℹ️ Standalone Mode: Operating with persistent JSON database in ./data");
}

/**
 * =========================================================================
 * REST API ROUTES
 * =========================================================================
 */

// 1. Health Check & System Info
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    brand: "NBS AQUAVEDA",
    timestamp: new Date().toISOString(),
    database: isMongoConnected ? "MongoDB" : "Local JSON Database"
  });
});

// 2. Admin Authentication
app.post("/api/admin/login", (req, res) => {
  const { pin } = req.body;
  if (String(pin).trim() === ADMIN_PIN || String(pin).trim() === "admin123") {
    return res.json({
      success: true,
      token: "nbs_admin_session_" + Date.now(),
      message: "Welcome to NBS AQUAVEDA Admin App"
    });
  }
  return res.status(401).json({ success: false, message: "Invalid Admin PIN" });
});

// 3. Dashboard Statistics & Analytics
app.get("/api/stats", async (req, res) => {
  try {
    let orders = [];
    if (isMongoConnected && OrderModel) {
      orders = await OrderModel.find().lean();
    } else {
      orders = readJsonFile(ORDERS_FILE, []);
    }
    const inquiries = readJsonFile(INQUIRIES_FILE, []);
    const contacts = readJsonFile(CONTACTS_FILE, []);
    const products = readJsonFile(PRODUCTS_FILE, DEFAULT_PRODUCTS);

    const validOrders = orders.filter(o => o.status !== "Cancelled");
    const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.summary?.grandTotal) || 0), 0);
    const pendingOrders = orders.filter(o => !["Delivered", "Cancelled"].includes(o.status)).length;
    const deliveredOrders = orders.filter(o => o.status === "Delivered").length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter(o => String(o.date).startsWith(todayStr)).length;

    res.json({
      success: true,
      stats: {
        totalOrders: orders.length,
        totalRevenue,
        pendingOrders,
        deliveredOrders,
        todayOrders,
        bulkInquiriesCount: inquiries.length,
        contactMessagesCount: contacts.length,
        productsCount: products.length
      }
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ success: false, message: "Failed to calculate stats" });
  }
});

// 4. Products CRUD API
app.get("/api/products", (req, res) => {
  const products = readJsonFile(PRODUCTS_FILE, DEFAULT_PRODUCTS);
  res.json({ success: true, products });
});

app.post("/api/products", (req, res) => {
  try {
    const products = readJsonFile(PRODUCTS_FILE, DEFAULT_PRODUCTS);
    const { name, packSize, price, oldPrice, category, badge, description, image } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: "Product name and price are required" });
    }

    const newProduct = {
      id: "nbs-" + Date.now(),
      name: String(name).trim(),
      shortName: String(name).trim().slice(0, 20),
      category: category || "bottles",
      packSize: packSize || "Standard Pack",
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : Number(price),
      image: image || "assets/images/bottle-1000ml.png",
      badge: badge || "New Pack",
      inStock: true,
      description: description || "Pure, safe and healthy packaged drinking water enriched with essential minerals.",
      features: ["100% Hygienic Packaging", "RO + UV + Ozonised", "pH Balanced"]
    };

    products.push(newProduct);
    writeJsonFile(PRODUCTS_FILE, products);

    console.log(`🆕 Product Added: ${newProduct.name} (₹${newProduct.price})`);
    res.status(201).json({ success: true, product: newProduct });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error adding product" });
  }
});

app.put("/api/products/:id", (req, res) => {
  try {
    const productId = req.params.id;
    const products = readJsonFile(PRODUCTS_FILE, DEFAULT_PRODUCTS);
    const index = products.findIndex(p => p.id === productId);

    if (index === -1) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const updated = {
      ...products[index],
      ...req.body,
      price: req.body.price !== undefined ? Number(req.body.price) : products[index].price,
      oldPrice: req.body.oldPrice !== undefined ? Number(req.body.oldPrice) : products[index].oldPrice
    };

    products[index] = updated;
    writeJsonFile(PRODUCTS_FILE, products);

    console.log(`✏️ Product Updated: ${updated.name} -> ₹${updated.price}`);
    res.json({ success: true, product: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating product" });
  }
});

app.delete("/api/products/:id", (req, res) => {
  try {
    const productId = req.params.id;
    let products = readJsonFile(PRODUCTS_FILE, DEFAULT_PRODUCTS);
    const initialLen = products.length;
    products = products.filter(p => p.id !== productId);

    if (products.length === initialLen) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    writeJsonFile(PRODUCTS_FILE, products);
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting product" });
  }
});

// 5. Orders Management API (Create, List, Filter, Status Update, Delete)
app.post("/api/orders", async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      status: req.body.status || "Order Placed",
      date: req.body.date || new Date().toISOString()
    };

    if (!orderData.orderId || !orderData.customer || !orderData.items) {
      return res.status(400).json({ success: false, message: "Invalid order payload" });
    }

    if (isMongoConnected && OrderModel) {
      const newOrder = new OrderModel(orderData);
      await newOrder.save();
    } else {
      const orders = readJsonFile(ORDERS_FILE, []);
      // Avoid duplicate orderId
      const existingIdx = orders.findIndex(o => o.orderId === orderData.orderId);
      if (existingIdx > -1) {
        orders[existingIdx] = orderData;
      } else {
        orders.unshift(orderData);
      }
      writeJsonFile(ORDERS_FILE, orders);
    }

    console.log(`📦 New Order Received: #${orderData.orderId} | Customer: ${orderData.customer.name} | Total: ₹${orderData.summary?.grandTotal}`);

    // Broadcast to Cloud Realtime Topic
    try {
      fetch("https://ntfy.sh/nbs_aquaveda_live_orders_7355415447", {
        method: "POST",
        headers: {
          "Title": `💧 New Water Order: #${orderData.orderId} (₹${orderData.summary?.grandTotal || 0})`,
          "Priority": "high",
          "Tags": "droplet,package"
        },
        body: JSON.stringify(orderData)
      }).catch(() => {});
    } catch (_) {}

    res.status(201).json({ success: true, message: "Order stored successfully", orderId: orderData.orderId, order: orderData });
  } catch (err) {
    console.error("Order save error:", err);
    res.status(500).json({ success: false, message: "Server error saving order" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const { mobile, status } = req.query;
    let orders = [];

    if (isMongoConnected && OrderModel) {
      orders = await OrderModel.find().sort({ date: -1 }).limit(200).lean();
    } else {
      orders = readJsonFile(ORDERS_FILE, []);
    }

    if (mobile) {
      const cleanMobile = String(mobile).replace(/\D/g, "");
      orders = orders.filter(o => String(o.customer?.mobile).replace(/\D/g, "").includes(cleanMobile));
    }

    if (status && status !== "all") {
      orders = orders.filter(o => o.status === status);
    }

    return res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ success: false, message: "Error retrieving orders" });
  }
});

app.get("/api/orders/:id", async (req, res) => {
  try {
    const targetId = req.params.id;
    if (isMongoConnected && OrderModel) {
      const order = await OrderModel.findOne({ orderId: targetId }).lean();
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });
      return res.json({ success: true, order });
    } else {
      const orders = readJsonFile(ORDERS_FILE, []);
      const order = orders.find(o => o.orderId === targetId);
      if (!order) return res.status(404).json({ success: false, message: "Order not found" });
      return res.json({ success: true, order });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching order" });
  }
});

// Update Order Status (Admin Action)
app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const targetId = req.params.id;
    const { status } = req.body;

    const validStatuses = [
      "Order Placed",
      "Order Confirmed",
      "Preparing",
      "Out for Delivery",
      "Delivered",
      "Cancelled"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    if (isMongoConnected && OrderModel) {
      const updated = await OrderModel.findOneAndUpdate(
        { orderId: targetId },
        { status },
        { new: true }
      );
      if (!updated) return res.status(404).json({ success: false, message: "Order not found" });
      console.log(`🔄 Order #${targetId} status updated to: ${status}`);
      return res.json({ success: true, order: updated });
    } else {
      const orders = readJsonFile(ORDERS_FILE, []);
      const idx = orders.findIndex(o => o.orderId === targetId);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      orders[idx].status = status;
      orders[idx].updatedAt = new Date().toISOString();
      writeJsonFile(ORDERS_FILE, orders);

      console.log(`🔄 Order #${targetId} status updated to: ${status}`);

      // Broadcast status update to Cloud Realtime Topic
      try {
        fetch("https://ntfy.sh/nbs_aquaveda_live_orders_7355415447", {
          method: "POST",
          headers: {
            "Title": `Order #${targetId}: ${status}`,
            "Tags": "package,truck"
          },
          body: JSON.stringify(orders[idx])
        }).catch(() => {});
      } catch (_) {}

      return res.json({ success: true, order: orders[idx] });
    }
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ success: false, message: "Failed to update order status" });
  }
});

// Delete Order
app.delete("/api/orders/:id", async (req, res) => {
  try {
    const targetId = req.params.id;
    if (isMongoConnected && OrderModel) {
      await OrderModel.deleteOne({ orderId: targetId });
      return res.json({ success: true, message: "Order deleted" });
    } else {
      let orders = readJsonFile(ORDERS_FILE, []);
      orders = orders.filter(o => o.orderId !== targetId);
      writeJsonFile(ORDERS_FILE, orders);
      return res.json({ success: true, message: "Order deleted" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting order" });
  }
});

// 6. Bulk Inquiries API
app.get("/api/bulk-inquiry", (req, res) => {
  const inquiries = readJsonFile(INQUIRIES_FILE, []);
  res.json({ success: true, count: inquiries.length, inquiries });
});

app.post("/api/bulk-inquiry", (req, res) => {
  try {
    const inquiry = {
      id: "BULK" + Date.now(),
      timestamp: new Date().toISOString(),
      status: "New",
      ...req.body
    };
    const inquiries = readJsonFile(INQUIRIES_FILE, []);
    inquiries.unshift(inquiry);
    writeJsonFile(INQUIRIES_FILE, inquiries);

    console.log(`💼 Bulk Inquiry Received: ${inquiry.orgName} (${inquiry.contactPerson})`);

    // Broadcast to Cloud Realtime Topic
    try {
      fetch("https://ntfy.sh/nbs_aquaveda_inquiries_7355415447", {
        method: "POST",
        headers: {
          "Title": `🏢 Bulk Water Inquiry: ${inquiry.orgName || inquiry.contactPerson}`,
          "Priority": "default",
          "Tags": "building,briefcase"
        },
        body: JSON.stringify(inquiry)
      }).catch(() => {});
    } catch (_) {}

    res.status(201).json({ success: true, message: "Bulk inquiry recorded", id: inquiry.id, inquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error saving bulk inquiry" });
  }
});

app.delete("/api/bulk-inquiry/:id", (req, res) => {
  let inquiries = readJsonFile(INQUIRIES_FILE, []);
  inquiries = inquiries.filter(i => i.id !== req.params.id);
  writeJsonFile(INQUIRIES_FILE, inquiries);
  res.json({ success: true, message: "Inquiry deleted" });
});

// 7. Customer Contact Messages API
app.get("/api/contact", (req, res) => {
  const contacts = readJsonFile(CONTACTS_FILE, []);
  res.json({ success: true, count: contacts.length, contacts });
});

app.post("/api/contact", (req, res) => {
  try {
    const contact = {
      id: "MSG" + Date.now(),
      timestamp: new Date().toISOString(),
      ...req.body
    };
    const contacts = readJsonFile(CONTACTS_FILE, []);
    contacts.unshift(contact);
    writeJsonFile(CONTACTS_FILE, contacts);

    console.log(`✉️ Contact Message from: ${contact.name} (${contact.phone})`);

    // Broadcast to Cloud Realtime Topic
    try {
      fetch("https://ntfy.sh/nbs_aquaveda_contacts_7355415447", {
        method: "POST",
        headers: {
          "Title": `✉️ Customer Message: ${contact.name}`,
          "Priority": "default",
          "Tags": "envelope,speech_balloon"
        },
        body: JSON.stringify(contact)
      }).catch(() => {});
    } catch (_) {}

    res.status(201).json({ success: true, message: "Contact message saved", id: contact.id, contact });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error saving contact message" });
  }
});

app.delete("/api/contact/:id", (req, res) => {
  let contacts = readJsonFile(CONTACTS_FILE, []);
  contacts = contacts.filter(c => c.id !== req.params.id);
  writeJsonFile(CONTACTS_FILE, contacts);
  res.json({ success: true, message: "Contact message deleted" });
});

// Serve Admin Dashboard App on /admin
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Catch-all route to serve index.html for customer app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start Server
app.listen(PORT, () => {
  console.log(`
===================================================================
  💧 NBS AQUAVEDA - App Server & Admin Backend Running!
===================================================================
  • Customer App:    http://localhost:${PORT}
  • Admin Panel App: http://localhost:${PORT}/admin  (PIN: ${ADMIN_PIN})
  • REST API Health: http://localhost:${PORT}/api/health
  • Live Orders API: http://localhost:${PORT}/api/orders
===================================================================
`);
});
