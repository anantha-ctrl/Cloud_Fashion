# Cloud Fashion — API Reference

Base URL: `http://localhost/CloudFashion/backend`
All responses: `{ "success": bool, "message": string, "data": any }`
Auth: send `Authorization: Bearer <token>` for protected routes.

---

## Auth
| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/api/auth/register` | – | `name, email, password, password_confirmation, phone?` |
| POST | `/api/auth/verify-otp` | – | `email, otp` → returns `{token, user}` |
| POST | `/api/auth/resend-otp` | – | `email` |
| POST | `/api/auth/login` | – | `email, password` → `{token, user}` |
| POST | `/api/auth/logout` | – | – |
| POST | `/api/auth/forgot-password` | – | `email` |
| POST | `/api/auth/reset-password` | – | `email, token, password, password_confirmation` |
| GET | `/api/auth/me` | ✓ | – |
| PUT | `/api/profile` | ✓ | `name, phone?` |
| PUT | `/api/profile/password` | ✓ | `current_password, password, password_confirmation` |

## Categories & Products
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/categories` | with `product_count` |
| GET | `/api/categories/{slug}` | |
| GET | `/api/products` | query: `search, category, brand, size, color, min_price, max_price, sort, page, per_page` |
| GET | `/api/products/featured\|trending\|new-arrivals\|best-sellers` | `?limit=` |
| GET | `/api/products/{slug}` | images, variants, sizes, colors |
| GET | `/api/products/{slug}/related` | |
| GET | `/api/products/{id}/reviews` | |
| POST | `/api/products/{id}/reviews` ✓ | `rating(1-5), title?, comment?` |

## Cart / Wishlist / Addresses (all ✓)
| Method | Endpoint | Body |
|---|---|---|
| GET/POST | `/api/cart` | POST: `product_id, variant_id?, quantity?` |
| PUT/DELETE | `/api/cart/{id}` | PUT: `quantity` |
| DELETE | `/api/cart` | clear |
| GET/POST | `/api/wishlist` | POST: `product_id` |
| DELETE | `/api/wishlist/{productId}` | |
| GET/POST | `/api/addresses` | |
| PUT/DELETE | `/api/addresses/{id}` | |

## Checkout / Orders (all ✓)
| Method | Endpoint | Body |
|---|---|---|
| POST | `/api/coupons/apply` | `code, subtotal` |
| POST | `/api/checkout/create-order` | `address_id, coupon_code?` → razorpay order |
| POST | `/api/checkout/verify` | `order_id, razorpay_*` (or `is_test`) |
| POST | `/api/orders/cod` | `address_id, coupon_code?` |
| GET | `/api/orders` · `/api/orders/{id}` | |
| PUT | `/api/orders/{id}/cancel` | restocks items |

## Misc
`POST /api/newsletter` · `POST /api/contact` · `GET/POST /api/recently-viewed`

## Admin (all require admin role)
| Method | Endpoint |
|---|---|
| GET | `/api/admin/dashboard` |
| GET | `/api/admin/reports/sales\|products\|customers` |
| GET/POST | `/api/admin/products` |
| PUT/DELETE | `/api/admin/products/{id}` |
| POST | `/api/admin/products/{id}/images` |
| GET | `/api/admin/inventory/low-stock` |
| POST/PUT/DELETE | `/api/admin/categories[/{id}]` |
| GET | `/api/admin/orders?status=` |
| PUT | `/api/admin/orders/{id}/status` |
| GET | `/api/admin/customers[/{id}]` |
| GET/POST/PUT/DELETE | `/api/admin/coupons[/{id}]` |

### Error codes
`401` unauthenticated · `403` forbidden / unverified email · `404` not found ·
`409` conflict (duplicate) · `422` validation (`errors` map) · `500` server error
