// src/components/AdminDashboard.jsx

import React, { useContext, useEffect, useState } from 'react';
import { HashLoader } from 'react-spinners';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const AdminDashboard = () => {
  // Get auth context and navigation
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  
  // Simulate loading state and redirect to the new combined dashboard at /admin/agents
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      navigate('/admin/agents');
    }, 1200);
    
    return () => clearTimeout(timer);
  }, [navigate]);
  
  // Immediate return if not admin
  if (!user?.role === 'admin') {
    return (
      <div className="p-4 text-red-600 font-bold">
        Unauthorized – Only Admins Can Access This Page
      </div>
    );
  }

  // Show loading spinner
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-b from-gray-900 to-blue-900">
        <div className="mb-8">
          <HashLoader color="#4FD1C5" size={70} speedMultiplier={0.8} />
        </div>
        <div className="text-white text-xl font-semibold mt-4">
          Initializing Admin Dashboard
        </div>
        <div className="text-blue-300 text-sm mt-2">
          Loading administrative tools...
        </div>
      </div>
    );
  }

  // Show a loading message during redirect (fallback)
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>
      <p className="text-center">Redirecting to the new Admin Dashboard...</p>
    </div>
  );
};

export default AdminDashboard;
