/**
 * =========================================================================
 * NBS RAJ WATER - EXPRESS.JS SERVER & REST API
 * =========================================================================
 * Serves static assets, provides REST endpoints for orders, inquiries,
 * and contact messages. Supports MongoDB with automatic graceful fallback
 * to local JSON storage so it works right out of the box in VS Code.
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

// Ensure data folder exists for local fallback storage
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const INQUIRIES_FILE = path.join(DATA_DIR, "inquiries.json");
const CONTACTS_FILE = path.join(DATA_DIR, "contacts.json");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (HTML, CSS, JS, Assets)
app.use(express.static(path.join(__dirname)));

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
  console.log("ℹ️ Standalone Mode: No MONGODB_URI specified. Operating with local JSON storage in ./data");
}

/**
 * Helper to read/write JSON storage
 */
function readJsonFile(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
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

/**
 * =========================================================================
 * REST API ROUTES
 * =========================================================================
 */

// 1. Health check & status
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    brand: "NBS RAJ WATER",
    timestamp: new Date().toISOString(),
    database: isMongoConnected ? "MongoDB" : "Local JSON Store"
  });
});

// 2. Fetch Products Catalog
app.get("/api/products", (req, res) => {
  const products = [
    { id: "nbs-250ml", name: "NBS RAJ WATER 250 ML", packSize: "48 Bottles", price: 200, oldPrice: 250 },
    { id: "nbs-500ml", name: "NBS RAJ WATER 500 ML", packSize: "24 + 1 Bottles", price: 135, oldPrice: 145 },
    { id: "nbs-1000ml", name: "NBS RAJ WATER 1 Litre", packSize: "15 + 1 Bottles", price: 130, oldPrice: 140 },
    { id: "nbs-2000ml", name: "NBS RAJ WATER 2 Litre", packSize: "9 + 1 Bottles", price: 180, oldPrice: 190 },
    { id: "nbs-20l", name: "NBS RAJ WATER 20 Litre", packSize: "For Home & Office", price: 50, oldPrice: 100 },
    { id: "nbs-bulk", name: "Bulk Water Pack", packSize: "Customizable Bulk Pack", price: 50, oldPrice: 75 }
  ];
  res.json({ success: true, products });
});

// 3. Create & Save New Order
app.post("/api/orders", async (req, res) => {
  try {
    const orderData = req.body;

    if (!orderData || !orderData.orderId || !orderData.customer || !orderData.items) {
      return res.status(400).json({ success: false, message: "Invalid order payload" });
    }

    if (isMongoConnected && OrderModel) {
      const newOrder = new OrderModel(orderData);
      await newOrder.save();
    } else {
      // Local JSON persistence
      const orders = readJsonFile(ORDERS_FILE, []);
      orders.unshift(orderData);
      writeJsonFile(ORDERS_FILE, orders);
    }

    console.log(`📦 New Order Received: #${orderData.orderId} - Total: ₹${orderData.summary?.grandTotal}`);
    res.status(201).json({ success: true, message: "Order stored successfully", orderId: orderData.orderId });
  } catch (err) {
    console.error("Order save error:", err);
    res.status(500).json({ success: false, message: "Server error saving order" });
  }
});

// 4. Retrieve All Orders
app.get("/api/orders", async (req, res) => {
  try {
    if (isMongoConnected && OrderModel) {
      const orders = await OrderModel.find().sort({ date: -1 }).limit(50);
      return res.json({ success: true, count: orders.length, orders });
    } else {
      const orders = readJsonFile(ORDERS_FILE, []);
      return res.json({ success: true, count: orders.length, orders });
    }
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ success: false, message: "Error retrieving orders" });
  }
});

// 5. Retrieve Single Order by ID
app.get("/api/orders/:id", async (req, res) => {
  try {
    const targetId = req.params.id;
    if (isMongoConnected && OrderModel) {
      const order = await OrderModel.findOne({ orderId: targetId });
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

// 6. Handle Bulk Inquiries
app.post("/api/bulk-inquiry", (req, res) => {
  try {
    const inquiry = {
      id: "BULK" + Date.now(),
      timestamp: new Date().toISOString(),
      ...req.body
    };
    const inquiries = readJsonFile(INQUIRIES_FILE, []);
    inquiries.unshift(inquiry);
    writeJsonFile(INQUIRIES_FILE, inquiries);

    console.log(`💼 Bulk Inquiry Received: ${inquiry.orgName} (${inquiry.contactPerson})`);
    res.status(201).json({ success: true, message: "Bulk inquiry recorded", id: inquiry.id });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error saving bulk inquiry" });
  }
});

// 7. Handle Customer Contact Submissions
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
    res.status(201).json({ success: true, message: "Contact message saved", id: contact.id });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error saving contact message" });
  }
});

// Catch-all route to serve index.html for single-page routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start Server
app.listen(PORT, () => {
  console.log(`
===========================================================
  💧 NBS RAJ WATER - Web Server Running Successfully!
===========================================================
  • Website URL:     http://localhost:${PORT}
  • REST API:        http://localhost:${PORT}/api/health
  • Products API:    http://localhost:${PORT}/api/products
  • Orders API:      http://localhost:${PORT}/api/orders
===========================================================
`);
});
