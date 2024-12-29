// src/App.jsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import './styles/globals.css';
import AppContent from './components/AppContent';
import { AuthProvider } from './contexts/AuthContext';
import { PostsProvider } from './contexts/PostsContext'; // <-- NEW
import ErrorBoundary from './components/ErrorBoundary';

const App = () => (
  <Router>
    <AuthProvider>
      <PostsProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </PostsProvider>
    </AuthProvider>
  </Router>
);

export default App;
