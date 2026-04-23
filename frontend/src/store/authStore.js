import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      isProfileLoading: false,
      notifications: [],
      notificationsLoading: false,

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      },

      setUser: (user) => set({ user, isAuthenticated: true }),

      fetchProfile: async () => {
        try {
          const { data } = await api.get('/api/auth/me');
          set({ user: data.user, isAuthenticated: true });
          return { success: true, user: data.user };
        } catch (err) {
          return {
            success: false,
            error:
              err.response?.data?.message ||
              err.response?.data?.error ||
              'Failed to fetch profile',
          };
        }
      },

      updateProfile: async ({ name, email }) => {
        const nextName = name?.trim();
        const nextEmail = email?.trim();

        if (!nextName || !nextEmail) {
          return {
            success: false,
            error: 'Name and email are required',
          };
        }

        set({ isProfileLoading: true });

        try {
          const { data } = await api.put('/api/auth/update-profile', {
            name: nextName,
            email: nextEmail,
          });

          set((state) => ({
            user: {
              ...(state.user || {}),
              ...data.user,
            },
          }));

          return {
            success: true,
            message: data.message || 'Profile updated successfully',
            user: data.user,
          };
        } catch (err) {
          return {
            success: false,
            error:
              err.response?.data?.message ||
              err.response?.data?.error ||
              err.message ||
              'Failed to update profile',
          };
        } finally {
          set({ isProfileLoading: false });
        }
      },

      fetchNotifications: async () => {
        set({ notificationsLoading: true });

        try {
          const { data } = await api.get('/api/notifications');
          set({ notifications: data.notifications || [] });
          return { success: true, notifications: data.notifications || [] };
        } catch (err) {
          return {
            success: false,
            error:
              err.response?.data?.message ||
              err.response?.data?.error ||
              'Failed to load notifications',
          };
        } finally {
          set({ notificationsLoading: false });
        }
      },

      markNotificationRead: async (notificationId) => {
        try {
          await api.patch(`/api/notifications/${notificationId}/read`);

          set((state) => ({
            notifications: state.notifications.map((notification) => (
              notification.id === notificationId
                ? { ...notification, is_read: true }
                : notification
            )),
          }));

          return { success: true };
        } catch (err) {
          return {
            success: false,
            error:
              err.response?.data?.message ||
              err.response?.data?.error ||
              'Failed to update notification',
          };
        }
      },

      login: async (emailOrCredentials, maybePassword) => {
        const credentials =
          typeof emailOrCredentials === 'object' && emailOrCredentials !== null
            ? emailOrCredentials
            : { email: emailOrCredentials, password: maybePassword };

        const email = credentials.email?.trim();
        const password = credentials.password;

        if (!email || !password) {
          return {
            success: false,
            error: 'Email and password are required',
          };
        }

        set({ isLoading: true });

        console.debug('[auth] login start', { email });

        try {
          const { data } = await api.post('/api/auth/login', { email, password });

          console.debug('[auth] login response', data);

          const accessToken =
            data.accessToken ||
            data.token ||
            data.tokens?.accessToken ||
            data.data?.accessToken;
          const refreshToken =
            data.refreshToken ||
            data.tokens?.refreshToken ||
            data.data?.refreshToken ||
            null;
          const user = data.user || data.data?.user || null;

          if (!accessToken) {
            throw new Error('No token received from server');
          }

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
          });

          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          return {
            success: true,
            user,
            accessToken,
            refreshToken,
          };

        } catch (err) {
          console.error('[auth] login failed', err);

          return {
            success: false,
            error:
              err.response?.data?.message ||
              err.response?.data?.error ||
              err.message ||
              'Login failed',
          };
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });

        try {
          const { data } = await api.post('/api/auth/register', {
            name,
            email,
            password,
          });

          return { success: true, user: data.user };

        } catch (err) {
          return {
            success: false,
            error:
              err.response?.data?.message ||
              err.response?.data?.error ||
              'Registration failed',
          };
        } finally {
          set({ isLoading: false });
        }
      },

      verifyOTP: async (email, otp) => {
        set({ isLoading: true });

        try {
          const { data } = await api.post('/api/auth/verify-otp', { email, otp });

          const accessToken = data.accessToken || data.token;

          set({
            accessToken,
            refreshToken: data.refreshToken || null,
            isAuthenticated: true,
          });

          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          // fetch user profile
          const profileRes = await api.get('/api/auth/me');

          set({ user: profileRes.data.user });

          return { success: true };

        } catch (err) {
          return {
            success: false,
            error:
              err.response?.data?.message ||
              err.response?.data?.error ||
              'Invalid OTP',
          };
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await api.post('/api/auth/logout');
        } catch {}

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          notifications: [],
        });

        delete api.defaults.headers.common['Authorization'];
        localStorage.removeItem('auth-store');
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          const { data } = await api.post('/api/auth/refresh', { refreshToken });

          const accessToken = data.accessToken || data.token;

          set({
            accessToken,
            refreshToken: data.refreshToken || null,
          });

          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          return true;

        } catch {
          get().logout();
          return false;
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;