/**
 * =========================================================================
 * NBS RAJ WATER - CENTRAL CONFIGURATION FILE
 * =========================================================================
 * IMPORTANT: Configure your official WhatsApp business phone number,
 * brand details, delivery rules and payment options here.
 * =========================================================================
 */

// ==========================================
// 1. WHATSAPP CONFIGURATION (DO NOT HARDCODE ANYWHERE ELSE)
// Format: Country code followed by 10-digit number without '+' or '-'
// Example: "917355415447" for +91 73554 15447
// ==========================================
const WHATSAPP_NUMBER = "917355415447";

// ==========================================
// 2. BRAND & BUSINESS DETAILS
// ==========================================
const BRAND_CONFIG = {
  name: "NBS RAJ WATER",
  tagline: "Pure Water. Trusted Quality.",
  subheading: "Fresh, safe and reliable drinking water delivered to your doorstep.",
  phone: "+91 73554 15447",
  whatsappDisplay: "+91 73554 15447",
  email: "orders@nbsrajwater.com",
  address: "Plot No. 42, Water Purification Plant, Industrial Area, Sector 5, India",
  operatingHours: "Monday - Sunday: 7:00 AM - 9:00 PM",
  googleMapsUrl: "https://maps.google.com/?q=Packaged+Drinking+Water+Plant",
  upiId: "nbsrajwater@upi",
  supportPhone: "+91 73554 15447"
};

// ==========================================
// 3. DELIVERY & CHARGES SETTINGS
// ==========================================
const DELIVERY_CONFIG = {
  // Free delivery for orders reaching or exceeding this amount
  freeDeliveryThreshold: 299,
  // Standard delivery fee if under threshold
  standardDeliveryFee: 30,
  // Estimated delivery time text
  estimatedTime: "Delivered within 2 - 4 hours",
  // Available cities/delivery zones
  activeAreas: ["Local City Express Zone", "Residential Sectors", "Corporate Hubs"]
};

// ==========================================
// 4. ORDER STATUS DEFINITIONS
// ==========================================
const ORDER_STATUSES = [
  "Order Placed",
  "Order Confirmed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled"
];

// ==========================================
// 5. BACKEND API SETTINGS (OPTIONAL SYNC)
// ==========================================
const API_CONFIG = {
  baseUrl: window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1")
    ? window.location.origin + "/api"
    : "/api",
  enableBackendSync: true
};

// Export configuration globally for Vanilla JS
window.APP_CONFIG = {
  WHATSAPP_NUMBER,
  BRAND_CONFIG,
  DELIVERY_CONFIG,
  ORDER_STATUSES,
  API_CONFIG
};
