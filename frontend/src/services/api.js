import axios from 'axios';

const RAW_API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const nextConfig = { ...config, headers: { ...(config.headers || {}) } };

    try {
      const stored = localStorage.getItem('auth-store');
      if (stored) {
        const parsed = JSON.parse(stored);
        const token = parsed?.state?.accessToken;

        if (token && !nextConfig.headers.Authorization) {
          nextConfig.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      localStorage.removeItem('auth-store');
    }

    return nextConfig;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config || {};

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const stored = localStorage.getItem('auth-store');
        const parsed = JSON.parse(stored);
        const refreshToken = parsed?.state?.refreshToken;

        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );

        parsed.state.accessToken = data.accessToken;
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