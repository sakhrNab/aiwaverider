// src/App.jsx
import React, { useEffect, useState, useRef } from 'react';
import './styles/globals.css';
import AppContent from './components/app/AppContent';
import { AuthProvider } from './contexts/AuthContext';
import { PostsProvider } from './contexts/PostsContext';
import { CartProvider } from './contexts/CartContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthCallback from './components/auth/AuthCallback';
import { PAYMENT } from './config/config';
import useAgentStore from './store/agentStore'; // Import agentStore

// PayPal initial options from config
const paypalOptions = {
  "client-id": PAYMENT.PAYPAL.CLIENT_ID || "test", // Use a safe fallback value
  currency: PAYMENT.PAYPAL.CURRENCY || "USD",
  intent: PAYMENT.PAYPAL.INTENT || "capture",
  "disable-funding": "paylater,venmo,credit", // Optional: disable specific payment methods
};

// Track if app has been initialized - use module scope
let appInitialized = false;

const App = () => {
  // State to track if app has initialized
  const [isInitialized, setIsInitialized] = useState(false);
  // Ref to prevent multiple initialization
  const initRef = useRef(false);

  useEffect(() => {
    // Only initialize once across all renders
    if (initRef.current || appInitialized) return;
    initRef.current = true;
    
    // Enhanced initialization with data preloading
    const initializeApp = async () => {
      try {
        console.log('Initializing application and preloading essential data...');
        
        // Preload agent data to avoid duplicate API calls later
        const agentStore = useAgentStore.getState();
        await agentStore.loadInitialData();
        console.log('Agent data preloaded successfully');
        
        if (process.env.NODE_ENV === 'development' && !appInitialized) {
          console.log('App initialized with preloaded data');
          appInitialized = true;
        }
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
