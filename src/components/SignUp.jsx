// src/components/SignUp.jsx

import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactPhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import '../styles/signup.css'; // Import the signup.css
import { signUp } from '../utils/api'; // Import the signUp API function
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faMicrosoft } from '@fortawesome/free-brands-svg-icons';

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
      <div className="modal-overlay">
        <div
          ref={modalRef}
          className="modal-content"
        >
          <h2 className="modal-title">Sign Up</h2>
          <form onSubmit={handleSubmit} className="signup-form">
            {/* Username */}
            <div className="form-group">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your username"
              />
            </div>

            {/* First Name */}
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your first name"
              />
            </div>

            {/* Last Name */}
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your last name"
              />
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your email"
              />
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label htmlFor="phoneNumber" className="form-label">Phone Number</label>
              <ReactPhoneInput
                country="us"
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                inputClass="phone-input-container"
                placeholder="Enter your phone number"
                searchable={true}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your password"
              />
            </div>

            {/* Submit Button */}
            <div className="button-group">
              <button type="submit" className="button primary">
                Sign Up
              </button>
              <button type="button" onClick={onClose} className="button secondary">
                Cancel
              </button>
            </div>
          </form>

          {/* Google and Outlook Sign Up */}
          <div className="mt-6 text-center">
            <button
              onClick={handleGoogleSignUp}
              className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 mb-4 flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faGoogle} className="mr-2" />
              Sign Up with Google
            </button>
            <button
              onClick={handleOutlookSignUp}
              className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faMicrosoft} className="mr-2" />
              Sign Up with Outlook
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
        <form onSubmit={handleSubmit} className="signup-form">
            {/* Username */}
            <div className="form-group">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your username"
              />
            </div>

            {/* First Name */}
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your first name"
              />
            </div>

            {/* Last Name */}
            <div className="form-group">
              <label htmlFor="lastName" className="form-label">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your last name"
              />
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your email"
              />
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label htmlFor="phoneNumber" className="form-label">Phone Number</label>
              <ReactPhoneInput
                country="us"
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                inputClass="phone-input-container"
                placeholder="Enter your phone number"
                searchable={true}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your password"
              />
            </div>

            {/* Submit Button */}
            <div className="button-group">
              <button type="submit" className="button primary">
                Sign Up
              </button>
              <button type="button" onClick={onClose} className="button secondary">
                Cancel
              </button>
            </div>
          </form>

        {/* Google and Outlook Sign Up */}
        <div className="mt-6 text-center">
          <button
            onClick={handleGoogleSignUp}
            className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 mb-4 flex items-center justify-center"
          >
            <FontAwesomeIcon icon={faGoogle} className="mr-2" />
            Sign Up with Google
          </button>
          <button
            onClick={handleOutlookSignUp}
            className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 flex items-center justify-center"
          >
            <FontAwesomeIcon icon={faMicrosoft} className="mr-2" />
            Sign Up with Outlook
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
