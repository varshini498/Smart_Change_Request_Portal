import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Login from './auth/Login';
import Register from './auth/Register';
import ProtectedRoute from './auth/ProtectedRoute';
import { ROLES } from './constants/roles';
import ManagerDashboard from './pages/manager/Dashboard';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminRequests from './pages/admin/AdminRequests';
import AdminAudit from './pages/admin/AdminAudit';
import AdminSettings from './pages/admin/AdminSettings';
import AdminCategories from './pages/admin/AdminCategories';
import ProfilePage from './pages/ProfilePage';
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';
import Unauthorized from './pages/Unauthorized';
import TeamLeadDashboard from './pages/teamlead/TeamLeadDashboard';
import TeamLeadPending from './pages/teamlead/TeamLeadPending';
import TeamLeadHistory from './pages/teamlead/TeamLeadHistory';
import TeamLeadRequestDetails from './pages/teamlead/TeamLeadRequestDetails';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/manager/dashboard"
            element={
              <ProtectedRoute role={[ROLES.MANAGER]} redirectTo="/unauthorized">
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teamlead/dashboard"
            element={
              <ProtectedRoute role={ROLES.TEAM_LEAD} redirectTo="/unauthorized">
                <TeamLeadDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teamlead/pending"
            element={
              <ProtectedRoute role={ROLES.TEAM_LEAD} redirectTo="/unauthorized">
                <TeamLeadPending />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teamlead/history"
            element={
              <ProtectedRoute role={ROLES.TEAM_LEAD} redirectTo="/unauthorized">
                <TeamLeadHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teamlead/request/:id"
            element={
              <ProtectedRoute role={ROLES.TEAM_LEAD} redirectTo="/unauthorized">
                <TeamLeadRequestDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests/:id"
            element={
              <ProtectedRoute>
                <TeamLeadRequestDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teamlead-dashboard"
            element={
              <Navigate to="/teamlead/dashboard" />
            }
          />
          <Route
            path="/manager-dashboard"
            element={
              <ProtectedRoute role={ROLES.MANAGER} redirectTo="/unauthorized">
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee-dashboard"
            element={
              <ProtectedRoute role={ROLES.EMPLOYEE} redirectTo="/unauthorized">
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute role={ROLES.ADMIN} redirectTo="/unauthorized">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute role={ROLES.ADMIN} redirectTo="/unauthorized">
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/requests"
            element={
              <ProtectedRoute role={ROLES.ADMIN} redirectTo="/unauthorized">
                <AdminRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute role={ROLES.ADMIN} redirectTo="/unauthorized">
                <AdminAudit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute role={ROLES.ADMIN} redirectTo="/unauthorized">
                <AdminCategories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute role={ROLES.ADMIN} redirectTo="/unauthorized">
                <AdminSettings />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute role={ROLES.EMPLOYEE}>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role={ROLES.ADMIN}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute role={[ROLES.ADMIN]} redirectTo="/unauthorized">
                <AnalyticsDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
