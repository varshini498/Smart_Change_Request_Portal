import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext'; // 1. Import the Provider

import Login from './auth/Login'; 
import ManagerDashboard from './pages/manager/Dashboard';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';

function App() {
  return (
    // 2. Wrap everything here!
    <AuthProvider> 
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;