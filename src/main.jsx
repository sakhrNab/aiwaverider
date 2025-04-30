import './fontAwesome'; // Add this line
import React from 'react';
import ReactDOM from 'react-dom/client';
// import './index.css'
import '../src/styles/globals.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { initializeErrorMonitoring } from './services/logService';
import { ENV } from './config/config';
import { scheduleHealthChecks } from './utils/healthCheck';

// Import temp populate script in development mode
if (import.meta.env.DEV) {
  import('./utils/tempPopulateAITools')
    .then(() => console.log('Temp AI tools population script loaded'))
    .catch(err => console.error('Failed to load temp populate script:', err));
}

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
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
