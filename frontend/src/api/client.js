import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost/CloudFashion/backend',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize errors + handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    // Ignore 401s from the login call itself (those are just bad credentials).
    if (status === 401 && !url.includes('/auth/login')) {
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
