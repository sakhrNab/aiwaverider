// src/components/SignIn.jsx

import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { signIn, signInWithGoogle, signInWithMicrosoft } from '../../api/auth/authApi';

import { toast } from 'react-toastify';
import { getLockInfo, setLockInfo, clearLockInfo } from '../../utils/lockManager';
// Add firebase import and remove duplicate auth import
// import firebase from 'firebase/compat/app';
// import { auth } from '../utils/firebase';

const SignIn = () => {
  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: '',
  });
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();
  const { user, updateUserProfile } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [networkIssue, setNetworkIssue] = useState(false);
  const [showNetworkGuide, setShowNetworkGuide] = useState(false);

  useEffect(() => {
    // Clean up timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Add new useEffect for lock persistence
  useEffect(() => {
    const lockInfo = getLockInfo();
    if (lockInfo) {
      setIsLocked(true);
      setAttempts(lockInfo.attempts);
      setLockoutEndTime(new Date(lockInfo.endTime));
      startLockoutTimer((new Date(lockInfo.endTime) - new Date()) / 1000);
    }
  }, []);

  // Add timer effect
  useEffect(() => {
    if (!lockoutEndTime) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = Math.max(0, lockoutEndTime - now);
      if (diff === 0) {
        setIsLocked(false);
        setAttempts(0);
        setLockoutEndTime(null);
        setTimeLeft(null);
        clearLockInfo();
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    // Update immediately and then every second
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lockoutEndTime]);

  // Replace old timer code with new implementation
  const startLockoutTimer = (duration) => {
    const endTime = new Date(Date.now() + duration * 1000);
    setLockoutEndTime(endTime);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const existingLock = getLockInfo();
    if (existingLock) {
      const now = new Date();
      const lockEnd = new Date(existingLock.endTime);
      if (now < lockEnd) {
        const timeLeft = Math.ceil((lockEnd - now) / 1000 / 60); // Minutes left
        toast.error(`Account is locked. Please try again in ${timeLeft} minutes.`);
        return;
      }
      clearLockInfo();
    }

    try {
      const data = await signIn(formData);
      if (data.firebaseUser) {
        clearLockInfo();
        setAttempts(0);
        setIsLocked(false);
        setLockoutEndTime(null);
        setShowTips(false);
        
        // Update user profile in context
        await updateUserProfile(data.firebaseUser.uid, data.firebaseUser);
        
        toast.success('Successfully signed in!');
        setTimeout(() => navigate('/', { replace: true }), 100);
      }
    } catch (error) {
      console.error('Sign-in error:', error);

      // Handle Firebase specific errors
      switch (error.code) {
        case 'auth/user-not-found':
          toast.error('No account found with this email address');
          break;
        case 'auth/wrong-password':
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          const remaining = 5 - newAttempts;

          if (remaining <= 0) {
            setIsLocked(true);
            const lockDuration = 15 * 60; // 15 minutes in seconds
            startLockoutTimer(lockDuration);
            setLockInfo(formData.usernameOrEmail, new Date(Date.now() + lockDuration * 1000), 5);
            toast.error('Account locked. Please try again in 15 minutes.');
          } else {
            toast.error(`Invalid password. ${remaining} attempts remaining.`);
            setShowTips(remaining <= 3);
          }
          break;
        case 'auth/too-many-requests':
          setIsLocked(true);
          const lockDuration = 15 * 60;
          startLockoutTimer(lockDuration);
          setLockInfo(formData.usernameOrEmail, new Date(Date.now() + lockDuration * 1000), 5);
          toast.error('Too many failed attempts. Account temporarily locked.');
          break;
        case 'auth/invalid-email':
          toast.error('Please enter a valid email address');
          break;
        default:
          toast.error(error.message || 'An error occurred during sign in');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      console.log('Starting Google sign-in from SignIn component');
      
      const userData = await signInWithGoogle();
      
      // Check if the sign-in was canceled by the user
      if (userData && userData.canceled) {
        toast.info('Sign-in was canceled');
        return; // Exit early, no need for error handling
      }
      
      // Check if there was a network error
      if (userData && userData.network === false) {
        handleNetworkIssue(userData.message);
        return; // Exit with network error
      }
      
      console.log('SignIn component received user data:', userData);
      
      if (userData) {
        // Clear any lockout status
        clearLockInfo();
        setAttempts(0);
        setIsLocked(false);
        setLockoutEndTime(null);
        setShowTips(false);
        
        // Update user profile in context if needed
        if (updateUserProfile && userData.uid) {
          await updateUserProfile(userData.uid, userData);
        }
        
        // Show success message
        toast.success('Successfully signed in with Google!');
        
        // If not verified with backend but we have user info, still proceed
        if (userData.isVerified === false) {
          toast.warn('Connected to Google but had trouble verifying with the server. Some features may be limited.', {
            autoClose: 5000
          });
        }
        
        // Navigate to home page
        setTimeout(() => navigate('/', { replace: true }), 100);
      } else {
        toast.error('Could not retrieve user information from Google');
      }
    } catch (error) {
      console.error("Google Sign-in Error:", error);
      
      // Network-related errors
      if (error.message?.includes('network') || error.code === 'auth/network-request-failed') {
        handleNetworkIssue('Network error during authentication. Click here for troubleshooting tips.');
      } else if (error.message?.includes('NO_ACCOUNT') || error.code === 'auth/no-account') {
        toast.info('No account found. Redirecting to sign up...');
        setTimeout(() => navigate('/sign-up'), 2000);
      } else {
        // For actual errors, show an error message
        toast.error(`Google sign-in failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    try {
      setIsLoading(true);
      console.log('Starting Microsoft sign-in from SignIn component');
      
      const userData = await signInWithMicrosoft();
      
      // Check if the sign-in was canceled by the user
      if (userData && userData.canceled) {
        toast.info('Sign-in was canceled');
        return; // Exit early, no need for error handling
      }
      
      // Check if there was a network error
      if (userData && userData.network === false) {
        handleNetworkIssue(userData.message);
        return; // Exit with network error
      }
      
      console.log('SignIn component received user data:', userData);
      
      if (userData) {
        // Clear any lockout status
        clearLockInfo();
        setAttempts(0);
        setIsLocked(false);
        setLockoutEndTime(null);
        setShowTips(false);
        
        // Update user profile in context if needed
        if (updateUserProfile && userData.uid) {
          await updateUserProfile(userData.uid, userData);
        }
        
        // Show success message
        toast.success('Successfully signed in with Microsoft!');
        
        // If not verified with backend but we have user info, still proceed
        if (userData.isVerified === false) {
          toast.warn('Connected to Microsoft but had trouble verifying with the server. Some features may be limited.', {
            autoClose: 5000
          });
        }
        
        // Navigate to home page
        setTimeout(() => navigate('/', { replace: true }), 100);
      } else {
        toast.error('Could not retrieve user information from Microsoft');
      }
    } catch (error) {
      console.error("Microsoft Sign-in Error:", error);
      
      // Network-related errors
      if (error.message?.includes('network') || error.code === 'auth/network-request-failed') {
        handleNetworkIssue('Network error during authentication. Click here for troubleshooting tips.');
      } else if (error.message?.includes('NO_ACCOUNT') || error.code === 'auth/no-account') {
        toast.info('No account found. Redirecting to sign up...');
        setTimeout(() => navigate('/sign-up'), 2000);
      } else {
        // For actual errors, show an error message
        toast.error(`Microsoft sign-in failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  // Add password requirements hint
  const PasswordHint = () => (
    <div className="text-xs text-gray-500 mt-1">
      Password must contain at least 8 characters, including uppercase, lowercase, number and special character (@$!%*?&)
    </div>
  );

  // Check if network is online when component mounts
  useEffect(() => {
    const checkOnlineStatus = () => {
      if (!navigator.onLine) {
        setNetworkIssue(true);
      }
    };
    
    // Check initially
    checkOnlineStatus();
    
    // Add event listeners for online/offline status
    window.addEventListener('online', () => setNetworkIssue(false));
    window.addEventListener('offline', () => setNetworkIssue(true));
    
    return () => {
      window.removeEventListener('online', () => setNetworkIssue(false));
      window.removeEventListener('offline', () => setNetworkIssue(true));
    };
  }, []);
  
  // Function to handle network connectivity issues in sign-in
  const handleNetworkIssue = (message) => {
    setNetworkIssue(true);
    toast.error(message || 'Network connectivity issue detected', {
      autoClose: 8000,
      onClick: () => setShowNetworkGuide(true)
    });
  };
  
  // Network troubleshooting guide
  const NetworkGuide = () => (
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-left">
      <h3 className="text-blue-800 font-medium mb-2">Network Connectivity Issues</h3>
      <p className="text-sm text-gray-700 mb-3">
        Authentication requires access to Google and Microsoft servers. Try these steps:
      </p>
      <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1 mb-3">
        <li>Check your internet connection</li>
        <li>Disable any VPN or proxy services temporarily</li>
        <li>Check if your firewall is blocking authentication services</li>
        <li>Try using a different network (like mobile data)</li>
        <li>Clear your browser cache and cookies</li>
      </ol>
      <div className="flex justify-between">
        <button 
          onClick={() => setShowNetworkGuide(false)}
          className="text-xs text-blue-600 hover:underline"
        >
          Close guide
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
        >
          Refresh page
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg p-8 rounded-lg w-full max-w-md">
        <h2 className="text-3xl font-semibold mb-6 text-center">Sign In</h2>
        
        {isLocked && timeLeft && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">Account Temporarily Locked</h3>
            <p className="text-sm text-red-600">
              Time remaining: {timeLeft}
            </p>
          </div>
        )}

        {attempts > 0 && !isLocked && (
          <div className="text-sm text-gray-600 mb-4 text-center">
            Attempts remaining: {5 - attempts}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username or Email */}
          <div>
            <label htmlFor="usernameOrEmail" className="block text-lg font-medium mb-2">Username or Email</label>
            <input
              type="text"
              id="usernameOrEmail"
              name="usernameOrEmail"
              required
              disabled={isLocked}
              value={formData.usernameOrEmail}
              onChange={handleInputChange}
              className={`w-full p-3 border border-gray-300 rounded-md ${
                isLocked ? 'bg-gray-100' : ''
              }`}
              placeholder="Enter your username or email"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-lg font-medium mb-2">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              disabled={isLocked}
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full p-3 border border-gray-300 rounded-md ${
                isLocked ? 'bg-gray-100' : ''
              }`}
              placeholder="Enter your password"
            />
            <PasswordHint />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLocked}
              className={`w-full py-3 ${
                isLocked 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white rounded-md transition duration-300 mb-4`}
            >
              {isLocked ? 'Account Locked' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* Social Login Buttons */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              <span className="sr-only">Sign in with Google</span>
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  />
                </svg>
              )}
              <span className={`ml-2 ${isLoading ? 'opacity-0' : ''}`}>Google</span>
            </button>
            
            <button
              type="button"
              onClick={handleMicrosoftSignIn}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              <span className="sr-only">Sign in with Microsoft</span>
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
              )}
              <span className={`ml-2 ${isLoading ? 'opacity-0' : ''}`}>Microsoft</span>
            </button>
          </div>
        </div>

        {/* Link to Sign Up */}
        <div className="mt-4 text-center">
          <p>Don't have an account? 
            <span
              onClick={() => navigate('/sign-up')}
              className="text-blue-500 hover:underline cursor-pointer"
            >
              Sign Up
            </span>
          </p>
        </div>

        {/* Help tips - shown after 2 failed attempts */}
        {showTips && !isLocked && (
          <div className="mt-6 text-sm text-gray-600">
            <p className="font-medium mb-2">If you're having trouble signing in:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Check your caps lock is off</li>
              <li>Verify your username/email is correct</li>
              <li>Try resetting your password</li>
            </ul>
          </div>
        )}

        {networkIssue && showNetworkGuide && (
          <NetworkGuide />
        )}
      </div>
    </div>
  );
};

export default SignIn;
