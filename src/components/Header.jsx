// src/components/Header.jsx

import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/v6.webp';
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext

const Header = ({ openSignUpModal }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Function to determine active route
  const isActive = (path) => location.pathname === path;

  const handleSearch = () => {
    if (searchTerm.trim() !== '') {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  const handleSignUp = () => {
    if (location.pathname === '/sign-in') {
      // If user is on the Sign In page, redirect to Sign Up page
      navigate('/sign-up');
    } else {
      // If user is on the Homepage or any other page, open the modal
      openSignUpModal();
    }
  };

  // Get user and signOutUser from context
  const { user, signOutUser, token } = useContext(AuthContext); // Include token if needed
  const role = user?.role;
  return (
    <header className="bg-gray-800 text-white px-4 py-3 shadow-lg">
      <div className="flex flex-wrap justify-between items-center">
        {/* Logo and Title */}
        <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
          <img 
            src={logo} 
            alt="Logo" 
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover transition-transform hover:scale-110" 
          />
          <h1 className="text-lg sm:text-xl font-bold whitespace-nowrap">AI Wave Rider</h1>
        </div>

        {/* Hamburger Menu Button */}
        <button 
          className="lg:hidden ml-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
            />
          </svg>
        </button>

        {/* Navigation Links - Desktop */}
        <nav 
          className={`${isMenuOpen ? 'flex' : 'hidden'} lg:flex flex-col lg:flex-row w-full lg:w-auto lg:items-center lg:space-x-4 mt-4 lg:mt-0`}
        >
          {/* Auth Buttons */}
          {/* Show Sign In / Sign Up if NOT authenticated */}
          {!user && (
            <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-2">
              <Link 
                to="/sign-in" 
                className={`px-3 py-1.5 text-center bg-transparent hover:bg-blue-600 rounded-md transition-colors duration-200 text-sm sm:text-base
                  ${isActive('/sign-in') ? 'bg-blue-600' : 'bg-transparent hover:bg-blue-600'}`}
              >
                Sign In
              </Link>
              <button
                onClick={handleSignUp}
                className={`px-3 py-1.5 text-center bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-200 text-sm sm:text-base font-medium
                  ${isActive('/sign-up') ? 'bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* If authenticated, show Sign Out */}
          {user && (
            <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-2">
              {/* If admin, you can add an Admin link */}
              {role === 'admin' && (
                <Link
                  to="/admin"
                  className="px-4 py-2 hover:bg-blue-600 rounded text-center"
                >
                  Admin Dashboard
                </Link>
              )}
              <button
                onClick={() => {
                  signOutUser(); // Updated from signOutUser to signOut
                  navigate('/');
                }}
                className="px-3 py-1.5 text-center bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-200 text-sm sm:text-base font-medium"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Main Navigation */}
          <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-4 mt-4 lg:mt-0">
            <Link to="/ai-tools" className="px-4 py-2 hover:bg-blue-600 rounded text-center">AI Tools</Link>
            <Link to="/trends" className="px-4 py-2 hover:bg-blue-600 rounded text-center">Trends</Link>
            <Link to="/latest-tech" className="px-4 py-2 hover:bg-blue-600 rounded text-center">Latest Tech</Link>
          </div>

          {/* Community Button */}
          <button
            className="px-4 py-2 bg-yellow-500 rounded hover:bg-yellow-600 text-center mt-2 lg:mt-0"
            onClick={() => console.log("Join Our Community clicked")}
          >
            Join Our Community
          </button>

          {/* Search Field */}
          <div className="mt-4 lg:mt-0 w-full lg:w-auto">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="px-4 py-2 rounded border border-gray-300 focus:outline-none text-gray-800 w-full lg:w-auto"
              />
              <button 
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Search
              </button>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
