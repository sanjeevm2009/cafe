import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, setInMemorySessionToken } from '../services/api';
import type { CartSummary, User, WebsiteSection } from '../types';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface AppContextValue {
  user: User | null;
  authLoading: boolean;
  cart: CartSummary;
  cartLoading: boolean;
  cmsSections: Record<string, WebsiteSection>;
  cmsLoading: boolean;
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  pushToast: (type: ToastMessage['type'], text: string) => void;
  dismissToast: (id: string) => void;
  refreshUser: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshContent: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeCartItem: (itemId: string) => Promise<void>;
  applyDiscountCode: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  setSessionUser: (user: User | null, token?: string | null) => void;
}

const emptyCart: CartSummary = {
  items: [],
  subtotalCents: 0,
  deliveryFeeCents: 0,
  discountCents: 0,
  discountCode: null,
  totalCents: 0,
  freeDeliveryThresholdCents: 3500,
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cart, setCart] = useState<CartSummary>(emptyCart);
  const [cartLoading, setCartLoading] = useState(false);
  const [cmsSections, setCmsSections] = useState<Record<string, WebsiteSection>>({});
  const [cmsLoading, setCmsLoading] = useState(true);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (type: ToastMessage['type'], text: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, text }]);
      setTimeout(() => dismissToast(id), 4500);
    },
    [dismissToast]
  );

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiRequest<{ user: User | null }>('/api/auth/me');
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      setCartLoading(true);
      const res = await apiRequest<{ cart: CartSummary }>('/api/cart');
      setCart(res.cart);
    } catch {
      // ignore initial failure
    } finally {
      setCartLoading(false);
    }
  }, []);

  const refreshContent = useCallback(async () => {
    try {
      setCmsLoading(true);
      const res = await apiRequest<{ sections: Record<string, WebsiteSection> }>('/api/content');
      setCmsSections(res.sections);
    } catch {
      // ignore
    } finally {
      setCmsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
    refreshCart();
    refreshContent();
  }, [refreshUser, refreshCart, refreshContent]);

  const setSessionUser = useCallback(
    (nextUser: User | null, token?: string | null) => {
      setUser(nextUser);
      if (token !== undefined) setInMemorySessionToken(token);
      refreshCart();
    },
    [refreshCart]
  );

  const addToCart = useCallback(
    async (productId: string, quantity = 1) => {
      try {
        const res = await apiRequest<{ cart: CartSummary }>('/api/cart/items', {
          method: 'POST',
          body: JSON.stringify({ productId, quantity }),
        });
        setCart(res.cart);
        setCartDrawerOpen(true);
        pushToast('success', 'Added to your bakery basket.');
      } catch (err: any) {
        pushToast('error', err.message || 'Unable to add item to basket.');
        throw err;
      }
    },
    [pushToast]
  );

  const updateCartItem = useCallback(
    async (itemId: string, quantity: number) => {
      try {
        const res = await apiRequest<{ cart: CartSummary }>(`/api/cart/items/${itemId}`, {
          method: 'PUT',
          body: JSON.stringify({ quantity }),
        });
        setCart(res.cart);
      } catch (err: any) {
        pushToast('error', err.message || 'Unable to update quantity.');
      }
    },
    [pushToast]
  );

  const removeCartItem = useCallback(
    async (itemId: string) => {
      try {
        const res = await apiRequest<{ cart: CartSummary }>(`/api/cart/items/${itemId}`, {
          method: 'DELETE',
        });
        setCart(res.cart);
        pushToast('info', 'Removed from your basket.');
      } catch (err: any) {
        pushToast('error', err.message || 'Unable to remove item.');
      }
    },
    [pushToast]
  );

  const applyDiscountCode = useCallback(
    async (code: string) => {
      try {
        const res = await apiRequest<{ cart: CartSummary }>('/api/cart/discount', {
          method: 'POST',
          body: JSON.stringify({ code }),
        });
        setCart(res.cart);
        pushToast('success', code ? `Code ${code.toUpperCase()} applied.` : 'Discount code cleared.');
      } catch (err: any) {
        pushToast('error', err.message || 'Invalid discount code.');
        throw err;
      }
    },
    [pushToast]
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      setInMemorySessionToken(null);
      setUser(null);
      refreshCart();
      pushToast('info', 'Signed out of Maison Crumb.');
    }
  }, [pushToast, refreshCart]);

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        cart,
        cartLoading,
        cmsSections,
        cmsLoading,
        cartDrawerOpen,
        setCartDrawerOpen,
        searchOpen,
        setSearchOpen,
        toasts,
        pushToast,
        dismissToast,
        refreshUser,
        refreshCart,
        refreshContent,
        addToCart,
        updateCartItem,
        removeCartItem,
        applyDiscountCode,
        logout,
        setSessionUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
