import { useEffect, useState } from 'react';
import { requestJson } from '../utils/api';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const data = await requestJson('/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const register = async (payload) => {
    return await requestJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };

  const login = async (payload) => {
    const data = await requestJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await requestJson('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  const resendVerification = async (email) => {
    return await requestJson('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const forgotPassword = async (email) => {
    return await requestJson('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  };

  const resetPassword = async (payload) => {
    return await requestJson('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };

  const updateProfile = async (payload) => {
    const data = await requestJson('/api/account/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    setUser(data.user);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        register,
        login,
        logout,
        refreshAuth,
        forgotPassword,
        resendVerification,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
