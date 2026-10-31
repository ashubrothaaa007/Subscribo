import { useState, useCallback } from 'react';
import { odooApi } from '../services/odooApi';
import type { User, UserRole } from '../types';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role') as UserRole | null;
    if (roleParam === 'admin') {
      return { id: 2, name: 'Administrator', email: 'admin@subscribo.local', login: 'admin', role: 'admin', companyName: 'SUBSCRIBO Enterprise' };
    } else if (roleParam === 'staff') {
      return { id: 1027, name: 'Sarah Staff', email: 'staff@example.com', login: 'staff@example.com', role: 'staff', companyName: 'SUBSCRIBO Operations' };
    } else if (roleParam === 'customer') {
      return { id: 1028, name: 'Alex Customer', email: 'portal.customer@example.com', login: 'portal.customer@example.com', role: 'customer', partnerId: 1386, companyName: 'Acme Corporation (Customer)' };
    }
    return odooApi.getCurrentUser();
  });

  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role') as UserRole | null;
    if (roleParam && ['admin', 'staff', 'customer'].includes(roleParam)) {
      return roleParam;
    }
    return odooApi.getCurrentUser()?.role || 'admin';
  });

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const login = useCallback(async (loginStr: string, passwordStr: string) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const user = await odooApi.login(loginStr, passwordStr);
      setCurrentUser(user);
      setActiveRole(user.role);
      return user;
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setAuthError(msg);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await odooApi.logout();
    setCurrentUser(null);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setActiveRole(role);
    if (role === 'admin') {
      setCurrentUser({ id: 2, name: 'Administrator', email: 'admin@subscribo.local', login: 'admin', role: 'admin', companyName: 'SUBSCRIBO Enterprise' });
    } else if (role === 'staff') {
      setCurrentUser({ id: 1027, name: 'Sarah Staff', email: 'staff@example.com', login: 'staff@example.com', role: 'staff', companyName: 'SUBSCRIBO Operations' });
    } else {
      setCurrentUser({ id: 1028, name: 'Alex Customer', email: 'portal.customer@example.com', login: 'portal.customer@example.com', role: 'customer', partnerId: 1386, companyName: 'Acme Corporation (Customer)' });
    }
  }, []);

  return {
    currentUser,
    activeRole,
    isAuthenticating,
    authError,
    login,
    logout,
    switchRole,
    setActiveRole,
  };
};

