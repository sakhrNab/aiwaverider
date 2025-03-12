// src/components/AdminDashboard.jsx

import React, { useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  // Get auth context and navigation
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // Redirect to the new combined dashboard at /admin/agents
  useEffect(() => {
    navigate('/admin/agents');
  }, [navigate]);
  
  // Immediate return if not admin
  if (!user?.role === 'admin') {
    return (
      <div className="p-4 text-red-600 font-bold">
        Unauthorized – Only Admins Can Access This Page
      </div>
    );
  }

  // Show a loading message during redirect
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>
      <p className="text-center">Redirecting to the new Admin Dashboard...</p>
    </div>
  );
};

export default AdminDashboard;
