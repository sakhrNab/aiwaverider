import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactPhoneInput from 'react-phone-input-2';  // Importing the phone input component
import 'react-phone-input-2/lib/style.css'; // Importing the library's styles

const SignUp = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
  });
  const navigate = useNavigate();
  const modalRef = useRef(null); // Ref to detect clicks outside modal

  useEffect(() => {
    // Close the modal when clicking outside
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();  // Close the modal
        navigate('/');  // Redirect to main page
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form Submitted', formData);
    navigate('/'); // Redirect to homepage after successful sign-up
    onClose(); // Close the modal after submission
  };

  const handleGoogleSignUp = () => {
    console.log('Sign up with Google');
  };

  const handleOutlookSignUp = () => {
    console.log('Sign up with Outlook');
  };

  return (
    isOpen ? (
      <div className="fixed inset-0 flex justify-center items-center bg-gray-500 bg-opacity-50 z-50">
        <div 
          ref={modalRef} 
          className="bg-white shadow-lg p-8 rounded-lg w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl"
        >
          <h2 className="text-3xl font-semibold mb-6 text-center">Sign Up</h2>
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

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-lg font-medium mb-2">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Enter your full name"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phoneNumber" className="block text-lg font-medium mb-2">Phone Number</label>
              <ReactPhoneInput
                country={'us'}
                value={formData.phoneNumber}
                onChange={(value) => setFormData({ ...formData, phoneNumber: value })}
                inputClass="w-full p-3 border border-gray-300 rounded-md"
                containerClass="w-full"
                placeholder="Enter your phone number"
                searchable={true}
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
            <button
              onClick={onClose}
              className="text-blue-500 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    ) : null
  );
};

export default SignUp;
