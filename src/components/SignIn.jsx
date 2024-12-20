import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignIn = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate login action
    console.log('Form Submitted', formData);
    navigate('/');  // Redirect to homepage after successful login
  };

  const handleGoogleSignIn = () => {
    console.log('Sign in with Google');
  };

  const handleMicrosoftSignIn = () => {
    console.log('Sign in with Microsoft');
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg p-8 rounded-lg w-full max-w-md">
        <h2 className="text-3xl font-semibold mb-6 text-center">Sign In</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-lg font-medium mb-2">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-md"
              placeholder="Enter your email"
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
        </form>

        {/* Google and Microsoft Sign In */}
        <div className="mt-6 text-center">
          <button
            onClick={handleGoogleSignIn}
            className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 mb-4 flex items-center justify-center"
          >
            <i className="fab fa-google mr-2"></i>
            Sign In with Google
          </button>
          <button
            onClick={handleMicrosoftSignIn}
            className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 flex items-center justify-center"
          >
            <i className="fab fa-microsoft mr-2"></i>
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
