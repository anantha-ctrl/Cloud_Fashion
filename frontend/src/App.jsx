import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MobileTabBar from './components/MobileTabBar';
import WhatsAppButton from './components/WhatsAppButton';
import CompareBar from './components/CompareBar';
import ProtectedRoute from './components/ProtectedRoute';
import { Spinner } from './components/ui';

// Customer pages (lazy-loaded for a smaller initial bundle)
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Cart = lazy(() => import('./pages/Cart'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Compare = lazy(() => import('./pages/Compare'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const VerifyOtp = lazy(() => import('./pages/auth/VerifyOtp'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const About = lazy(() => import('./pages/static/About'));
const Contact = lazy(() => import('./pages/static/Contact'));
const Privacy = lazy(() => import('./pages/static/Privacy'));
const Terms = lazy(() => import('./pages/static/Terms'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin (split into its own chunks — Recharts only loads here)
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const Dashboard = lazy(() => import('./admin/Dashboard'));
const AdminProducts = lazy(() => import('./admin/AdminProducts'));
const AdminProductForm = lazy(() => import('./admin/AdminProductForm'));
const AdminCategories = lazy(() => import('./admin/AdminCategories'));
const AdminOrders = lazy(() => import('./admin/AdminOrders'));
const AdminCustomers = lazy(() => import('./admin/AdminCustomers'));
const AdminCoupons = lazy(() => import('./admin/AdminCoupons'));
const AdminInventory = lazy(() => import('./admin/AdminInventory'));
const AdminReports = lazy(() => import('./admin/AdminReports'));
const AdminBanners = lazy(() => import('./admin/AdminBanners'));
const AdminReviews = lazy(() => import('./admin/AdminReviews'));
const AdminReturns = lazy(() => import('./admin/AdminReturns'));
const AdminLoyalty = lazy(() => import('./admin/AdminLoyalty'));
const AdminMessages = lazy(() => import('./admin/AdminMessages'));
const AdminSettings = lazy(() => import('./admin/AdminSettings'));

const AUTH_ROUTES = ['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password'];

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  // Auth pages are a full-screen split — no storefront chrome around them.
  const isAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const bare = isAdmin || isAuth;

  return (
    <div className="flex min-h-screen flex-col">
      {!bare && <Navbar />}
      <main className="flex-1">
        <Suspense fallback={<Spinner className="min-h-[60vh]" />}>
        <Routes>
          {/* Customer */}
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/category/:slug" element={<Shop />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/order-success/:id" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Static */}
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="returns" element={<AdminReturns />} />
            <Route path="loyalty" element={<AdminLoyalty />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      {!bare && <Footer />}
      {!bare && <MobileTabBar />}
      {!bare && <WhatsAppButton />}
      {!bare && <CompareBar />}
    </div>
  );
}
