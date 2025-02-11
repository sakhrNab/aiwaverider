// src/components/Header.jsx
import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/v6.webp';
import { AuthContext } from '../contexts/AuthContext';

const Header = ({ openSignUpModal }) => {
  const { user, signOutUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // For toggling mobile navigation
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // For the search input
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to highlight active route (optional)
  const isActive = (path) => location.pathname === path;

  // Handle search
  const handleSearch = () => {
    if (searchTerm.trim() !== '') {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  // If we’re already on /sign-in, going to sign up should push /sign-up
  const handleSignUp = () => {
    if (location.pathname === '/sign-in') {
      navigate('/sign-up');
    } else {
      openSignUpModal();
    }
  };

  return (
    <header className="bg-gray-800 text-white px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between flex-wrap">

        {/* Left group: Logo and main nav */}
        <div className="flex items-center space-x-4">
          {/* Clicking on the logo navigates to home */}
          <div className="cursor-pointer" onClick={() => navigate('/')}>
            <img
              src={logo}
              alt="Logo"
              className="h-10 w-10 rounded-full object-cover transition-transform hover:scale-110"
            />
          </div>

          {/* Main Nav (hidden on mobile, shown on sm and up) */}
          <nav className="hidden sm:flex items-center space-x-2">
            <Link to="/ai-tools" className="px-3 py-2 hover:bg-blue-600 rounded">
              AI Tools
            </Link>
            <Link to="/trends" className="px-3 py-2 hover:bg-blue-600 rounded">
              Trends
            </Link>
            <Link to="/latest-tech" className="px-3 py-2 hover:bg-blue-600 rounded">
              Latest Tech
            </Link>
            {!user && (
              <>
                <Link to="/sign-in" className="px-3 py-2 hover:bg-blue-600 rounded">
                  Sign In
                </Link>
                <button
                  onClick={handleSignUp}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
                >
                  Sign Up
                </button>
              </>
            )}

            {user && (
              <>
                {user.role === 'admin' && (
                  <Link to="/admin" className="px-3 py-2 hover:bg-blue-600 rounded">
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={() => {
                    signOutUser();
                    navigate('/');
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded font-medium"
                >
                  Sign Out
                </button>
              </>
            )}
          </nav>

          {/* Search field (hidden on mobile, sm and above) */}
          <div className="hidden sm:flex items-center space-x-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="px-3 py-2 rounded border border-gray-300 text-gray-800"
            />
            <button onClick={handleSearch} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded">
              Search
            </button>
          </div>
        </div>

        {/* Right group: If user is signed in, show their avatar */}
        {user && (
          <div className="flex items-center">
            <Link
              to="/profile"
              className="block w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white"
            >
              <img
                src={user.photoURL || '/default-avatar.png'}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </Link>
          </div>
        )}

        {/* Hamburger menu icon for mobile */}
        <button className="lg:hidden ml-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                isMenuOpen
                  ? 'M6 18L18 6M6 6l12 12'
                  : 'M4 6h16M4 12h16M4 18h16'
              }
            />
          </svg>
        </button>
      </div>

      {/* Mobile nav & search */}
      {isMenuOpen && (
        <nav className="sm:hidden mt-4">
          {/* Mobile Navigation links */}
          <div className="flex flex-col space-y-2">
            <Link to="/ai-tools" className="px-3 py-2 hover:bg-blue-600 rounded">
              AI Tools
            </Link>
            <Link to="/trends" className="px-3 py-2 hover:bg-blue-600 rounded">
              Trends
            </Link>
            <Link to="/latest-tech" className="px-3 py-2 hover:bg-blue-600 rounded">
              Latest Tech
            </Link>
            <Link to="/profile" className="px-3 py-2 hover:bg-blue-600 rounded">
              Profile
            </Link>

            {!user && (
              <>
                <Link to="/sign-in" className="px-3 py-2 hover:bg-blue-600 rounded">
                  Sign In
                </Link>
                <button
                  onClick={handleSignUp}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
                >
                  Sign Up
                </button>
              </>
            )}

            {user && (
              <>
                {user.role === 'admin' && (
                  <Link to="/admin" className="px-3 py-2 hover:bg-blue-600 rounded">
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={() => {
                    signOutUser();
                    navigate('/');
                  }}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded font-medium"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>

          {/* Mobile search */}
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="flex-1 px-3 py-2 rounded-l border border-gray-300 text-gray-800"
              />
              <button onClick={handleSearch} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-r">
                Search
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
