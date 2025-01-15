// src/components/SignIn.jsx

import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { signIn } from '../utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faMicrosoft } from '@fortawesome/free-brands-svg-icons';

const SignIn = () => {
  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: '',
  });
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { signInUser } = useContext(AuthContext); // Get signInUser from context

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    try {
      const data = await signIn(formData);
      if (data.user) {
        signInUser(data.user);
        navigate('/');
      }
    } catch (error) {
      // Handle specific error messages
      if (error.message.includes('Invalid credentials')) {
        setError('Invalid username/email or password');
      } else if (error.message.includes('Account locked')) {
        setError('Account temporarily locked due to too many attempts. Please try again in 15 minutes.');
      } else if (error.message.includes('Too many requests')) {
        setError('Too many login attempts. Please try again later.');
      } else {
        setError('An error occurred during sign in. Please try again.');
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
        
        {error && (
          <div className="text-red-500 text-center mb-4 p-2 bg-red-50 rounded">
            {error}
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
              value={formData.usernameOrEmail}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-md"
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
              value={formData.password}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-md"
              placeholder="Enter your password"
            />
            <PasswordHint />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300 mb-4"
            >
              Sign In
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
      </div>
    </div>
  );
};

export default SignIn;
