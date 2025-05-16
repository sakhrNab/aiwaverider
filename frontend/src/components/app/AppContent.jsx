// src/components/AppContent.jsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../../styles/globals.css'; // Tailwind global styles
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SignUp from '../auth/SignUpForm';
import AppRoutes from '../../routes/routes.jsx';
import ChatBot from '../common/ChatBot';
import BackToTop from '../common/BackToTop';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import ErrorBoundary from '../common/ErrorBoundary';

const AppContent = () => {
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const location = useLocation();

  const openSignUpModal = () => setIsSignUpModalOpen(true);
  const closeSignUpModal = () => setIsSignUpModalOpen(false);
  
  // Add event listener for opening signup modal from anywhere in the app
  useEffect(() => {
    const handleOpenSignUpModal = () => {
      openSignUpModal();
    };
    
    document.addEventListener('open-signup-modal', handleOpenSignUpModal);
    
    return () => {
      document.removeEventListener('open-signup-modal', handleOpenSignUpModal);
    };
  }, []);

  return (
    <>
      <ErrorBoundary>
        <div className="flex flex-col min-h-screen">
          <Header openSignUpModal={openSignUpModal} />

          <div className="flex-grow">
            <AppRoutes />
          </div>

          <Footer />

          {/* Show SignUp modal if not on /sign-up */}
          {location.pathname !== '/sign-up' && (
            <SignUp isOpen={isSignUpModalOpen} onClose={closeSignUpModal} />
          )}
        </div>
      </ErrorBoundary>
      <VercelAnalytics />
      <ChatBot />
      <BackToTop />
    </>
  );
};

export default AppContent;
