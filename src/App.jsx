// src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import './styles/globals.css';
import AppContent from './components/AppContent';
import { AuthProvider } from './contexts/AuthContext';
import { PostsProvider } from './contexts/PostsContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const message = params.get('message');

    if (error === 'exists') {
      toast.error(message || 'Account already exists. Please sign in instead.');
      navigate('/sign-in');
    } else if (error === 'noaccount') {
      toast.error(message || 'No account found. Please sign up first.');
      navigate('/sign-up');
    } else if (error === 'true') {
      toast.error(message || 'Authentication failed');
      navigate('/sign-in');
    } else if (params.get('auth') === 'success') {
      toast.success('Successfully authenticated!');
      navigate('/');
    }
  }, [location, navigate]);

  return null;
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <PostsProvider>
          <ErrorBoundary>
            <AuthCallback />
            <AppContent />
          </ErrorBoundary>
        </PostsProvider>
      </AuthProvider>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </Router>
  );
};

export default App;
