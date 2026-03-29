import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import { normalizeRole } from '../constants/roles';

export default function ProtectedRoute({ children, role, allowedRoles, redirectTo = '/' }) {
  const { user, authLoading } = useContext(AuthContext);
  if (authLoading) return null;
  if (!user) return <Navigate to="/" />;

  const normalizedAllowedRoles = (allowedRoles || role)
    ? (Array.isArray(allowedRoles || role) ? (allowedRoles || role) : [allowedRoles || role]).map(normalizeRole)
    : null;

  if (normalizedAllowedRoles) {
    if (!normalizedAllowedRoles.includes(normalizeRole(user.role))) {
      return <Navigate to={redirectTo} />;
    }
  }

  return children;
}
