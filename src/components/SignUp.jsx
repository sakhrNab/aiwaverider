// src/components/SignUp.jsx

import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactPhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { signUp } from '../utils/api'; // Import the signUp API function
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext

const SignUp = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
  });
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const { signInUser } = useContext(AuthContext); // Get signInUser from context

  // If isOpen is undefined, that means we're on /sign-up as a "page" rather than a modal.
  const isModalView = isOpen !== undefined;

  // Decide if the SignUp component should render.
  // - If it's a modal scenario, only render if `isOpen` is true.
  // - If it's a normal page scenario, always render.
  const shouldRender = isModalView ? isOpen : true;

  useEffect(() => {
    if (!isModalView) return; // If this is a normal page view, skip the outside-click logic

    // Close the modal if clicking outside
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, isModalView]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handlePhoneChange = (value) => {
    setFormData({
      ...formData,
      phoneNumber: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form Submitted', formData);

    try {
      const data = await signUp(formData);
      if (data.token) {
        // Call signInUser to store user and token
        signInUser(data.user, data.token);
        // Navigate to homepage
        navigate('/');
        // Close modal if it was a modal scenario
        if (isModalView) {
          onClose();
        }
      } else {
        // Handle errors
        alert(data.error || 'Sign up failed.');
      }
    } catch (error) {
      console.error('Sign Up Error:', error);
      alert('An unexpected error occurred during sign up.');
    }
  };

  const handleGoogleSignUp = () => {
    console.log('Sign up with Google');
    // Implement Google Sign-Up via OAuth if desired
  };

  const handleOutlookSignUp = () => {
    console.log('Sign up with Outlook');
    // Implement Outlook Sign-Up via OAuth if desired
  };

  // If we shouldn't render at all, return null
  if (!shouldRender) {
    return null;
  }

  // ----- MODAL VIEW LAYOUT -----
  if (isModalView) {
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-50 z-50 flex justify-center items-center">
        <div
          ref={modalRef}
          className="bg-white shadow-lg p-8 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl"
        >
          <h2 className="text-3xl font-semibold mb-6 text-center">Sign Up</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-lg font-medium mb-2"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Enter your username"
              />
            </div>

            {/* First Name */}
            <div>
              <label
                htmlFor="firstName"
                className="block text-lg font-medium mb-2"
              >
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Enter your first name"
              />
            </div>

            {/* Last Name */}
            <div>
              <label
                htmlFor="lastName"
                className="block text-lg font-medium mb-2"
              >
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Enter your last name"
              />
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="email"
                className="block text-lg font-medium mb-2"
              >
                Email Address
              </label>
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

            {/* Phone Number */}
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-lg font-medium mb-2"
              >
                Phone Number
              </label>
              <ReactPhoneInput
                country="us"
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                inputClass="w-full p-3 border border-gray-300 rounded-md"
                containerClass="w-full"
                placeholder="Enter your phone number"
                searchable={true}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-lg font-medium mb-2"
              >
                Password
              </label>
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
                Sign Up
              </button>
            </div>
          </form>

          {/* Google and Outlook Sign Up */}
          <div className="mt-6 text-center">
            <button
              onClick={handleGoogleSignUp}
              className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 mb-4 flex items-center justify-center"
            >
              <i className="fab fa-google mr-2"></i>
              Sign Up with Google
            </button>
            <button
              onClick={handleOutlookSignUp}
              className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 flex items-center justify-center"
            >
              <i className="fab fa-microsoft mr-2"></i>
              Sign Up with Outlook
            </button>
          </div>

          {/* Close Modal Button */}
          <div className="mt-4 text-center">
            <button onClick={onClose} className="text-blue-500 hover:underline">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----- NORMAL PAGE VIEW LAYOUT ("/sign-up") -----
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-lg p-8 rounded-lg w-full max-w-md">
        <h2 className="text-3xl font-semibold mb-6 text-center">Sign Up</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-lg font-medium mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              required
              value={formData.username}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-md"
              placeholder="Enter your username"
            />
          </div>

          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-lg font-medium mb-2">
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              required
              value={formData.firstName}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-md"
              placeholder="Enter your first name"
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-lg font-medium mb-2">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              required
              value={formData.lastName}
              onChange={handleInputChange}
              className="w-full p-3 border border-gray-300 rounded-md"
              placeholder="Enter your last name"
            />
          </div>

          {/* Email Address */}
          <div>
            <label htmlFor="email" className="block text-lg font-medium mb-2">
              Email Address
            </label>
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

          {/* Phone Number */}
          <div>
            <label htmlFor="phoneNumber" className="block text-lg font-medium mb-2">
              Phone Number
            </label>
            <ReactPhoneInput
              country="us"
              value={formData.phoneNumber}
              onChange={handlePhoneChange}
              inputClass="w-full p-3 border border-gray-300 rounded-md"
              containerClass="w-full"
              placeholder="Enter your phone number"
              searchable={true}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-lg font-medium mb-2">
              Password
            </label>
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
              Sign Up
            </button>
          </div>
        </form>

        {/* Google and Outlook Sign Up */}
        <div className="mt-6 text-center">
          <button
            onClick={handleGoogleSignUp}
            className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 mb-4 flex items-center justify-center"
          >
            <i className="fab fa-google mr-2"></i>
            Sign Up with Google
          </button>
          <button
            onClick={handleOutlookSignUp}
            className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 flex items-center justify-center"
          >
            <i className="fab fa-microsoft mr-2"></i>
            Sign Up with Outlook
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
