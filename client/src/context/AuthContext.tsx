import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchApi, getStoredToken, setStoredToken, removeStoredToken } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  picture?: string | null;
  targetRole?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: () => void;
  loginWithMock: () => void;
  handleTokenReceived: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchApi<{ user: User }>('/api/auth/me');
      setUser(data.user);
    } catch (err) {
      console.error('Failed to fetch authenticated user profile:', err);
      removeStoredToken();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const handleTokenReceived = async (newToken: string) => {
    setStoredToken(newToken);
    setToken(newToken);
    setLoading(true);
    await fetchCurrentUser();
  };

  const loginWithGoogle = () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  };

  const loginWithMock = () => {
    window.location.href = `${API_BASE_URL}/api/auth/mock-login?redirect=true`;
  };

  const logout = () => {
    removeStoredToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loginWithGoogle,
        loginWithMock,
        handleTokenReceived,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
