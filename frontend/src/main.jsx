import './config/fontAwesome.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../src/styles/globals.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { initializeErrorMonitoring } from './services/logService';
import { ENV } from './config/config';
import { scheduleHealthChecks } from './api/core/healthCheck';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext.jsx';

// Initialize error monitoring in production
if (ENV.PROD) {
  initializeErrorMonitoring()
    .then(() => console.log('Error monitoring initialized'))
    .catch(err => console.error('Failed to initialize error monitoring:', err));
    
  // Schedule periodic health checks in production
  // Run every 5 minutes
  const healthCheckController = scheduleHealthChecks(5 * 60 * 1000);
  
  // Store in window for debugging access
  window.__healthCheck = healthCheckController;
}

// Clear service worker caches to fix network request issues
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Clear all caches to force a fresh start
      const cacheNames = await caches.keys();
      console.log('Clearing service worker caches:', cacheNames);
      
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
      
      console.log('All caches cleared');
      
      // Register or update the service worker
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(registration => {
          console.log('Service worker registered:', registration);
          
          // Force update if needed
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        })
        .catch(error => {
          console.error('Service worker registration failed:', error);
        });
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
    <App />
        </CartProvider>
      </AuthProvider>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);
