import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: (user: User) => {
    set({ user, isAuthenticated: true, isLoading: false });
  },
  logout: () => {
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
  setUser: (user: User) => set({ user, isAuthenticated: true }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  checkAuth: async () => {
    try {
      console.log('🔍 Checking authentication...');
      set({ isLoading: true });
      const { authApi } = await import('./auth-api');
      const user = await authApi.getMe();
      console.log('✅ Authentication successful:', user);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.log('❌ Authentication failed:', error);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
