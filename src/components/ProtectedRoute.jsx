// src/components/ProtectedRoute.jsx

import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    // Not authenticated
    return <Navigate to="/sign-in" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Authenticated but role not allowed
    return <Navigate to="/" replace />;
  }

  // Authenticated and has required role
  return children;
};

export default ProtectedRoute;
