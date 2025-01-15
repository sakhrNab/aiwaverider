// src/components/SignIn.jsx

import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { signIn } from '../utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faMicrosoft } from '@fortawesome/free-brands-svg-icons';
import { toast } from 'react-toastify';  // Add this import
import { getLockInfo, setLockInfo, clearLockInfo } from '../utils/lockManager';

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
  const { signInUser } = useContext(AuthContext);

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
        toast.error(`Account is locked. Please try again in ${timeLeft}`);
        return;
      }
      clearLockInfo();
    }

    try {
      const data = await signIn(formData);
      if (data.user) {
        clearLockInfo();
        setAttempts(0);
        setIsLocked(false);
        setLockoutEndTime(null);
        setShowTips(false);
        await signInUser(data.user);
        toast.success('Successfully signed in!');
        setTimeout(() => navigate('/', { replace: true }), 100);
        return;
      }
    } catch (error) {
      // Extract error details
      const errorData = error.response?.data || {};
      const attemptsLeft = errorData.attemptsLeft;
      
      if (typeof attemptsLeft === 'number') {
        setAttempts(5 - attemptsLeft);

        if (attemptsLeft <= 0 || error.message.includes('Account locked')) {
          setIsLocked(true);
          const lockDuration = 15 * 60;
          startLockoutTimer(lockDuration);
          setLockInfo(formData.usernameOrEmail, new Date(Date.now() + lockDuration * 1000), 5);
          toast.error('Account locked. Please try again in 15 minutes.');
        } else {
          toast.error(`Invalid credentials. ${attemptsLeft} attempts remaining.`);
          setShowTips(attemptsLeft <= 3); // Show tips when 3 or fewer attempts remain
        }
      } else {
        // Handle case where attemptsLeft is not in response
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        const remaining = 5 - newAttempts;

        if (remaining <= 0) {
          setIsLocked(true);
          const lockDuration = 15 * 60;
          startLockoutTimer(lockDuration);
          setLockInfo(formData.usernameOrEmail, new Date(Date.now() + lockDuration * 1000), 5);
          toast.error('Account locked. Please try again in 15 minutes.');
        } else {
          toast.error(`Invalid credentials. ${remaining} attempts remaining.`);
          setShowTips(remaining <= 3);
        }
      }
    }
  };

  const handleGoogleSignIn = () => {
    console.log('Sign in with Google');
    // Implement Google Sign-In via OAuth if desired
  };

  const handleMicrosoftSignIn = () => {
    console.log('Sign in with Microsoft');
    // Implement Microsoft Sign-In via OAuth if desired
  };

  // Add password requirements hint
  const PasswordHint = () => (
    <div className="text-xs text-gray-500 mt-1">
      Password must contain at least 8 characters, including uppercase, lowercase, number and special character (@$!%*?&)
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

        {/* Google and Microsoft Sign In */}
        <div className="mt-6 text-center">
          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 mb-4 flex items-center justify-center"
          >
            <FontAwesomeIcon icon={faGoogle} className="mr-2" />
            Sign In with Google
          </button>
          <button
            onClick={handleMicrosoftSignIn}
            className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 flex items-center justify-center"
          >
            <FontAwesomeIcon icon={faMicrosoft} className="mr-2" />
            Sign In with Microsoft
          </button>
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
      </div>
    </div>
  );
};

export default SignIn;
