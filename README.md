# ☁️ Cloud Fashion

A complete, production-ready **single-vendor fashion e-commerce** web application with a premium, luxury UI — featuring a glassmorphism design, dark/light mode, full customer storefront, and a powerful admin dashboard.

**Stack:** React (Vite) + Tailwind CSS · PHP 8 (dependency-free) · MySQL/MariaDB · JWT + Email OTP · Cloudinary · Razorpay

---

## ✨ Features

### Customer
- **Auth** — Register, Login, Logout, **Email OTP verification**, Forgot/Reset password (JWT-based)
- **Home** — Hero slider, featured categories, new arrivals, trending, best sellers, promo banners
- **Catalog** — Search, filter (category, brand, size, color, price), sort (price/popularity/newest/rating), pagination
- **Product page** — Image gallery with **zoom**, specs, variants (size/color), stock, reviews & ratings, related products
- **Wishlist**, **Cart** (variant-aware, live totals, free-shipping threshold)
- **Checkout** — Address management, coupons, **Razorpay** online payment + **COD**
- **Orders** — History, detail with status timeline, cancel & auto-restock
- **Profile** — Edit details, change password, manage addresses
- Recently viewed, newsletter, contact, About/Privacy/Terms pages
- **Responsive** + **Dark/Light mode** + smooth Framer Motion animations

### Admin
- **Dashboard** — Sales/orders/customers/products cards, 6-month revenue chart, order status chart, recent orders
- **Products** — Full CRUD, multiple images (Cloudinary), variants, specifications
- **Categories**, **Coupons** (percentage/fixed, min order, expiry, usage limit)
- **Orders** — Filter by status, update lifecycle (pending → processing → packed → shipped → delivered / cancelled)
- **Inventory** — Low-stock & out-of-stock alerts
- **Customers** — List with spend, order history drill-down
- **Reports** — Sales (daily chart), top products, top customers

---

## 📁 Project Structure

```
CloudFashion/
├── database/
│   └── cloudfashion.sql          # Full schema + seed data
├── backend/                      # PHP API (front-controller, no Composer needed)
│   ├── bootstrap.php             # Loads env, core, autoloader
│   ├── index.php                 # Router + CORS
│   ├── routes.php                # All route definitions
│   ├── .env.example
│   ├── config/                   # env loader, PDO database
│   ├── core/                     # Response, Request, Jwt, Validator, Auth, Mailer, Cloudinary, Razorpay
│   └── controllers/              # Auth, Product, Cart, Order, Checkout, … + admin/
└── frontend/                     # React + Vite + Tailwind
    ├── src/
    │   ├── api/client.js          # Axios instance (JWT interceptor)
    │   ├── context/               # Auth, Cart, Wishlist, Theme
    │   ├── components/            # Navbar (mega menu), Footer, ProductCard, …
    │   ├── pages/                 # Home, Shop, ProductDetails, Cart, Checkout, Orders, auth/, static/
    │   └── admin/                 # AdminLayout, Dashboard, AdminProducts, …
    └── tailwind.config.js
```

---

## 🗄️ Database Tables

`users`, `auth_tokens`, `categories`, `products`, `product_images`, `product_variants`,
`addresses`, `wishlist`, `cart`, `coupons`, `orders`, `order_items`, `reviews`,
`recently_viewed`, `newsletter`.

---

## 🚀 Quick Start (XAMPP — Windows)

> Prerequisites: XAMPP (Apache + MySQL/MariaDB, PHP 8.1+), Node.js 18+.

### 1. Database
Start **Apache** and **MySQL** in the XAMPP Control Panel, then import the schema:

```bash
# from the project root
mysql -u root -p < database/cloudfashion.sql
# …or import database/cloudfashion.sql via phpMyAdmin (http://localhost/phpmyadmin)
```

This creates the `cloudfashion` database with sample products, categories, and two accounts:

| Role     | Email                       | Password   |
|----------|-----------------------------|------------|
| Admin    | `admin@cloudfashion.com`    | `Admin@123`|
| Customer | `customer@cloudfashion.com` | `Test@123` |

### 2. Backend
The project lives in `htdocs`, so Apache serves it automatically.

```bash
cd backend
cp .env.example .env          # then edit DB_PASS, JWT_SECRET, keys
```

API base URL: **`http://localhost/CloudFashion/backend`**
Test it: open `http://localhost/CloudFashion/backend/` → `{"success":true,...}`

> The backend is **dependency-free** — no Composer required. JWT, Cloudinary, Razorpay,
> and SMTP are all implemented with native PHP + cURL.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

`frontend/.env`:
```
VITE_API_URL=http://localhost/CloudFashion/backend
VITE_RAZORPAY_KEY=rzp_test_xxxxx   # optional
```

---

## 🔑 Configuration

Edit `backend/.env`:

| Variable | Purpose |
|---|---|
| `DB_*` | MySQL connection (default user `root`) |
| `JWT_SECRET` | **Change this** — signs all auth tokens |
| `MAIL_DRIVER` | `log` (writes OTPs to `backend/storage/mail.log`) or `smtp` |
| `SMTP_*` | SMTP creds (e.g. Gmail app password) when `MAIL_DRIVER=smtp` |
| `CLOUDINARY_*` | Image uploads (optional — falls back to provided URLs) |
| `RAZORPAY_*` | Payment gateway (optional — falls back to **test mode** that simulates success) |

### Graceful fallbacks (so the app works out-of-the-box)
- **No SMTP?** OTP & reset emails are written to `backend/storage/mail.log`.
- **No Cloudinary?** Image URLs you paste are stored directly.
- **No Razorpay?** Checkout runs in test mode and completes the order so the full flow is demoable.

---

## 🔌 API Overview

All responses follow `{ success, message, data }`. Protected routes need
`Authorization: Bearer <jwt>`. See **[backend/API.md](backend/API.md)** for the full reference.

```
POST   /api/auth/register            POST   /api/auth/verify-otp
POST   /api/auth/login               POST   /api/auth/forgot-password
GET    /api/products?search=&sort=   GET    /api/products/{slug}
GET    /api/categories               POST   /api/cart
POST   /api/checkout/create-order    POST   /api/checkout/verify
GET    /api/orders                   PUT    /api/orders/{id}/cancel
GET    /api/admin/dashboard          POST   /api/admin/products      (admin)
```

---

## 🛠️ Tech Notes
- **State management:** React Context API (Auth, Cart, Wishlist, Theme)
- **Routing:** React Router v6 with protected & admin-only routes
- **Charts:** Recharts · **Animations:** Framer Motion · **Icons:** Lucide
- **Security:** bcrypt password hashing, HS256 JWT, prepared statements (PDO), input validation, CORS, user-enumeration-safe password reset

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for production deployment.

---

## 📄 License
MIT — built as a complete reference implementation for Cloud Fashion.
