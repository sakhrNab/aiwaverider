// src/App.jsx

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import './styles/globals.css';  // Tailwind global styles
import AppContent from './components/AppContent'; // Import AppContent
import { AuthProvider } from './contexts/AuthContext'; // Import AuthProvider

const App = () => (
  <Router>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </Router>
);

export default App;
