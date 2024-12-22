// src/App.jsx

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import './styles/globals.css';  // Tailwind global styles
import AppContent from './components/AppContent'; // Import AppContent
import { AuthProvider } from './contexts/AuthContext'; // Import AuthProvider
import ErrorBoundary from './components/ErrorBoundary'; // Import ErrorBoundary

const App = () => (
  <Router>
    <AuthProvider>
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
    </AuthProvider>
  </Router>
);

export default App;
