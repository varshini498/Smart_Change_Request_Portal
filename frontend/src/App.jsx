import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext'; 

import Login from './auth/Login'; 
import Register from './auth/Register'; // ✅ ADD THIS IMPORT
import ManagerDashboard from './pages/manager/Dashboard';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';

function App() {
  return (
    <AuthProvider> 
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} /> {/* ✅ ADD THIS ROUTE */}
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;