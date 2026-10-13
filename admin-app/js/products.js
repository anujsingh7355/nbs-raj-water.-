/**
 * =========================================================================
 * NBS AQUAVEDA - PRODUCT CATALOG & LIVE BACKEND SYNC
 * =========================================================================
 * Default 6 product packages with live synchronization from Express Backend
 * (/api/products) and localStorage fallback so Admin price/product edits
 * reflect immediately on the customer app.
 * =========================================================================
 */

const PRODUCTS_STORAGE_KEY = "nbs_aquaveda_products_v1";

const DEFAULT_PRODUCTS_LIST = [
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

// Load initial products from localStorage if customized, else default
function loadInitialProducts() {
  try {
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not read custom products from localStorage:", e);
  }
  return [...DEFAULT_PRODUCTS_LIST];
}

let PRODUCTS = loadInitialProducts();

// Helper functions for products
function getAllProducts() {
  return PRODUCTS.filter(p => p.inStock !== false);
}

function getProductById(id) {
  return PRODUCTS.find(product => product.id === id);
}

// Sync products from Express Backend API (/api/products)
async function syncProductsFromBackend() {
  try {
    const baseUrl = window.APP_CONFIG?.API_CONFIG?.baseUrl || "/api";
    const res = await fetch(`${baseUrl}/products`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.products) && data.products.length > 0) {
        PRODUCTS = data.products;
        window.PRODUCTS = PRODUCTS;
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(PRODUCTS));
        if (typeof window.renderProducts === "function") {
          window.renderProducts();
        }
      }
    }
  } catch (_) {
    // Running on static host without Node server — localStorage is already active
  }
}

// Listen for cross-tab Admin updates
window.addEventListener("storage", (e) => {
  if (e.key === PRODUCTS_STORAGE_KEY) {
    PRODUCTS = loadInitialProducts();
    window.PRODUCTS = PRODUCTS;
    if (typeof window.renderProducts === "function") {
      window.renderProducts();
    }
  }
});

// Global export
window.PRODUCTS = PRODUCTS;
window.DEFAULT_PRODUCTS_LIST = DEFAULT_PRODUCTS_LIST;
window.PRODUCTS_STORAGE_KEY = PRODUCTS_STORAGE_KEY;
window.getAllProducts = getAllProducts;
window.getProductById = getProductById;
window.syncProductsFromBackend = syncProductsFromBackend;

// Trigger background sync on page load
document.addEventListener("DOMContentLoaded", () => {
  syncProductsFromBackend();
});
