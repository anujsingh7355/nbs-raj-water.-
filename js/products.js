/**
 * =========================================================================
 * NBS RAJ WATER - PRODUCT CATALOG DATA
 * =========================================================================
 * All 6 requested product packages with exact prices, pack quantities,
 * discount calculations, images and features.
 * =========================================================================
 */

const PRODUCTS = [
  {
    id: "nbs-250ml",
    name: "NBS RAJ WATER 250 ML",
    shortName: "250 ML Pack",
    category: "bottles",
    packSize: "48 Bottles",
    price: 200,
    oldPrice: 250,
    image: "assets/images/bottle-250ml.svg",
    badge: "Special Saver",
    description: "Compact 250ml bottles, ideal for meetings, catering, conferences, parties, and everyday quick hydration.",
    features: ["48 Easy-Grip Bottles", "100% Recyclable Food Grade PET", "UV & Ozone Treated", "Hygienically Sealed"]
  },
  {
    id: "nbs-500ml",
    name: "NBS RAJ WATER 500 ML",
    shortName: "500 ML Pack",
    category: "bottles",
    packSize: "24 + 1 Bottles",
    price: 135,
    oldPrice: 145,
    image: "assets/images/bottle-500ml.svg",
    badge: "Extra +1 Free",
    description: "Convenient half-litre bottles. Perfect for personal travel, workouts, sports, and daily on-the-go pure hydration.",
    features: ["24 + 1 Extra Bottle Free", "Crystal Clear Mineral Balance", "BPA Free Packaging", "Tamper Evident Seal"]
  },
  {
    id: "nbs-1000ml",
    name: "NBS RAJ WATER 1 Litre",
    shortName: "1 Litre Pack",
    category: "bottles",
    packSize: "15 + 1 Bottles",
    price: 130,
    oldPrice: 140,
    image: "assets/images/bottle-1000ml.png",
    badge: "Customer Favorite",
    description: "Our signature 1-Litre daily hydration pack. Provides pure, balanced taste enriched with vital natural minerals.",
    features: ["15 + 1 Extra Bottle Free", "Essential Electrolytes", "Ergonomic Grip Bottle", "Zero Impurities"]
  },
  {
    id: "nbs-2000ml",
    name: "NBS RAJ WATER 2 Litre",
    shortName: "2 Litre Pack",
    category: "bottles",
    packSize: "9 + 1 Bottles",
    price: 180,
    oldPrice: 190,
    image: "assets/images/bottle-2000ml.svg",
    badge: "Family Value",
    description: "Generous 2-Litre bottle bundle suited for road trips, family dining tables, weekend getaways, and daily kitchen use.",
    features: ["9 + 1 Extra Bottle Free", "Heavy Duty PET Body", "Long Lasting Freshness", "Added Magnesium & Potassium"]
  },
  {
    id: "nbs-20l",
    name: "NBS RAJ WATER 20 Litre",
    shortName: "20 Litre Jar",
    category: "cans",
    packSize: "For Home & Office",
    price: 50,
    oldPrice: 100,
    image: "assets/images/can-20l.png",
    badge: "Best Seller (50% OFF)",
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
    image: "assets/images/bulk-pack.svg",
    badge: "Commercial / Events",
    description: "Special institutional & bulk water supply pack for weddings, hotels, corporate events, catering agencies, and retail shops.",
    features: ["Tiered Wholesale Rates", "Scheduled Periodic Supply", "Priority Free Transport", "Official GST Invoice Available"]
  }
];

// Helper functions for products
function getAllProducts() {
  return PRODUCTS;
}

function getProductById(id) {
  return PRODUCTS.find(product => product.id === id);
}

// Global export
window.PRODUCTS = PRODUCTS;
window.getAllProducts = getAllProducts;
window.getProductById = getProductById;
