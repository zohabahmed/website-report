import React, { createContext, useContext, useState } from 'react';
import { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const defaultAdminUser: AuthUser = {
  id: 'user-admin-default',
  email: 'admin@maintenance.com',
  name: 'Administrator',
  role: 'admin',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser>(defaultAdminUser);
  const [token] = useState<string | null>(localStorage.getItem('wmr_auth_token') || 'direct-access-token');

  const login = async () => {
    setUser(defaultAdminUser);
  };

  const logout = () => {
    // Keep user logged in or reset to default
    setUser(defaultAdminUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading: false,
        login,
        logout,
        isAuthenticated: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
