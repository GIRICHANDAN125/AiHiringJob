import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const nextConfig = {
      ...config,
      headers: {
        ...(config.headers || {}),
      },
    };

    try {
      const stored = localStorage.getItem('auth-store');
      if (stored) {
        const parsed = JSON.parse(stored);
        const accessToken = parsed?.state?.accessToken;

        if (accessToken && !nextConfig.headers.Authorization) {
          nextConfig.headers.Authorization = `Bearer ${accessToken}`;
        }
      }
    } catch (error) {
      console.warn('[api] Ignoring invalid persisted auth state:', error);
      localStorage.removeItem('auth-store');
    }

    if (import.meta.env.DEV) {
      console.debug('[api] request', {
        method: nextConfig.method,
        url: `${nextConfig.baseURL || API_BASE_URL}${nextConfig.url || ''}`,
      });
    }

    return nextConfig;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const requestUrl = originalRequest.url || '';
    const isAuthRoute = /\/auth\/(login|register|verify-otp|refresh)$/i.test(requestUrl);

    if (isAuthRoute) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const stored = localStorage.getItem('auth-store');
        if (!stored) throw new Error('No stored auth');

        const parsed = JSON.parse(stored);
        const refreshToken = parsed?.state?.refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
          { refreshToken }
        );

        // Update stored tokens
        parsed.state.accessToken = data.accessToken;
        parsed.state.refreshToken = data.refreshToken;
        localStorage.setItem('auth-store', JSON.stringify(parsed));

        api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return api(originalRequest);
      } catch {
        localStorage.removeItem('auth-store');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
