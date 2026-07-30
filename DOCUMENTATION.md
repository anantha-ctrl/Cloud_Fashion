# Novo Clothing — Complete Project Documentation

> A production-ready, single-vendor fashion e-commerce platform with an online
> storefront, a full admin panel, and an in-store billing / POS counter — built
> on **React (Vite)** + a **dependency-free PHP API** + **MySQL**.

This document explains the whole system **from scratch to the current state**:
what it is, how it is built, how to run it, every feature, the database, the API,
and the security model.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Project Structure](#4-project-structure)
5. [Getting Started (from scratch)](#5-getting-started-from-scratch)
6. [Configuration & Environment](#6-configuration--environment)
7. [Third-Party Services](#7-third-party-services)
8. [User Roles & Access Control](#8-user-roles--access-control)
9. [Database Schema](#9-database-schema)
10. [Features](#10-features)
11. [API Reference](#11-api-reference)
12. [Frontend Routes](#12-frontend-routes)
13. [Security](#13-security)
14. [Migrations](#14-migrations)
15. [Demo Credentials](#15-demo-credentials)
16. [Deployment](#16-deployment)

---

## 1. Overview

**Novo Clothing** is a complete fashion retail system with three faces:

| Face | Who uses it | What it does |
|------|-------------|--------------|
| **Storefront** | Customers | Browse, search, wishlist, cart, checkout (**UPI/QR** — admin-verified — or COD), track orders, loyalty points |
| **Admin Panel** | Store owner / admin | Products, categories, inventory, orders, invoices, billing, customers, coupons, banners, reviews, returns, loyalty, reports, settings |
| **Billing Counter (POS)** | Cashier / admin | In-store checkout — search/scan products, build a bill, take payment (cash / card / UPI / split), print invoice, auto-decrement stock |

Everything is **real-time and database-driven** — content (banners, categories,
brand name, logo, landing copy), catalogue, pricing, stock, and sales all live in
MySQL and are editable from the admin panel. There is no hardcoded dummy data on
the storefront.

**Current store mode:** the storefront is scoped to a **men-only catalogue**
(see [Storefront Scope](#106-storefront-scope-men-only-store)); other products
remain in the database and are fully manageable by admins.

---

## 2. Tech Stack

### Frontend
- **React 18** + **Vite** (dev server on a pinned port **5190**)
- **Tailwind CSS** (dual theme: default gold/ink + a "luxe" landing palette; dark mode)
- **React Router** for routing
- **Context API** for state — Auth, Cart, Wishlist, Theme, Compare, Store
- **Framer Motion** (animation), **Lenis** (smooth scroll), **Recharts** (admin charts)
- **lucide-react** (icons), **react-hot-toast** (notifications)
- **jsQR** (QR/barcode decode) + **qrcode** (product label generation)
- Fonts: **Playfair Display** (display) + **Inter** (body)

### Backend
- **PHP (dependency-free)** — no framework, no Composer packages
  - Hand-written **front-controller router** (`{param}` patterns + `Class@action`)
  - Manual **JWT** (HS256) authentication
  - **PDO** with prepared statements (MySQL)
  - Raw-socket **SMTP mailer** (OTP, password reset, order emails)
  - **Cloudinary** REST uploader (optional image CDN)
  - **Razorpay** REST integration (payments)
  - PSR-style **autoloader** for controllers/core classes

### Database
- **MySQL** (InnoDB, `utf8mb4`), database name `cloudfashion`

---

## 3. System Architecture

```
┌─────────────────────────┐         ┌──────────────────────────┐
│   React SPA (Vite)       │  HTTP   │   PHP API (front ctrl)    │
│  localhost:5190          │ ──────▶ │  /CloudFashion/backend    │
│                          │  JSON   │                           │
│  Context API state       │ ◀────── │  routes.php → Controllers │
│  axios client + JWT      │         │  Core: Auth/JWT/Mailer... │
└─────────────────────────┘         └────────────┬─────────────┘
                                                  │ PDO
                                                  ▼
                                         ┌──────────────────┐
                                         │  MySQL: cloudfashion │
                                         └──────────────────┘
```

- The frontend calls the API with a **Bearer JWT** (stored in `localStorage`).
- The API is stateless; every protected route validates the JWT and the user role.
- **All monetary figures (orders, bills) are recomputed server-side** from live DB
  prices so a tampered client can never change what is charged or what stock moves.
- Heavy inline base64 images are stripped from list responses and served via cached
  binary **passthrough endpoints** (`/api/products/{id}/thumb`,
  `/api/categories/{slug}/thumb`).

---

## 4. Project Structure

```
CloudFashion/
├── backend/
│   ├── index.php                 # Front controller (routing entry)
│   ├── bootstrap.php             # Env, autoloader, DB, error handling
│   ├── routes.php                # All API route definitions
│   ├── .env                      # Secrets & config (not committed)
│   ├── config/                   # env loader
│   ├── core/                     # Auth, Jwt, Mailer, Response, Request,
│   │                             #   Validator, Setting, Cloudinary, Razorpay
│   └── controllers/
│       ├── *.php                 # Storefront controllers
│       └── admin/*.php           # Admin/POS controllers
├── frontend/
│   ├── index.html
│   ├── public/                   # logo.png, manifest, service worker
│   └── src/
│       ├── App.jsx               # Routes + layout chrome logic
│       ├── main.jsx              # Context providers
│       ├── api/                  # axios client
│       ├── context/              # Auth, Cart, Wishlist, Theme, Store, Compare
│       ├── components/           # Navbar, Footer, Logo, ProductCard, ui...
│       ├── pages/                # Storefront + auth + static pages
│       ├── landing/              # Premium landing page + components
│       ├── admin/                # Admin panel + POS + Cashier layout
│       └── utils/                # format, invoice, csv helpers
└── database/
    ├── cloudfashion.sql          # Base schema + seed
    └── migration_002…024.sql     # Incremental schema updates
```

---

## 5. Getting Started (from scratch)

### Prerequisites
- **XAMPP** (Apache + MySQL) or equivalent PHP 8 + MySQL
- **Node.js** 18+ and npm

### Step-by-step

1. **Place the project** in `xampp/htdocs/CloudFashion`.
2. **Start Apache + MySQL** from the XAMPP control panel.
3. **Create the database & import the schema:**
   - phpMyAdmin → Import → `database/cloudfashion.sql`, **or**
   - `mysql -u root -p < database/cloudfashion.sql`
4. **Apply every migration in order (002 → 024):**
   ```bash
   for f in database/migration_*.sql; do mysql -u root -p cloudfashion < "$f"; done
   ```
   These add reviews, returns, loyalty, the `settings` store, the contact inbox,
   landing content, **billing/POS**, the **cashier** role, **split payment**, the
   **storefront scope**, and **UPI/QR online payment** with admin verification.
5. **Configure the backend:** copy `backend/.env.example` → `backend/.env` and set
   `DB_PASS` and a strong `JWT_SECRET`.
6. **Run the frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
7. **Open** `http://localhost:5190`. The API is served by Apache at
   `http://localhost/CloudFashion/backend`.

> Apache needs `mod_rewrite` (default in XAMPP) for the API's `.htaccess` routing.
> The dev port is pinned to **5190** so the JWT in `localStorage` isn't lost to a
> drifting port.

---

## 6. Configuration & Environment

`backend/.env` keys:

| Key | Purpose |
|-----|---------|
| `APP_ENV` | `development` or `production` |
| `DB_HOST` / `DB_NAME` / `DB_USER` / `DB_PASS` | MySQL connection |
| `JWT_SECRET` | Signing key for auth tokens (use a long random string) |
| `MAIL_DRIVER` | `log` (writes to `storage/mail.log`) or `smtp` |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM` | SMTP email delivery |
| `CLOUDINARY_*` | Optional image CDN (cloud name, key, secret) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payments |
| `GOOGLE_CLIENT_ID` | Optional Google Sign-In |
| `FRONTEND_URL` | Used in emails / CORS |

`frontend/.env`:

| Key | Purpose |
|-----|---------|
| `VITE_API_URL` | API base URL (prod) |
| `VITE_RAZORPAY_KEY` | Razorpay public key |
| `VITE_GOOGLE_CLIENT_ID` | Google Sign-In client ID |

**Admin-editable settings** (stored in the `settings` table, no redeploy needed):
brand name, logo, announcement bar, socials, contact details, free-shipping
threshold, loyalty rules, billing tax %/invoice prefix/footer, landing copy &
images, and the **storefront category scope**.

---

## 7. Third-Party Services

- **Email** — Dev writes to `backend/storage/mail.log`; production uses SMTP
  (e.g. Gmail app password). Powers OTP verification, password reset, order emails.
- **Cloudinary** (optional) — product/brand image hosting. Without it, images are
  stored inline and served via the cached passthrough endpoints.
- **Razorpay** — online payments. Without keys, checkout runs in **test mode** and
  auto-completes orders. Test card `4111 1111 1111 1111`.
- **Google Sign-In** (optional) — one-tap OAuth; the backend validates the token's
  `aud` before linking/creating the user.

---

## 8. User Roles & Access Control

`users.role` is an ENUM: **`customer` · `admin` · `cashier`**.

| Role | Can access |
|------|-----------|
| **customer** | Storefront, own profile/orders/wishlist/loyalty |
| **admin** | Everything — full admin panel + billing + all storefront |
| **cashier** | **Only** the billing counter (`/cashier`); every other route redirects back to `/cashier` |

Enforcement:
- **Backend** — `Auth::admin()` (admin only), `Auth::staff()` (admin **or** cashier,
  used by billing), `Auth::user()` (any logged-in user).
- **Frontend** — `ProtectedRoute` with a `roles` array; a global guard in `App.jsx`
  locks a logged-in cashier to `/cashier`.

---

## 9. Database Schema

**Core tables** (base schema):

| Table | Purpose |
|-------|---------|
| `users` | Accounts (customer/admin/cashier), loyalty points, referral code |
| `auth_tokens` | Email OTP + password-reset tokens |
| `categories` | Product categories (self-referencing parent) |
| `products` | Catalogue — price, mrp, stock, ratings, flags (featured/trending) |
| `product_images` | Product image gallery (Cloudinary or inline) |
| `product_variants` | Size / colour / SKU combos with stock |
| `addresses` | Customer shipping addresses |
| `wishlist` | Saved products |
| `cart` | Server-side cart items |
| `coupons` | Discount codes |
| `orders` | Online orders — totals, payment method (razorpay/cod/**upi**), status, shipping address (JSON), and (for UPI) proof/approval columns: `payment_txn_id`, `payment_screenshot`, `payment_approval`, `payment_note`, `payment_reviewed_at` |
| `order_items` | Line items snapshot per order |
| `reviews` | Product reviews (moderated) |
| `recently_viewed` | Per-user browsing history |
| `newsletter` | Newsletter subscribers |

**Added by migrations:**

| Table | Purpose |
|-------|---------|
| `settings` | Key/value store for all admin-editable config |
| `banners` | Landing/hero banners (admin-managed) |
| `loyalty_transactions` | Points ledger (earn / redeem / adjust) |
| `returns` | Return/refund requests |
| `contact_messages` | Contact-us inbox |
| `stock_notifications` | Back-in-stock requests |
| `notification_states` | Per-admin read/dismissed notification state |
| `bills` | **In-store bills** — subtotal, discount, tax, total, paid, change, payment method (cash/card/upi/split), split_cash, split_digital, status |
| `bill_items` | Line items per bill |

---

## 10. Features

### 10.1 Customer Storefront
- **Premium landing page** — 3D coverflow hero carousel, auto-sliding category /
  featured / best-seller carousels, all DB-driven; profile dropdown in the nav.
- Product listing with **live search, filters** (size/colour/price from real data),
  sort, and pagination.
- Product detail with image gallery, variants, related & frequently-bought items,
  reviews, and back-in-stock notify.
- **Wishlist**, **cart**, **compare**, **recently viewed**.
- Static pages: About, Contact, Terms, Privacy.

### 10.2 Authentication
- Email + password **registration with OTP verification**.
- **JWT** login with a sliding session; "remember me".
- **Password reset** by email token.
- **Google Sign-In** (optional).

### 10.3 Shopping & Checkout
- Address book, coupon application, shipping-fee / free-shipping threshold.
- **UPI / QR online payment** (admin-verified — see [10.10](#1010-online-payment-upiqr--verification)) + **Cash on Delivery**.
- Order tracking, cancel, reorder, and **return requests**.
- **Printable invoices** (open + print, "Save as PDF").

### 10.4 Loyalty Points
- Earn a % of each order as points (capped per order); redeem points at checkout
  up to a configurable share of the payable amount.
- Full points **history** on the customer's Rewards tab.
- Admin controls the rules live and can manually credit/debit points.
- *(The referral programme was removed; loyalty points remain.)*

### 10.5 Admin Panel
- **Dashboard** — combined online + counter KPIs (total sales, orders, customers,
  products, today's revenue, AOV, conversion), 6-month revenue chart, orders-by-status,
  top products, recent customers, live activity feed & notifications.
- **Products / Categories / Inventory** — full CRUD, bulk actions, CSV import,
  image upload, low-stock alerts, stock editing.
- **Orders** — list + status updates (with customer email notifications) + a
  **Payment Approvals** queue for UPI payments (see [10.10](#1010-online-payment-upiqr--verification)).
- **Invoices** — see [10.7](#107-unified-invoices).
- **Customers** — list with spend + order history; **export to CSV / Excel / PDF**.
- **Coupons, Banners, Reviews, Returns, Loyalty, Messages, Reports,
  Settings, Cashiers.**
- **Reports** — sales / top products / top customers over a date range, merging
  online orders + counter bills; CSV export.

### 10.6 Billing Counter (POS) & Cashier
- Product **search + live QR/barcode scan** (camera via jsQR) to build a bill.
- Discount (₹ or %), tax %, customer link, and payment: **cash / card / UPI / split**.
- **Split payment** — part cash + part card/UPI, validated to cover the total, with
  the breakdown stored and printed.
- Server recomputes all figures, **decrements live stock** (and `sold_count`) in a
  transaction, awards loyalty if a customer is linked, prints an invoice.
- **Void** a bill → restocks every item.
- **Cashier role** — a dedicated login that can reach **only** the billing counter.
- **Printable thermal receipt** — authentic 80mm monospace layout with the store
  **logo** header, dashed separators, item count, split-payment breakdown and cut line.
- **Product QR labels** — print a single product's label, **N copies** of one product,
  or **all products on one sheet** (bulk), scanned at the counter to add items instantly.

### 10.7 Unified Invoices
A single **Admin → Invoices** page lists **every sale in one place** — online orders
(`orders`) **and** counter bills (`bills`) — newest first, with:
- KPI row (total / online / counter / revenue),
- filter tabs (All / Online / Counter) + search,
- a **View** modal and **Print** for each, source-aware (online → order invoice,
  counter → bill invoice with split breakdown),
- a **delivery-verification QR** on every online invoice (see [10.11](#1011-invoice-verification-qr-delivery)),
- auto-refresh for real-time updates.

### 10.8 Branding (fully dynamic)
- Store **name** and **logo** are editable in Admin → Settings and reflect
  everywhere instantly (nav, footer, emails, invoices, thermal receipts, SEO, PWA manifest).
- Landing hero copy/eyebrow, announcement bar, socials, and contact details are all
  DB-driven.

### 10.9 Storefront Scope (men-only store)
- A single setting, **`storefront_category`**, limits the entire storefront
  (listings, collections, filters, product pages, nav categories) to one category +
  its children — currently **`men`**.
- Other products stay in the DB and remain fully manageable in the admin panel and
  sellable at the billing counter; they are simply hidden from shoppers.
- Enforced once in the backend (`ProductController` + `CategoryController`); the nav
  is category-driven so it follows automatically. Set the value empty to restore the
  full multi-category catalogue.

### 10.10 Online Payment (UPI/QR) & verification
A gateway-free online payment flow, verified by an admin:
- **Checkout** — choosing **Pay Online (UPI / QR)** shows, on the **left**, a
  **scannable UPI QR** generated client-side from a `upi://pay?...` intent that
  **encodes the exact payable amount** (or an admin-uploaded custom QR image), plus
  the UPI ID and optional bank account/IFSC (copy buttons). On the **right**, the
  customer's **name & phone are auto-filled** from the selected address, and they
  enter the **transaction / reference id** and upload a **payment screenshot**. The
  "Place Order" button unlocks only once both are provided.
- **Placement** — `POST /api/orders/upi` persists the order with
  `payment_method='upi'`, `payment_approval='pending'`, stores the txn id + screenshot
  (Cloudinary when configured, else inline), clears the cart, and **emails the admin**
  that a payment needs verification. **Stock is not moved yet.**
- **Approval** — Admin → Orders → **Payment Approvals** shows the proof. **Approve**
  (`PUT /api/admin/orders/{id}/payment`) sets it `paid`/`processing`, **commits stock
  + loyalty**, and emails the customer a confirmation. **Reject** marks it `failed`
  with a note and emails the customer (no stock was touched).
- **Settings** — UPI ID, payee name, custom QR image, and bank account/IFSC are
  edited in Admin → Settings. An **empty UPI ID disables** online payment (COD only),
  exposed publicly via `GET /api/payment-info`.

### 10.11 Invoice Verification QR (delivery)
Every printed **online** invoice (Admin → Invoices, or the customer's Order detail)
carries a QR that lets a courier confirm the parcel against the live order:
- **What it encodes** — a signed link `…/verify-order/{id}?t=<token>`, where `token`
  is an **HMAC** of the order id + number keyed by `JWT_SECRET`. It is tamper-proof
  and un-guessable, so it prevents order enumeration without needing a DB column.
- **On scan** — the public page `/verify-order/:id` calls
  `GET /api/orders/verify/{id}?t=…` (no login) and, if the token matches, shows a
  **"Order verified ✓"** card with the order number, status, payment, ship-to and the
  **item list + quantities** — all read **live from the DB**. An invalid/tampered
  token returns `403` and the page shows **"Not verified"**.
- **Generation** — the token is attached to the order responses
  (`GET /api/orders/{id}` and `GET /api/admin/invoices/order/{id}`) as `verify_token`;
  the invoice printer builds the QR from it client-side (`qrcode`), so no image is
  stored. Counter bills (no delivery) don't carry the QR.

---

## 11. API Reference

Base URL (local): `http://localhost/CloudFashion/backend`
All responses are JSON: `{ "success": bool, "message": string, "data": ... }`.
Protected routes require `Authorization: Bearer <jwt>`.

### Auth & Profile
```
POST   /api/auth/register            POST /api/auth/verify-otp
POST   /api/auth/resend-otp          POST /api/auth/login
POST   /api/auth/google              POST /api/auth/logout
POST   /api/auth/forgot-password     POST /api/auth/reset-password
GET    /api/auth/me
PUT    /api/profile                  PUT  /api/profile/password
```

### Catalogue (public)
```
GET /api/categories        GET /api/categories/{slug}      GET /api/categories/{slug}/thumb
GET /api/products          GET /api/products/{slug}        GET /api/products/{id}/thumb
GET /api/products/featured        /trending    /new-arrivals   /best-sellers   /filters
GET /api/products/{slug}/related          /frequently-bought
GET /api/products/{id}/reviews    POST /api/products/{id}/reviews
```

### Shopping (auth)
```
GET/POST/DELETE  /api/wishlist[/{id}]
GET/POST/PUT/DELETE  /api/cart[/{id}]
GET/POST/PUT/DELETE  /api/addresses[/{id}]
POST /api/coupons/apply
POST /api/checkout/create-order      POST /api/checkout/verify
GET  /api/orders    /api/orders/{id}    POST /api/orders/cod
POST /api/orders/upi                 (UPI/QR — submit txn id + screenshot → awaiting verification)
PUT  /api/orders/{id}/cancel   POST /api/orders/{id}/reorder   POST /api/orders/{id}/return
GET  /api/loyalty
```

**Public order verification** (no auth — scanned from the invoice QR):
```
GET  /api/orders/verify/{id}?t=<token>   → live order + items + ship-to; 403 if token invalid
```

### Misc (public)
```
GET  /api/store-info   /api/landing   /api/banners   /api/offers
GET  /api/payment-info (UPI id / payee / QR / bank details for checkout)
GET  /api/shipping-info    /api/recently-viewed   POST /api/recently-viewed
POST /api/newsletter   /api/contact   /api/notify-stock
```

### Admin (admin only, unless noted)
```
Dashboard   GET  /api/admin/dashboard   /api/admin/notifications
            POST /api/admin/notifications/state   /notifications/read-all
Reports     GET  /api/admin/reports/sales   /products   /customers
Products    GET/POST/PUT/DELETE /api/admin/products[/{id}]  + /bulk /import /{id}/images
Inventory   GET /api/admin/inventory  /low-stock   PUT /api/admin/inventory/{id}
Categories  GET /api/admin/categories   POST/PUT/DELETE /api/admin/categories[/{id}]  (GET is full/unscoped; supports parent nesting)
Orders      GET /api/admin/orders   PUT /api/admin/orders/{id}/status
            GET /api/admin/orders/{id}/payment   PUT /api/admin/orders/{id}/payment  (UPI proof · approve/reject)
Invoices    GET /api/admin/invoices   GET /api/admin/invoices/order/{id}
Customers   GET /api/admin/customers[/{id}]
Banners     GET/POST/PUT/DELETE /api/admin/banners[/{id}]
Coupons     GET/POST/PUT/DELETE /api/admin/coupons[/{id}]
Reviews     GET/PUT/DELETE /api/admin/reviews[/{id}]
Returns     GET/PUT /api/admin/returns[/{id}]
Loyalty     GET /api/admin/loyalty   PUT /api/admin/loyalty/settings
            GET /api/admin/loyalty/{id}   POST /api/admin/loyalty/{id}/adjust
Messages    GET/PUT/DELETE /api/admin/messages[/{id}]
Cashiers    GET/POST/PUT/DELETE /api/admin/staff[/{id}]
Settings    GET/PUT /api/admin/settings
```

### Billing / POS (admin **or** cashier — `Auth::staff`)
```
GET  /api/admin/billing/config           GET /api/admin/billing/products
GET  /api/admin/billing/lookup           GET /api/admin/billing/customer-lookup
GET  /api/admin/billing                  POST /api/admin/billing
GET  /api/admin/billing/{id}             PUT  /api/admin/billing/{id}/void
```

---

## 12. Frontend Routes

**Storefront:** `/` (landing) · `/home` · `/shop` · `/category/:slug` ·
`/product/:slug` · `/cart` · `/wishlist` · `/compare` · `/checkout` ·
`/orders` · `/orders/:id` · `/order-success/:id` · `/verify-order/:id` (public invoice QR) ·
`/profile` · `/about` · `/contact` · `/privacy` · `/terms`

**Auth:** `/login` · `/register` · `/verify-otp` · `/forgot-password` · `/reset-password`

**Cashier:** `/cashier` (billing counter only)

**Admin** (`/admin/*`): dashboard · products (+ new/edit) · categories · inventory ·
banners · orders · billing · invoices · returns · coupons · customers · reviews ·
loyalty · messages · cashiers · reports · settings

Admin, cashier, auth, landing, and the public verify-order pages render their own
chrome — the shared storefront navbar/footer are hidden there (the `bare` flag in `App.jsx`).

---

## 13. Security

- **JWT (HS256)** with a server secret; tokens carry `sub` (user id) + `role`.
- **Role gates** on every protected route (`Auth::admin` / `Auth::staff` / `Auth::user`).
- **PDO prepared statements** everywhere — no string-built SQL from user input.
- **Server-authoritative money & stock** — orders and bills are recomputed from live
  DB prices; stock changes run inside transactions.
- **Passwords** hashed with bcrypt.
- **OTP email verification** before an account is active.
- Cashier is **hard-locked** to the billing screen (client + server).
- Production checklist: `APP_ENV=production`, strong `JWT_SECRET`, HTTPS, restricted
  CORS origin, `.env`/`storage` denied to the web, DB backups, change default admin
  password.

> **Note:** never commit real secrets (`DB_PASS`, SMTP app password, API keys). Keep
> them only in `backend/.env`, and rotate them if the repo is ever made public.

---

## 14. Migrations

Apply after the base `cloudfashion.sql`, in order:

| File | Adds |
|------|------|
| 002–009 | Reviews, recently-viewed, coupons, wishlist/cart refinements, loyalty base |
| 010–012 | Loyalty points + (legacy) referral columns, transactions |
| 013–015 | Returns, stock notifications, contact inbox |
| 016 | `settings` store (brand, announcement, socials, free-shipping threshold) |
| 017 | Landing-page content settings |
| 018 | Notification states (per-admin) |
| 019 | Widen `settings.value` to `MEDIUMTEXT` (inline base64 logo/images) |
| 020 | **Billing / POS** — `bills` + `bill_items` + billing settings |
| 021 | **Cashier role** — `users.role` gains `cashier` |
| 022 | **Split payment** — billing `split` method (`split_cash` + `split_digital`) |
| 023 | **Storefront scope** — `storefront_category` (e.g. men-only store) |
| 024 | **UPI / QR payment** — `orders.payment_method` gains `upi` + proof/approval columns + UPI/bank payee settings |

---

## 15. Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@novoclothing.in` | `Admin@123` |
| Customer | `customer@novoclothing.in` | `Test@123` |
| Cashier | `cashier@novoclothing.in` | *(set in Admin → Cashiers)* |

> Change the default admin password after first login in production.

---

## 16. Deployment

See **`DEPLOYMENT.md`** for the full local (XAMPP) and production guide (shared
host / VPS for the PHP API + Netlify/Vercel/static host for the React build,
including Nginx rewrite rules, HTTPS, and CORS). In short:

1. Upload `backend/` + `database/`, import `cloudfashion.sql`, apply migrations 002→024.
2. Set production `backend/.env` (real DB, strong `JWT_SECRET`, live SMTP/Cloudinary/Razorpay).
3. Build the frontend (`npm run build`) with production `VITE_*` env and deploy `dist/`
   with an SPA redirect to `index.html`.
4. After deploy, set brand/logo, store details, loyalty & billing settings, the
   **UPI/QR payment details** (UPI ID, payee, QR, bank), and create cashier logins
   from the admin panel.

---

*Novo Clothing — single-vendor fashion e-commerce · React + dependency-free PHP + MySQL.*
