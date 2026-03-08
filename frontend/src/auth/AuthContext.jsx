import { createContext, useState, useEffect } from 'react';
import { normalizeRole } from '../constants/roles';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const roleFromStorage = localStorage.getItem('role');
    const name = localStorage.getItem('name');
    if (token) {
      let role = normalizeRole(roleFromStorage);
      if (!role) {
        try {
          const payload = token.split('.')[1];
          const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
          role = normalizeRole(json?.role);
        } catch {
          role = '';
        }
      }
      setUser({ token, role, name });
    }
  }, []);

  // IMPORTANT: Value must be an object { user, setUser }
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
