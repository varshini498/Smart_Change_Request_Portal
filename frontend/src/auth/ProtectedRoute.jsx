import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import { normalizeRole } from '../constants/roles';

export default function ProtectedRoute({ children, role, redirectTo = '/' }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/" />;

  if (role) {
    const allowedRoles = (Array.isArray(role) ? role : [role]).map(normalizeRole);
    if (!allowedRoles.includes(normalizeRole(user.role))) {
      return <Navigate to={redirectTo} />;
    }
  }

  return children;
}
