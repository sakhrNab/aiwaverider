// src/components/auth/ProtectedRoute.jsx

import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    // Optionally, render a loading indicator while authentication status is being determined
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
      </div>
    );
  }

  if (!user) {
    // Not authenticated
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Authenticated but role not allowed
    return <Navigate to="/" replace />;
  }

  // Authenticated and has required role
  return children;
};

export default ProtectedRoute;
