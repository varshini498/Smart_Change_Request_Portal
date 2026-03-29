import { createContext, useEffect, useState } from 'react';
import { normalizeRole } from '../constants/roles';
import API from '../api/axios';

export const AuthContext = createContext();

const getStoredUser = () => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed?.token) {
        return {
          ...parsed,
          role: normalizeRole(parsed.role),
        };
      }
    } catch {
      localStorage.removeItem('user');
    }
  }

  const token = localStorage.getItem('token');
  if (!token) return null;

  return {
    token,
    role: normalizeRole(localStorage.getItem('role')),
    name: localStorage.getItem('name') || '',
    email: localStorage.getItem('email') || '',
    roll_no: localStorage.getItem('roll_no') || '',
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser());
  const [authLoading, setAuthLoading] = useState(() => Boolean(localStorage.getItem('token')));

  useEffect(() => {
    if (user?.token) {
      localStorage.setItem('token', user.token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', normalizeRole(user.role) || '');
      localStorage.setItem('name', user.name || '');
      localStorage.setItem('email', user.email || '');
      localStorage.setItem('roll_no', user.roll_no || '');
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      localStorage.removeItem('role_label');
      localStorage.removeItem('name');
      localStorage.removeItem('email');
      localStorage.removeItem('roll_no');
    }
  }, [user]);

  useEffect(() => {
    if (!user?.token) {
      setAuthLoading(false);
      return;
    }

    let isActive = true;
    setAuthLoading(true);

    API.get('/auth/me')
      .then((res) => {
        if (!isActive) return;
        const serverUser = res.data?.user || {};
        setUser((prev) => ({
          token: prev?.token || user.token,
          id: serverUser.id,
          name: serverUser.name || prev?.name || '',
          email: serverUser.email || prev?.email || '',
          role: normalizeRole(serverUser.role || prev?.role),
          roll_no: serverUser.roll_no || prev?.roll_no || '',
        }));
      })
      .catch(() => {
        if (!isActive) return;
        setUser(null);
      })
      .finally(() => {
        if (isActive) setAuthLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [user?.token]);

  return (
    <AuthContext.Provider value={{ user, setUser, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
