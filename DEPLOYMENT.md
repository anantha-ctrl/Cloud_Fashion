# Cloud Fashion — Deployment Guide

This covers local (XAMPP) setup and production deployment of the **PHP API** and the
**React frontend**.

---

## 1. Local Development (XAMPP)

1. Place the `CloudFashion` folder in `xampp/htdocs/` (already done if you see this).
2. Start **Apache** + **MySQL** from the XAMPP Control Panel.
3. Import the database, then apply the incremental migrations in order:
   - phpMyAdmin → Import → `database/cloudfashion.sql`, **or**
   - `mysql -u root -p < database/cloudfashion.sql`
   ```bash
   # apply every migration in order (002 → 016)
   for f in database/migration_*.sql; do mysql -u root -p cloudfashion < "$f"; done
   ```
   > The migrations add reviews moderation, returns, loyalty/referrals, the `settings`
   > key/value store, and the Contact Us inbox. Skipping them disables those features.
4. Backend config: copy `backend/.env.example` → `backend/.env`, set `DB_PASS` and a strong `JWT_SECRET`.
5. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
6. Visit `http://localhost:5190` (the dev port is pinned to **5190** via `strictPort` so the
   JWT in `localStorage` isn't lost to a drifting port). API is served by Apache at
   `http://localhost/CloudFashion/backend`.

> Apache must have `mod_rewrite` enabled (default in XAMPP) for the API's `.htaccess` routing.

---

## 2. Third-Party Services

### Email (OTP & password reset)
- **Dev:** `MAIL_DRIVER=log` → emails written to `backend/storage/mail.log`.
- **Prod (Gmail example):**
  ```
  MAIL_DRIVER=smtp
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=you@gmail.com
  SMTP_PASS=<16-char app password>   # Google Account → Security → App passwords
  MAIL_FROM=you@gmail.com
  ```

### Cloudinary (product images)
1. Create a free account at cloudinary.com.
2. Copy Cloud name, API Key, API Secret from the dashboard into `backend/.env`.
   Without it, image URLs are stored as-is (data-URIs are not persisted to a CDN).

### Razorpay (payments)
1. Sign up at razorpay.com → Settings → API Keys → generate **Test** keys.
2. Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `backend/.env`, and
   `VITE_RAZORPAY_KEY=rzp_test_xxx` in `frontend/.env`.
3. Test card: `4111 1111 1111 1111`, any future expiry, any CVV.
   Without keys, checkout runs in **test mode** and auto-completes orders.

### Google Sign-In (optional)
1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials**
   → **Create Credentials → OAuth client ID → Web application**.
2. Under **Authorized JavaScript origins** add your frontend origin
   (dev: `http://localhost:5190`; prod: `https://yourdomain.com`).
3. Paste the Client ID into **both**:
   ```
   backend/.env    GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   frontend/.env   VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   ```
4. Restart the dev server. Without a Client ID the button shows a "not configured" notice and the
   `POST /api/auth/google` endpoint returns 503. The backend validates the token's `aud` before
   creating/linking the user.

---

## 3. Production Deployment

### Backend (PHP) — shared host / VPS (Apache or Nginx)
1. Upload `backend/` and `database/` to the server.
2. Create the MySQL DB and import `cloudfashion.sql`.
2b. Apply the migrations after importing the base schema (see §1, step 3).
3. Create `backend/.env` with production values:
   - `APP_ENV=production`
   - real `DB_*`, strong `JWT_SECRET`, live SMTP/Cloudinary/Razorpay keys
   - `GOOGLE_CLIENT_ID` (if using Google Sign-In)
   - `FRONTEND_URL=https://yourdomain.com`
   > After deploy, set the store's public details, announcement bar, free-shipping
   > threshold, socials and loyalty rules from **Admin → Settings / Loyalty** (stored in DB).
4. Point a domain/subdomain (e.g. `api.yourdomain.com`) at the `backend/` directory.
5. **Apache:** ensure `AllowOverride All` so `.htaccess` works.
   **Nginx:** route all non-file requests to `index.php`:
   ```nginx
   location / {
     try_files $uri $uri/ /index.php?$query_string;
   }
   ```
6. Update the rewrite base in `backend/index.php` (`$base`) and `.htaccess`
   (`RewriteBase`) if the API is **not** under `/CloudFashion/backend`
   (e.g. at a domain root, set `$base = ''`).
7. Serve over **HTTPS** (Let's Encrypt). Lock down `.env` (deny web access).

### Frontend (React) — Netlify / Vercel / static host
1. Set the build-time env:
   ```
   VITE_API_URL=https://api.yourdomain.com
   VITE_RAZORPAY_KEY=rzp_live_xxx
   VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com   # if using Google Sign-In
   ```
2. Build:
   ```bash
   cd frontend
   npm install
   npm run build      # outputs to frontend/dist
   ```
3. Deploy the `dist/` folder. For SPA routing, add a redirect rule so all paths
   serve `index.html`:
   - **Netlify** `_redirects`: `/*  /index.html  200`
   - **Vercel**: handled automatically (or `vercel.json` rewrites).
4. In `backend/.env`, set `FRONTEND_URL` and ensure CORS allows your domain
   (the API echoes the request `Origin`; restrict it in `index.php` for production).

---

## 4. Production Checklist
- [ ] `APP_ENV=production` (hides error details)
- [ ] Strong, unique `JWT_SECRET`
- [ ] HTTPS on API and frontend
- [ ] Restrict CORS `Access-Control-Allow-Origin` to your domain
- [ ] Live Razorpay keys + webhook (optional) for payment reconciliation
- [ ] SMTP configured and deliverability tested
- [ ] All migrations (002 → 016) applied after the base schema
- [ ] Google OAuth origins updated to the production domain (if used)
- [ ] Store details / loyalty rules set in **Admin → Settings / Loyalty**
- [ ] Database backups scheduled
- [ ] Change default admin password after first login
- [ ] Deny direct web access to `backend/.env` and `backend/storage/`

---

## 5. Optional: Frontend bundle splitting
The build warns the main chunk is >500 kB (Recharts + Framer Motion). To reduce it,
add to `frontend/vite.config.js`:
```js
build: {
  rollupOptions: {
    output: { manualChunks: { charts: ['recharts'], motion: ['framer-motion'] } },
  },
},
```
