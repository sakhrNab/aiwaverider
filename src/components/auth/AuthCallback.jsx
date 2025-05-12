import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

/**
 * AuthCallback component handles authentication redirects and processes auth tokens
 * This is particularly useful for OAuth flows (Google, GitHub, etc.) where users
 * are redirected back to the application with tokens or codes
 */
const AuthCallback = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser, loading } = useAuth();

  useEffect(() => {
    // Check if we're on an auth callback route
    if (location.pathname === '/auth/callback') {
      // Extract tokens or authentication codes from URL
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const error = params.get('error');

      if (error) {
        console.error('Authentication error:', error);
        navigate('/signin?error=' + encodeURIComponent(error));
        return;
      }

      if (token) {
        // Process the token (store in localStorage, etc.)
        localStorage.setItem('authToken', token);
        
        // Get user info with the token
        const fetchUserInfo = async () => {
          try {
            // Mock user data for now - in a real app, you'd make an API call to get user data
            const userData = {
              id: '123',
              name: 'Demo User',
              email: 'user@example.com',
              role: 'user'
            };
            
            setUser(userData);
            navigate('/');
          } catch (err) {
            console.error('Error fetching user info:', err);
            navigate('/signin?error=user_fetch_failed');
          }
        };

        fetchUserInfo();
      } else {
        // No token found, redirect to login
        navigate('/signin');
      }
    }
  }, [location, navigate, setUser]);

  // Return children if not in a loading state
  return (
    <>
      {children}
    </>
  );
};

export default AuthCallback; 