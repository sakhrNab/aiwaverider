// src/components/AppContent.jsx
import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import '../styles/globals.css'; // Tailwind global styles
import Header from './Header';
import Body from './Body';
import Footer from './Footer';
import SignUp from './SignUp';
import SignIn from './SignIn';
import AdminDashboard from './AdminDashboard';
import ProtectedRoute from './ProtectedRoute';
import PostDetail from '../posts/PostDetail';
import CreatePost from '../posts/CreatePost';

const AppContent = () => {
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const location = useLocation();

  const openSignUpModal = () => setIsSignUpModalOpen(true);
  const closeSignUpModal = () => setIsSignUpModalOpen(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Header openSignUpModal={openSignUpModal} />

      <div className="flex-grow">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Body />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />

          {/* Protected: Admin only */}
        {/* Create Post route */}
        <Route
            path="/posts/create" // or /admin/create
            element={
              <ProtectedRoute roles={['admin']}>
                <CreatePost />
              </ProtectedRoute>
            }
          />

          {/* Admin Dash */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />


          {/* Post Detail */}
          <Route path="/posts/:postId" element={<PostDetail />} />

          {/* Fallback */}
          <Route path="*" element={<Body />} />
        </Routes>
      </div>

      <Footer />

      {/* Show SignUp modal if not on /sign-up */}
      {location.pathname !== '/sign-up' && (
        <SignUp isOpen={isSignUpModalOpen} onClose={closeSignUpModal} />
      )}
    </div>
  );
};

export default AppContent;
