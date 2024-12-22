// src/AppContent.jsx

import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import '../styles/globals.css';  // Tailwind global styles
import Header from '../components/Header';
import Body from '../components/Body';
import Footer from '../components/Footer';
import SignUp from '../components/SignUp'; // SignUp component
import SignIn from '../components/SignIn'; // SignIn component
import AdminDashboard from '../components/AdminDashboard';
import ProtectedRoute from '../components/ProtectedRoute'; // Import ProtectedRoute

const AppContent = () => {
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const location = useLocation();

  const openSignUpModal = () => {
    setIsSignUpModalOpen(true);
  };

  const closeSignUpModal = () => {
    setIsSignUpModalOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <Header openSignUpModal={openSignUpModal} />

      <div className="flex-grow">
        {/* Routes */}
        <Routes>
          <Route path="/" element={<Body />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          {/* Protected Route: Admin only */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          {/* Add more routes as needed */}
        </Routes>
      </div>

      {/* Footer */}
      <Footer />

      {/* SignUp Modal: Only render if we are not on '/sign-up' route */}
      {location.pathname !== '/sign-up' && (
        <SignUp isOpen={isSignUpModalOpen} onClose={closeSignUpModal} />
      )}
    </div>
  );
};

export default AppContent;
