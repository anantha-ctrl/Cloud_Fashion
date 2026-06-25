import axios from 'axios';

// Resolve the API base URL:
//  - In production, set VITE_API_URL at build time to your real API domain.
//  - Otherwise, follow the host you're browsing from so it works on localhost
//    AND over the local network (e.g. http://192.168.1.20/CloudFashion/backend
//    when you open the site at http://192.168.1.20:5173 from a phone).
const apiBaseURL =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}/CloudFashion/backend`;

const api = axios.create({
  baseURL: apiBaseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Returns true only when the stored JWT is missing or its `exp` is in the past.
 * Used to decide whether a 401 is a genuine session expiry (log the user out)
 * versus a transient/server hiccup (keep the session — the token is still good).
 */
export function isTokenExpired() {
  const token = localStorage.getItem('cf_token');
  if (!token) return true;
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(part));
    // small skew allowance so we don't drop a session a second early
    return !payload.exp || payload.exp * 1000 < Date.now() - 5000;
  } catch {
    return true; // unparseable token = treat as expired
  }
}

// Normalize errors + handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    // Force a logout on a 401 when:
    //  - the token is actually expired/missing, OR
    //  - /auth/me itself is rejected (definitive "token invalid" signal), OR
    //  - any /api/admin/ call is rejected — admin routes require a valid admin
    //    token, so a 401 there always means a dead session. Logging out here
    //    redirects to /login instead of looping (e.g. the reports auto-refresh).
    // A stray 401 on a public/customer endpoint while the token still looks
    // valid is treated as transient, so customers aren't kicked out at random.
    const isAdminCall = url.includes('/api/admin/');
    if (status === 401 && !url.includes('/auth/login') && (isTokenExpired() || url.includes('/auth/me') || isAdminCall)) {
      localStorage.removeItem('cf_token');
      localStorage.removeItem('cf_user');
      // Tell AuthContext to clear React state; ProtectedRoute then redirects to /login.
      window.dispatchEvent(new Event('cf:logout'));
    }
    const message = error.response?.data?.message || 'Something went wrong';
    return Promise.reject({ ...error, message, errors: error.response?.data?.errors });
  }
);

export default api;
