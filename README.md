# NBS RAJ WATER - Modern Drinking Water Delivery Platform

A complete, modern, professional drinking-water delivery website and application for **NBS RAJ WATER**. Inspired by top Indian packaged water brands, designed with clean original visuals, an interactive shopping cart, Indian phone and PIN code validation, WhatsApp click-to-chat order dispatching, order tracking ("My Orders"), and a Node.js + Express backend with optional MongoDB support.

---

## 🌟 Key Features

1. **Brand Identity**:
   - Original **NBS RAJ WATER** vector logo and custom illustrations for all bottle sizes.
   - Clean, trustworthy mineral water visual design (marine blue, cyan water, mint accents).

2. **Full Product Lineup**:
   - **250 ML** (Pack of 48 Bottles) - ₹200 (Old: ₹250)
   - **500 ML** (Pack of 24 + 1 Bottles) - ₹135 (Old: ₹145)
   - **1 Litre** (Pack of 15 + 1 Bottles) - ₹130 (Old: ₹140)
   - **2 Litre** (Pack of 9 + 1 Bottles) - ₹180 (Old: ₹190)
   - **20 Litre Dispenser Jar** (Home & Office) - ₹50 (Old: ₹100)
   - **Bulk Water Pack** (Events & Commercial) - ₹50

3. **Shopping Cart Engine**:
   - Quantity selector (+/-) on product cards.
   - **Add to Cart** with toast notifications (*does NOT trigger WhatsApp prematurely*).
   - Dynamic slide-out Cart Drawer with item count badge.
   - Automatic calculation of Subtotal, Free Delivery progress, and Grand Total.
   - Persistent cart state across page refreshes via `localStorage`.

4. **Checkout & Form Validation**:
   - Validates Full Name, Complete Address, City, State.
   - Validates 10-digit Indian mobile numbers (`^[6-9]\d{9}$`).
   - Validates 6-digit Indian PIN codes (`^[1-9][0-9]{5}$`).
   - Payment choices: Cash on Delivery (COD), UPI (GPay/PhonePe), Online Payment.

5. **WhatsApp Order System**:
   - Centralized WhatsApp business number in `js/config.js` (`const WHATSAPP_NUMBER = "917355415447"`).
   - Automatically generates the exact formatted order message:
     ```text
     NBS RAJ WATER - NEW ORDER

     Order ID: NBS12345678

     Customer Details:
     Name: ...
     Mobile: ...
     WhatsApp: ...
     Address: ...
     City: ...
     State: ...
     Pincode: ...

     Order Details:
     • ... x ... - ₹...

     Payment Method: ...

     Subtotal: ₹...
     Delivery Charge: ...
     Grand Total: ₹...

     Delivery Instructions: ...
     ```
   - Opens the WhatsApp click-to-chat URL with the complete payload.

6. **Order Confirmation & "My Orders" Tracking**:
   - Order Confirmed modal with unique Order ID and summary.
   - "My Orders" modal with 5-stage visual tracking stepper:
     `Order Placed` ➔ `Order Confirmed` ➔ `Preparing` ➔ `Out for Delivery` ➔ `Delivered`
   - One-click Re-Order and WhatsApp Order Support buttons.

7. **Bulk Orders & Inquiries**:
   - Dedicated section for Hotels, Restaurants, Offices, Events, and Institutions.
   - "Request Bulk Order" popup form with WhatsApp forwarding.

8. **Contact & Location**:
   - Phone, WhatsApp, Email, Plant Address, Delivery Hours, and Google Maps placeholder.

---

## 📱 How to Change the WhatsApp Number

To update your WhatsApp receiving number, open **`js/config.js`** in VS Code:

```javascript
// js/config.js (Line 15)
const WHATSAPP_NUMBER = "917355415447"; // Enter country code + 10-digit number
```
> Change this single variable and the entire site (Hero CTA, Product checkout, Bulk orders, Contact form, Floating button) will automatically use your new number!

---

## 🚀 How to Open and Run in VS Code

### Option 1: Quick Static Preview (Zero Installation)
1. Open the project folder in **Visual Studio Code**.
2. Right-click on `index.html` and choose **"Open with Live Server"** (or simply double-click `index.html` to open it in your browser).
3. The complete application, cart, validation, and WhatsApp ordering work immediately!

---

### Option 2: Full-Stack with Node.js + Express
1. Open VS Code Terminal (`Ctrl + ~` or `Terminal > New Terminal`).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser and visit:
   ```
   http://localhost:3000
   ```

---

## 🍃 MongoDB Support (Optional)

The application automatically runs in **standalone mode** using local JSON storage in `./data/orders.json` by default.

If you wish to use MongoDB:
1. Create a `.env` file in the root directory (copied from `.env.example`).
2. Add your MongoDB connection string:
   ```env
   MONGODB_URI=mongodb://localhost:27017/nbs_raj_water
   ```
3. When you run `npm start`, the server will automatically detect and connect to your MongoDB database!

---

## 📂 Project Structure

```
nbs raj/
│
├── index.html                   # Main single-page web app
├── package.json                 # Node dependencies and scripts
├── server.js                    # Express static server and REST API
├── .env.example                 # Environment variables sample
├── .gitignore                   # Git ignore file
├── README.md                    # Project documentation
│
├── assets/
│   ├── logo.svg                 # NBS RAJ WATER original vector logo
│   └── images/
│       ├── bottle-250ml.svg     # 250 ML Bottle illustration
│       ├── bottle-500ml.svg     # 500 ML Bottle illustration
│       ├── bottle-1000ml.svg    # 1 Litre Bottle illustration
│       ├── bottle-2000ml.svg    # 2 Litre Bottle illustration
│       ├── can-20l.svg          # 20 Litre Dispenser Jar illustration
│       ├── bulk-pack.svg        # Bulk Water Pack illustration
│       └── hero-water.svg       # Hero banner illustration
│
├── css/
│   ├── style.css                # Primary styles, water palette, responsive grid
│   └── animations.css           # Keyframe transitions, ripples, badges
│
└── js/
    ├── config.js                # Centralized WhatsApp number & settings
    ├── products.js              # Product catalog (all 6 items)
    ├── cart.js                  # Shopping cart engine & localStorage
    ├── checkout.js              # Form validation & WhatsApp order generator
    ├── orders.js                # "My Orders" tracking history
    └── app.js                   # Live search, filters, modals & toasts
```

---

## 🛡️ Validation & Security
- Form fields are validated on submit with clear inline feedback.
- Mobile numbers must be valid 10-digit Indian numbers (`^[6-9]\d{9}$`).
- PIN codes must be 6 digits (`^[1-9][0-9]{5}$`).
- Empty carts are blocked from checking out.
