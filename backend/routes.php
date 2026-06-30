<?php
/**
 * API route map.  $router is provided by index.php.
 * @var Router $router
 */

// Health check
$router->get('/', fn() => Response::success(['name' => 'Cloud Fashion API', 'version' => '1.0']));

// ---- Auth ----
$router->post('/api/auth/register',        'AuthController@register');
$router->post('/api/auth/verify-otp',      'AuthController@verifyOtp');
$router->post('/api/auth/resend-otp',      'AuthController@resendOtp');
$router->post('/api/auth/login',           'AuthController@login');
$router->post('/api/auth/google',          'AuthController@googleLogin');
$router->post('/api/auth/logout',          'AuthController@logout');
$router->post('/api/auth/forgot-password', 'AuthController@forgotPassword');
$router->post('/api/auth/reset-password',  'AuthController@resetPassword');
$router->get('/api/auth/me',               'AuthController@me');

// ---- Profile ----
$router->put('/api/profile',          'AuthController@updateProfile');
$router->put('/api/profile/password', 'AuthController@changePassword');

// ---- Categories ----
$router->get('/api/categories',        'CategoryController@index');
$router->get('/api/categories/{slug}', 'CategoryController@show');

// ---- Products ----
$router->get('/api/products',                 'ProductController@index');
$router->get('/api/products/featured',        'ProductController@featured');
$router->get('/api/products/trending',        'ProductController@trending');
$router->get('/api/products/new-arrivals',    'ProductController@newArrivals');
$router->get('/api/products/best-sellers',    'ProductController@bestSellers');
$router->get('/api/products/filters',         'ProductController@filters');
$router->get('/api/products/{slug}',          'ProductController@show');
$router->get('/api/products/{slug}/related',  'ProductController@related');
$router->get('/api/products/{slug}/frequently-bought', 'ProductController@frequentlyBought');

// ---- Reviews ----
$router->get('/api/products/{id}/reviews', 'ReviewController@index');
$router->post('/api/products/{id}/reviews','ReviewController@store');

// ---- Wishlist ----
$router->get('/api/wishlist',             'WishlistController@index');
$router->post('/api/wishlist',            'WishlistController@store');
$router->delete('/api/wishlist/{id}',     'WishlistController@destroy');

// ---- Cart ----
$router->get('/api/cart',          'CartController@index');
$router->post('/api/cart',         'CartController@store');
$router->put('/api/cart/{id}',     'CartController@update');
$router->delete('/api/cart/{id}',  'CartController@destroy');
$router->delete('/api/cart',       'CartController@clear');

// ---- Addresses ----
$router->get('/api/addresses',         'AddressController@index');
$router->post('/api/addresses',        'AddressController@store');
$router->put('/api/addresses/{id}',    'AddressController@update');
$router->delete('/api/addresses/{id}', 'AddressController@destroy');

// ---- Coupons ----
$router->post('/api/coupons/apply', 'CouponController@apply');

// ---- Checkout / Payment ----
$router->post('/api/checkout/create-order', 'CheckoutController@createOrder');
$router->post('/api/checkout/verify',       'CheckoutController@verify');

// ---- Orders ----
$router->get('/api/shipping-info',       'OrderController@shippingInfo');
$router->get('/api/orders',              'OrderController@index');
$router->get('/api/orders/{id}',         'OrderController@show');
$router->post('/api/orders/cod',         'OrderController@placeCod');
$router->put('/api/orders/{id}/cancel',  'OrderController@cancel');
$router->post('/api/orders/{id}/reorder','OrderController@reorder');
$router->post('/api/orders/{id}/return', 'ReturnController@request');
$router->get('/api/loyalty',             'LoyaltyController@index');

// ---- Misc ----
$router->post('/api/newsletter',         'MiscController@newsletter');
$router->post('/api/contact',            'MiscController@contact');
$router->get('/api/store-info',          'MiscController@storeInfo');
$router->get('/api/recently-viewed',     'MiscController@recentlyViewed');
$router->post('/api/recently-viewed',    'MiscController@trackView');
$router->get('/api/offers',              'MiscController@offers');
$router->get('/api/banners',             'MiscController@banners');
$router->post('/api/notify-stock',       'MiscController@notifyStock');

// ======================= ADMIN =======================
$router->get('/api/admin/dashboard',          'AdminDashboardController@stats');
$router->get('/api/admin/notifications',          'AdminDashboardController@notifications');
$router->post('/api/admin/notifications/state',   'AdminDashboardController@setNotificationState');
$router->post('/api/admin/notifications/read-all','AdminDashboardController@markAllRead');
$router->get('/api/admin/reports/sales',      'AdminReportController@sales');
$router->get('/api/admin/reports/products',   'AdminReportController@products');
$router->get('/api/admin/reports/customers',  'AdminReportController@customers');

$router->post('/api/admin/categories',        'AdminCategoryController@store');
$router->put('/api/admin/categories/{id}',    'AdminCategoryController@update');
$router->delete('/api/admin/categories/{id}', 'AdminCategoryController@destroy');

$router->get('/api/admin/products',           'AdminProductController@index');
$router->post('/api/admin/products',          'AdminProductController@store');
$router->post('/api/admin/products/bulk',     'AdminProductController@bulk');
$router->post('/api/admin/products/import',   'AdminProductController@import');
$router->put('/api/admin/products/{id}',      'AdminProductController@update');
$router->delete('/api/admin/products/{id}',   'AdminProductController@destroy');
$router->post('/api/admin/products/{id}/images', 'AdminProductController@uploadImages');
$router->get('/api/admin/inventory/low-stock','AdminProductController@lowStock');
$router->get('/api/admin/inventory',          'AdminProductController@inventory');
$router->put('/api/admin/inventory/{id}',     'AdminProductController@updateStock');

$router->get('/api/admin/orders',             'AdminOrderController@index');
$router->put('/api/admin/orders/{id}/status', 'AdminOrderController@updateStatus');

$router->get('/api/admin/customers',          'AdminCustomerController@index');
$router->get('/api/admin/customers/{id}',     'AdminCustomerController@show');

$router->get('/api/admin/banners',            'AdminBannerController@index');
$router->post('/api/admin/banners',           'AdminBannerController@store');
$router->put('/api/admin/banners/{id}',       'AdminBannerController@update');
$router->delete('/api/admin/banners/{id}',    'AdminBannerController@destroy');

$router->get('/api/admin/coupons',            'AdminCouponController@index');
$router->post('/api/admin/coupons',           'AdminCouponController@store');
$router->put('/api/admin/coupons/{id}',       'AdminCouponController@update');
$router->delete('/api/admin/coupons/{id}',    'AdminCouponController@destroy');

$router->get('/api/admin/reviews',            'AdminReviewController@index');
$router->put('/api/admin/reviews/{id}',       'AdminReviewController@update');
$router->delete('/api/admin/reviews/{id}',    'AdminReviewController@destroy');

$router->get('/api/admin/returns',            'AdminReturnController@index');
$router->put('/api/admin/returns/{id}',       'AdminReturnController@update');

$router->get('/api/admin/loyalty',             'AdminLoyaltyController@index');
$router->put('/api/admin/loyalty/settings',    'AdminLoyaltyController@saveSettings');
$router->get('/api/admin/loyalty/{id}',        'AdminLoyaltyController@show');
$router->post('/api/admin/loyalty/{id}/adjust','AdminLoyaltyController@adjust');

$router->get('/api/admin/messages',           'AdminContactController@index');
$router->put('/api/admin/messages/{id}',      'AdminContactController@update');
$router->delete('/api/admin/messages/{id}',   'AdminContactController@destroy');

$router->get('/api/admin/settings',           'AdminSettingsController@index');
$router->put('/api/admin/settings',           'AdminSettingsController@update');
