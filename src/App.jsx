// src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import './styles/globals.css';
import AppContent from './components/AppContent';
import { AuthProvider } from './contexts/AuthContext';
import { PostsProvider } from './contexts/PostsContext';
import { CartProvider } from './contexts/CartContext.jsx';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthCallback from './components/AuthCallback';

// PayPal initial options
const paypalOptions = {
  "client-id": "sb", // Using PayPal sandbox client ID for development
  currency: "USD",
  intent: "capture"
};

const App = () => {
  // State to track if Firebase has initialized
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // You can add any app initialization logic here
    setIsInitialized(true);
  }, []);

  return (
    <Router>
      <ErrorBoundary>
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
        <AuthProvider>
          <PostsProvider>
            <CartProvider>
              <PayPalScriptProvider options={paypalOptions}>
                <AuthCallback>
                  {isInitialized ? <AppContent /> : <div>Loading application...</div>}
                </AuthCallback>
              </PayPalScriptProvider>
            </CartProvider>
          </PostsProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
};

export default App;
