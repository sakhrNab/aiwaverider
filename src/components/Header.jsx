// src/components/Header.jsx
import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/v6.webp';
import { AuthContext } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import './Header.css'; // Import custom Header CSS

const Header = ({ openSignUpModal }) => {
  const { user, signOut } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // For toggling mobile navigation
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // For the search input
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to highlight active route (optional)
  const isActive = (path) => location.pathname === path;
  
  // Check if current page is an admin page
  const isAdminPage = location.pathname.startsWith('/admin');
  
  // Add/remove admin-page class to body
  useEffect(() => {
    if (isAdminPage) {
      document.body.classList.add('admin-page');
    } else {
      document.body.classList.remove('admin-page');
    }
    
    // Cleanup function
    return () => {
      document.body.classList.remove('admin-page');
    };
  }, [isAdminPage]);

  // Handle search
  const handleSearch = () => {
    if (searchTerm.trim() !== '') {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  // If we're already on /sign-in, going to sign up should push /sign-up
  const handleSignUp = () => {
    if (location.pathname === '/sign-in') {
      navigate('/sign-up');
    } else {
      openSignUpModal();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Successfully signed out');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out. Please try again.');
    }
  };

  return (
    <header className="bg-gray-800 text-white px-4 py-3 shadow-lg main-header">
      <div className="container mx-auto flex items-center justify-between">
        {/* Left group: Logo and main nav */}
        <div className="flex items-center flex-1 space-x-2 md:space-x-4">
          <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/')}>
            <img
              src={logo}
              alt="Logo"
              className="h-8 w-8 md:h-10 md:w-10 rounded-full object-cover transition-transform hover:scale-110"
            />
          </div>

          {/* Main Nav (hidden on mobile, shown on md and up) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-3 xl:space-x-4 nav-links">
            <Link to="/agents" className="px-2 lg:px-3 py-2 hover:bg-blue-600 rounded text-sm lg:text-base font-medium nav-link">
              Agents
            </Link>
            <Link to="/ai-tools" className="px-2 lg:px-3 py-2 hover:bg-blue-600 rounded text-sm lg:text-base nav-link">
              AI Tools
            </Link>
            <Link to="/trends" className="px-2 lg:px-3 py-2 hover:bg-blue-600 rounded text-sm lg:text-base nav-link">
              Trends
            </Link>
            <Link to="/latest-tech" className="px-2 lg:px-3 py-2 hover:bg-blue-600 rounded text-sm lg:text-base nav-link">
              Latest Tech
            </Link>
          </nav>
        </div>

        {/* Center group: Search (hidden on mobile) */}
        <div className="hidden md:flex items-center justify-center flex-1 max-w-md px-2 lg:px-4">
          <div className="w-full flex items-center space-x-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 rounded-l border border-gray-300 text-gray-800 search-input"
            />
            <button onClick={handleSearch} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-r whitespace-nowrap search-button">
              Search
            </button>
          </div>
        </div>

        {/* Right group: Auth buttons and profile */}
        <div className="flex items-center justify-end space-x-2 md:space-x-3 flex-shrink-0 auth-buttons">
          {!user && (
            <div className="hidden md:flex items-center space-x-2 md:space-x-3">
              <Link to="/sign-in" className="px-3 py-2 hover:bg-blue-600 rounded auth-link">
                Sign In
              </Link>
              <button
                onClick={handleSignUp}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium auth-button"
              >
                Sign Up
              </button>
            </div>
          )}

          {user && (
            <div className="hidden md:flex items-center space-x-2 md:space-x-3">
              {user.role === 'admin' && (
                <Link to="/admin/agents" className="px-3 py-2 hover:bg-blue-600 rounded auth-link">
                  Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded font-medium auth-button"
              >
                Sign Out
              </button>
              <Link
                to="/profile"
                className="block w-10 h-10 rounded-full overflow-hidden border-2 border-white"
              >
                <img
                  src={user?.photoURL || '/default-avatar.png'}
                  alt={`${user?.displayName || 'User'}'s Profile`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Only set default if not already default
                    if (e.target.src.indexOf('default-avatar.png') === -1) {
                      console.log('Header: Avatar image failed to load, using default');
                      e.target.src = '/default-avatar.png';
                    }
                    // Prevent infinite error handling
                    e.target.onerror = null;
                  }}
                />
              </Link>
            </div>
          )}

          {/* Hamburger menu icon */}
          <button 
            className="md:hidden p-2 hover:bg-gray-700 rounded mobile-menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-4 border-t border-gray-700 pt-4">
          <nav className="flex flex-col space-y-2">
            <Link to="/agents" className="px-3 py-2 hover:bg-blue-600 rounded">
              Agents
            </Link>
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
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium text-left"
                >
                  Sign Up
                </button>
              </>
            )}
            {user && (
              <>
                <Link to="/profile" className="px-3 py-2 hover:bg-blue-600 rounded">
                  Profile
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin/agents" className="px-3 py-2 hover:bg-blue-600 rounded">
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded font-medium text-left"
                >
                  Sign Out
                </button>
              </>
            )}
          </nav>

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
        </div>
      )}
    </header>
  );
};

export default Header;
