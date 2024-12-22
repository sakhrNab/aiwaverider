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

  const navigate = useNavigate();
  const { signInUser } = useContext(AuthContext); // Get signInUser from context
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Simulate login action
    console.log('Form Submitted', formData);

    try {
      const data = await signIn(formData);
      if (data.token && data.user) {
        // Call signInUser to store user and token
        signInUser(data.user, data.token);
        // Redirect to homepage
        navigate('/');
      } else {
        // Handle errors
        setError(data.error || 'Sign in failed.');
      }
    } catch (error) {
      console.error('Sign In Error:', error);
      setError('An unexpected error occurred during sign in.');
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

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg p-8 rounded-lg w-full max-w-md">
        <h2 className="text-3xl font-semibold mb-6 text-center">Sign In</h2>
        
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

          {error && <p className="text-red-500 text-center">{error}</p>}
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
