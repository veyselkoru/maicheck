// src/lib/store.ts
import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: any | null;
  setAuth: (token: string, user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: (() => {
    const t = localStorage.getItem('maicheck_token');
    if (!t) return null;
    // Basic JWT shape check; clears previously corrupted values.
    if (t.split('.').length !== 3) {
      localStorage.removeItem('maicheck_token');
      localStorage.removeItem('maicheck_user');
      return null;
    }
    return t;
  })(),
  user: (() => { try { const u = localStorage.getItem('maicheck_user'); return u ? JSON.parse(u) : null; } catch { return null; } })(),
  setAuth: (token, user) => {
    localStorage.setItem('maicheck_token', token);
    localStorage.setItem('maicheck_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('maicheck_token');
    localStorage.removeItem('maicheck_user');
    set({ token: null, user: null });
  },
}));
