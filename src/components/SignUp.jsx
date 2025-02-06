// src/components/SignUp.jsx

import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import ReactPhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import '../styles/signup.css'; // Import the signup.css
import { signUp, signUpWithGoogle, signUpWithMicrosoft } from '../utils/api'; // Import the signUp API functions
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faMicrosoft } from '@fortawesome/free-brands-svg-icons';
import debounce from 'lodash.debounce';
import { validateEmail } from '../utils/emailValidator';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// Add firebase import
import firebase from 'firebase/compat/app';
import { auth } from '../utils/firebase';

// Define PasswordRequirements outside of SignUp for effective memoization
const PasswordRequirements = React.memo(({ validation }) => (
  <div className="text-sm text-gray-600 mt-2">
    <p>
      <span className={validation.hasLength ? 'text-green-600' : 'text-red-600'}>
        {validation.hasLength ? '✓' : '✗'}
      </span>{' '}
      At least 8 characters
    </p>
    <p>
      <span className={validation.hasUpper ? 'text-green-600' : 'text-red-600'}>
        {validation.hasUpper ? '✓' : '✗'}
      </span>{' '}
      At least one uppercase letter
    </p>
    <p>
      <span className={validation.hasLower ? 'text-green-600' : 'text-red-600'}>
        {validation.hasLower ? '✓' : '✗'}
      </span>{' '}
      At least one lowercase letter
    </p>
    <p>
      <span className={validation.hasNumber ? 'text-green-600' : 'text-red-600'}>
        {validation.hasNumber ? '✓' : '✗'}
      </span>{' '}
      At least one number
    </p>
    <p>
      <span className={validation.hasSpecial ? 'text-green-600' : 'text-red-600'}>
        {validation.hasSpecial ? '✓' : '✗'}
      </span>{' '}
      At least one special character (@$!%*?&)
    </p>
  </div>
));

PasswordRequirements.propTypes = {
  validation: PropTypes.shape({
    hasLength: PropTypes.bool.isRequired,
    hasUpper: PropTypes.bool.isRequired,
    hasLower: PropTypes.bool.isRequired,
    hasNumber: PropTypes.bool.isRequired,
    hasSpecial: PropTypes.bool.isRequired,
  }).isRequired,
};

// Define PasswordInput outside of SignUp and memoize it
const PasswordInput = React.memo(({ password, onChange, validation }) => (
  <div className="form-group">
    <label htmlFor="password" className="form-label">Password</label>
    <input
      type="password"
      id="password"
      name="password"
      required
      aria-required="true"
      value={password}
      onChange={onChange}
      className={`form-input ${validation.isValid ? 'border-green-500' : ''}`}
      placeholder="Enter your password"
    />
    <PasswordRequirements validation={validation} />
  </div>
));

PasswordInput.propTypes = {
  password: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  validation: PropTypes.shape({
    hasLength: PropTypes.bool.isRequired,
    hasUpper: PropTypes.bool.isRequired,
    hasLower: PropTypes.bool.isRequired,
    hasNumber: PropTypes.bool.isRequired,
    hasSpecial: PropTypes.bool.isRequired,
  }).isRequired,
};

const SignUp = ({ isOpen, onClose }) => {
  // Define a default no-op function to prevent errors when onClose is undefined
  const noop = () => {};

  const handleClose = isOpen !== undefined ? onClose : noop;

  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: false,
    hasLength: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
  });
  const [emailError, setEmailError] = useState('');
  const [emailWarning, setEmailWarning] = useState('');
  const navigate = useNavigate();
  const modalRef = useRef(null);

  // If isOpen is undefined, that means we're on /sign-up as a "page" rather than a modal.
  const isModalView = isOpen !== undefined;

  // Decide if the SignUp component should render.
  // - If it's a modal scenario, only render if `isOpen` is true.
  // - If it's a normal page scenario, always render.
  const shouldRender = isModalView ? isOpen : true;
  const { signInUser } = useContext(AuthContext);

  useEffect(() => {
    if (!isModalView) return; // If this is a normal page view, skip the outside-click logic

    // Close the modal if clicking outside
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClose, isModalView]);

  // Update the validatePassword function to not trigger re-renders
  const validatePassword = useCallback((password) => {
    setPasswordValidation({
      hasLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[@$!%*?&]/.test(password),
      isValid: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password),
    });
  }, []);

  // Use debounce for password validation
  const debouncedValidatePassword = useCallback(
    debounce((value) => validatePassword(value), 100),
    [validatePassword]
  );

  // Clean up debounce on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      debouncedValidatePassword.cancel();
    };
  }, [debouncedValidatePassword]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    if (name === 'password') {
      debouncedValidatePassword(value);
    }
  }, [debouncedValidatePassword]);

  const handlePhoneChange = (value) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      phoneNumber: value,
    }));
  };

  const handleEmailChange = (e) => {
    const { value } = e.target;
    const validation = validateEmail(value);
    
    setEmailError(validation.isValid ? '' : validation.message);
    setEmailWarning(validation.warning || '');
    
    handleInputChange(e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Validate email
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        setError(emailValidation.message);
        return;
      }

      // Validate password
      if (!passwordValidation.isValid) {
        setError('Please ensure your password meets all requirements');
        return;
      }

      // Attempt signup
      const { user } = await signUp(formData);
      
      if (user) {
        toast.success('Account created successfully!');
        navigate('/');
        if (isModalView) {
          handleClose();
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle Firebase specific errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('An account with this email already exists');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address');
          break;
        case 'auth/weak-password':
          setError('Password is too weak. Please follow the password requirements');
          break;
        default:
          setError(error.message || 'An unexpected error occurred during sign up');
      }
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const result = await signUpWithGoogle();
      if (result.firebaseUser) {
        await signInUser(result.firebaseUser, true);
        toast.success('Successfully signed up with Google!');
        navigate('/', { replace: true });
        if (isModalView) handleClose();
      }
    } catch (error) {
      console.error("Google Sign-up Error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-up popup was closed before completion');
      } else {
        toast.error(`Google Sign-up failed: ${error.message}`);
      }
    }
  };

  // NEW: Microsoft sign-up (mirrors Google sign-up)
  const handleMicrosoftSignUp = async () => {
    try {
      const result = await signUpWithMicrosoft();
      if (result.firebaseUser) {
        await signInUser(result.firebaseUser, true);
        toast.success('Successfully signed up with Microsoft!');
        navigate('/', { replace: true });
        if (isModalView) handleClose();
      }
    } catch (error) {
      console.error("Microsoft Sign-up Error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-up popup was closed before completion');
      } else {
        toast.error(`Microsoft Sign-up failed: ${error.message}`);
      }
    }
  };
  // If we shouldn't render at all, return null
  if (!shouldRender) {
    return null;
  }

  // Add error display to both modal and page layouts
  const errorDisplay = error && (
    <div className="text-red-500 text-center mb-4 p-2 bg-red-50 rounded">
      {error}
    </div>
  );

  // ----- MODAL VIEW LAYOUT -----
  if (isModalView) {
    return (
      <div className="modal-overlay">
        <div
          ref={modalRef}
          className="modal-content"
        >
          <h2 className="modal-title">Sign Up</h2>
          {errorDisplay}
          <form onSubmit={handleSubmit} className="signup-form">
            {/* Username */}
            <div className="form-group">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                required
                aria-required="true"
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
                aria-required="true"
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
                aria-required="true"
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
                aria-required="true"
                value={formData.email}
                onChange={handleEmailChange}
                className={`form-input ${emailError ? 'border-red-500' : emailWarning ? 'border-yellow-500' : ''}`}
                placeholder="Enter your email"
              />
              {emailError && (
                <p className="text-red-500 text-sm mt-1">{emailError}</p>
              )}
              {emailWarning && !emailError && (
                <p className="text-yellow-500 text-sm mt-1">{emailWarning}</p>
              )}
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
            <PasswordInput
              password={formData.password}
              onChange={handleInputChange}
              validation={passwordValidation}
            />

            {/* Submit Button */}
            <div className="button-group">
              <button type="submit" className="button primary">
                Sign Up
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="button secondary"
                aria-label="Cancel sign up"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Google and Microsoft Sign Up */}
          <div className="mt-6 text-center">
            <button
              onClick={handleGoogleSignUp}
              className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 mb-4 flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faGoogle} className="mr-2" />
              Sign Up with Google
            </button>
            <button
              onClick={handleMicrosoftSignUp}
              className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faMicrosoft} className="mr-2" />
              Sign Up with Microsoft
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
        {errorDisplay}
        <form onSubmit={handleSubmit} className="signup-form">
            {/* Username */}
            <div className="form-group">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                required
                aria-required="true"
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
                aria-required="true"
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
                aria-required="true"
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
                aria-required="true"
                value={formData.email}
                onChange={handleEmailChange}
                className={`form-input ${emailError ? 'border-red-500' : emailWarning ? 'border-yellow-500' : ''}`}
                placeholder="Enter your email"
              />
              {emailError && (
                <p className="text-red-500 text-sm mt-1">{emailError}</p>
              )}
              {emailWarning && !emailError && (
                <p className="text-yellow-500 text-sm mt-1">{emailWarning}</p>
              )}
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
            <PasswordInput
              password={formData.password}
              onChange={handleInputChange}
              validation={passwordValidation}
            />

            {/* Submit Button */}
            <div className="button-group">
              <button type="submit" className="button primary">
                Sign Up
              </button>
              {/* Cancel button is only rendered if it's a modal view */}
              {isModalView && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="button secondary"
                  aria-label="Cancel sign up"
                >
                  Cancel
                </button>
              )}
            </div>
        </form>

        {/* Google and Microsoft Sign Up */}
        <div className="mt-6 text-center">
          <button
            onClick={handleGoogleSignUp}
            className="w-full py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 mb-4 flex items-center justify-center"
          >
            <FontAwesomeIcon icon={faGoogle} className="mr-2" />
            Sign Up with Google
          </button>
          <button
            onClick={handleMicrosoftSignUp}
            className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 flex items-center justify-center"
          >
            <FontAwesomeIcon icon={faMicrosoft} className="mr-2" />
            Sign Up with Microsoft
          </button>
        </div>
      </div>
    </div>
  );
};

SignUp.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
};

SignUp.defaultProps = {
  isOpen: undefined,
  onClose: () => {}, // Default to no-op function
};

export default SignUp;
