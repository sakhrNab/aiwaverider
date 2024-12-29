// src\components\AppContent.jsx
// src/components/AppContent.jsx

import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import '../styles/globals.css'; // Tailwind global styles
import Header from './Header';
import Body from './Body';
import Footer from './Footer';
import SignUp from './SignUp'; // SignUp component
import SignIn from './SignIn'; // SignIn component
import AdminDashboard from './AdminDashboard';
import ProtectedRoute from './ProtectedRoute'; // For admin-protected routes
import PostDetail from '../posts/PostDetail'; // Our post detail page
import CreatePost from '../posts/CreatePost'; // CreatePost component

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
          {/* Public Routes */}
          <Route path="/" element={<Body />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/admin/create-post" element={
            <ProtectedRoute roles={['admin']}>
              <CreatePost />
            </ProtectedRoute>
          } />

          {/* Protected Route: Admin only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Post Detail Page (includes inline editing if admin) */}
          <Route path="/posts/:postId" element={<PostDetail />} />
            
          {/* (Optional) Fallback Route */}
          <Route path="*" element={<Body />} />
        </Routes>
      </div>

      {/* Footer */}
      <Footer />

      {/* SignUp Modal: Only render if we're not on '/sign-up' */}
      {location.pathname !== '/sign-up' && (
        <SignUp isOpen={isSignUpModalOpen} onClose={closeSignUpModal} />
      )}
    </div>
  );
};

export default AppContent;

