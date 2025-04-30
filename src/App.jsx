// src/App.jsx
import React, { useEffect, useState } from 'react';
import './styles/globals.css';
import AppContent from './components/AppContent';
import { AuthProvider } from './contexts/AuthContext';
import { PostsProvider } from './contexts/PostsContext';
import { CartProvider } from './contexts/CartContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthCallback from './components/AuthCallback';
import { PAYMENT } from './config/config';

// PayPal initial options from config
const paypalOptions = {
  "client-id": PAYMENT.PAYPAL.CLIENT_ID || "test", // Use a safe fallback value
  currency: PAYMENT.PAYPAL.CURRENCY || "USD",
  intent: PAYMENT.PAYPAL.INTENT || "capture",
  "disable-funding": "paylater,venmo,credit", // Optional: disable specific payment methods
};

const App = () => {
  // State to track if app has initialized
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Simple initialization - no static data population
    const initializeApp = async () => {
      try {
        // Any global app initialization can go here
        console.log('App initialized without static data')
      } catch (error) {
        console.error('Error during app initialization:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  return (
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
      <ThemeProvider>
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
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
