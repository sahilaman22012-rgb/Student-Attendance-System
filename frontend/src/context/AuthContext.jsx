import React, { createContext, useContext, useEffect, useState } from 'react';
import { getMeApi, loginApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState(Boolean(localStorage.getItem('access_token')));

  useEffect(() => {
    let active = true;
    if (!token) {
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    getMeApi()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        localStorage.setItem('user_data', JSON.stringify(currentUser));
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const login = async (email, password) => {
    const result = await loginApi(email, password);
    setUser(result.user);
    setToken(result.access_token);
    return { user: result.user };
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    role: user?.role,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
