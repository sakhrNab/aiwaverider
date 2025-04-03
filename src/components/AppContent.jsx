// src/components/AppContent.jsx
import React, { useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import '../styles/globals.css'; // Tailwind global styles
import Header from './Header';
import Body from './Body';
import Footer from './Footer';
import SignUp from './SignUp';
import SignIn from './SignIn';
import ProtectedRoute from './ProtectedRoute';
import PostDetail from '../posts/PostDetail';
import CreatePost from '../posts/CreatePost';
import Profile from '../pages/Profile';
import Agents from '../pages/Agents';
import AgentDetail from '../pages/agent/AgentDetail';
import Checkout from '../pages/Checkout';
import ThankYou from '../pages/ThankYou';
import CheckoutSuccess from './checkout/CheckoutSuccess';
// Import admin pages
import Dashboard from '../pages/admin/Dashboard';
import ManageAgents from '../pages/admin/ManageAgents';
import ManageUsers from '../pages/admin/ManageUsers';
import Analytics from '../pages/admin/Analytics';
import Settings from '../pages/admin/Settings';
import Pricing from '../pages/admin/Pricing';

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
          <Route path="/profile" element={<Profile />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:agentId" element={<AgentDetail />} />
          <Route path="/product/:agentId" element={<AgentDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/thankyou" element={<ThankYou />} />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />

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

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <Navigate to="/admin/dashboard" replace />
              </ProtectedRoute>
            }
          />
          
          {/* Admin Dashboard */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={['admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Manage Agents */}
          <Route
            path="/admin/agents"
            element={
              <ProtectedRoute roles={['admin']}>
                <ManageAgents />
              </ProtectedRoute>
            }
          />

          {/* Manage Users */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <ManageUsers />
              </ProtectedRoute>
            }
          />

          {/* Analytics */}
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute roles={['admin']}>
                <Analytics />
              </ProtectedRoute>
            }
          />

          {/* Settings */}
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute roles={['admin']}>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Pricing */}
          <Route
            path="/admin/pricing"
            element={
              <ProtectedRoute roles={['admin']}>
                <Pricing />
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
