// src/components/Header.jsx
import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/v6.webp';
import { AuthContext } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext.jsx';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';
import { 
  FaShoppingCart, 
  FaSun, 
  FaMoon, 
  FaHome, 
  FaRobot, 
  FaTools, 
  FaChartLine, 
  FaMicrochip 
} from 'react-icons/fa';
import './Header.css'; // Import custom Header CSS

const Header = ({ openSignUpModal }) => {
  const { user, signOut } = useContext(AuthContext);
  const { cart, itemCount } = useCart();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const mobileMenuRef = useRef(null);
  const toggleButtonRef = useRef(null);

  // For toggling mobile navigation
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Check if current page is an admin page
  const isAdminPage = location.pathname.startsWith('/admin');
  
  // Toggle body class when menu opens/closes
  useEffect(() => {
    const body = document.querySelector('body');
    if (isMenuOpen) {
      body.classList.add('menu-open');
    } else {
      body.classList.remove('menu-open');
    }
    
    return () => {
      body.classList.remove('menu-open');
    };
  }, [isMenuOpen]);
  
  // Add/remove admin-page class to body
  useEffect(() => {
    const body = document.querySelector('body');
    if (isAdminPage) {
      body.classList.add('admin-page');
    } else {
      body.classList.remove('admin-page');
    }
    
    // Cleanup function
    return () => {
      body.classList.remove('admin-page');
    };
  }, [isAdminPage]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isMenuOpen && 
        mobileMenuRef.current && 
        !mobileMenuRef.current.contains(event.target) &&
        toggleButtonRef.current && 
        !toggleButtonRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Close mobile menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMenuOpen]);

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

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    console.log('Toggle menu button clicked, current state:', isMenuOpen); // Debug log
    setIsMenuOpen(prevState => !prevState);
  };

  return (
      <header className="main-header w-full bg-[#1a1a2e] text-white py-4 px-6 shadow-md relative z-[100]">
        <div className="container mx-auto flex items-center justify-between">
          {/* Left group: Logo and main nav */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 cursor-pointer logo-container" onClick={() => navigate('/')}>
              <img
                src={logo}
                alt="Logo"
                className="h-10 w-10 rounded-full object-cover transition-transform hover:scale-110"
              />
            </div>

            {/* Main Nav (hidden on mobile, shown on md and up) */}
            <nav className="hidden md:flex items-center space-x-6 nav-links">
              <Link to="/" className="nav-link text-lg font-medium text-white no-underline px-3 py-2 rounded-md transition-all duration-300 hover:text-[#00bcd4] hover:bg-opacity-10 hover:bg-[#00bcd4]">
                <FaHome className="inline-block mr-1" /> Home
              </Link>
              <Link to="/agents" className="nav-link text-lg font-medium text-white no-underline px-3 py-2 rounded-md transition-all duration-300 hover:text-[#00bcd4] hover:bg-opacity-10 hover:bg-[#00bcd4]">
                <FaRobot className="inline-block mr-1" /> Agents
              </Link>
              <Link to="/ai-tools" className="nav-link text-lg font-medium text-white no-underline px-3 py-2 rounded-md transition-all duration-300 hover:text-[#00bcd4] hover:bg-opacity-10 hover:bg-[#00bcd4]">
                <FaTools className="inline-block mr-1" /> AI Tools
              </Link>
              <Link to="/trends" className="nav-link text-lg font-medium text-white no-underline px-3 py-2 rounded-md transition-all duration-300 hover:text-[#00bcd4] hover:bg-opacity-10 hover:bg-[#00bcd4]">
                <FaChartLine className="inline-block mr-1" /> Trends
              </Link>
              <Link to="/latest-tech" className="nav-link text-lg font-medium text-white no-underline px-3 py-2 rounded-md transition-all duration-300 hover:text-[#00bcd4] hover:bg-opacity-10 hover:bg-[#00bcd4]">
                <FaMicrochip className="inline-block mr-1" /> Latest Tech
              </Link>
            </nav>
          </div>

          {/* Right group: Auth buttons and profile */}
          <div className="flex items-center space-x-3 auth-buttons">
            {/* Cart Icon (Removed Checkout Button) */}
            <div className="cart-container hidden md:flex items-center">
              <Link to="/checkout" className="cart-icon-container relative inline-block text-white hover:text-[#00bcd4] transition-colors duration-300">
                <FaShoppingCart className="text-xl" />
                {itemCount > 0 && (
                  <span className="cart-badge absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
            
            {!user && (
              <div className="hidden md:flex items-center space-x-3">
                <Link to="/sign-in" className="auth-link text-white font-medium hover:text-[#00bcd4] transition-colors duration-300">
                  Sign In
                </Link>
                <button
                  onClick={handleSignUp}
                  className="auth-button bg-[#00bcd4] hover:bg-[#0097a7] text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
                >
                  Sign Up
                </button>
              </div>
            )}

            {user && (
              <div className="hidden md:flex items-center space-x-3">
                {user.role === 'admin' && (
                  <Link to="/admin/agents" className="auth-link text-white font-medium hover:text-[#00bcd4] transition-colors duration-300">
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="auth-button signout-button bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300"
                >
                  Sign Out
                </button>
                <Link
                  to="/profile"
                  className="profile-avatar w-10 h-10 overflow-hidden rounded-full border-2 border-[#00bcd4]"
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

            {/* Theme toggle button - moved to the rightmost position */}
            <button 
              onClick={toggleDarkMode} 
              className="theme-toggle-button hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-opacity-10 bg-white hover:bg-opacity-20 transition-all duration-300 tooltip-container"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Enable Light Mode' : 'Enable Dark Mode'}>
              {darkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-blue-400" />}
            </button>

            {/* Hamburger menu icon - Only shown on mobile */}
            <button 
              type="button"
              ref={toggleButtonRef}
              className="mobile-menu-toggle md:hidden flex flex-col justify-center items-center w-10 h-10 p-2 z-50"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <span className={`hamburger-line w-6 h-0.5 bg-white my-0.5 transition-all duration-300 ${isMenuOpen ? 'transform rotate-45 translate-y-1.5' : ''}`}></span>
              <span className={`hamburger-line w-6 h-0.5 bg-white my-0.5 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`hamburger-line w-6 h-0.5 bg-white my-0.5 transition-all duration-300 ${isMenuOpen ? 'transform -rotate-45 -translate-y-1.5' : ''}`}></span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div 
          ref={mobileMenuRef} 
          className={`mobile-menu fixed top-[72px] left-0 w-full h-screen bg-[#1a1a2e] z-50 transform transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${isMenuOpen ? 'block' : 'block'}`}
          aria-hidden={!isMenuOpen}
        >
          <nav className="mobile-nav flex flex-col p-4">
            {/* Theme toggle in mobile menu */}
            <button 
              onClick={toggleDarkMode}
              className="mobile-nav-link text-white font-medium py-3 border-b border-gray-700 hover:bg-[#292949] flex justify-between items-center"
              title={darkMode ? 'Enable Light Mode' : 'Enable Dark Mode'}
            >
              <span>{darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              {darkMode ? <FaSun className="text-yellow-400" /> : <FaMoon className="text-blue-400" />}
            </button>
            
            <Link to="/" className="mobile-nav-link text-white font-medium py-3 border-b border-gray-700 hover:bg-[#292949]" onClick={() => setIsMenuOpen(false)}>
              <FaHome className="inline-block mr-2" /> Home
            </Link>
            <Link to="/agents" className="mobile-nav-link text-white font-medium py-3 border-b border-gray-700 hover:bg-[#292949]" onClick={() => setIsMenuOpen(false)}>
              <FaRobot className="inline-block mr-2" /> Agents
            </Link>
            <Link to="/ai-tools" className="mobile-nav-link text-white font-medium py-3 border-b border-gray-700 hover:bg-[#292949]" onClick={() => setIsMenuOpen(false)}>
              <FaTools className="inline-block mr-2" /> AI Tools
            </Link>
            <Link to="/trends" className="mobile-nav-link text-white font-medium py-3 border-b border-gray-700 hover:bg-[#292949]" onClick={() => setIsMenuOpen(false)}>
              <FaChartLine className="inline-block mr-2" /> Trends
            </Link>
            <Link to="/latest-tech" className="mobile-nav-link text-white font-medium py-3 border-b border-gray-700 hover:bg-[#292949]" onClick={() => setIsMenuOpen(false)}>
              <FaMicrochip className="inline-block mr-2" /> Latest Tech
            </Link>
            {/* Cart in mobile menu */}
            <Link to="/checkout" className="mobile-nav-link text-white font-medium py-3 border-b border-gray-700 hover:bg-[#292949]" onClick={() => setIsMenuOpen(false)}>
              Cart {itemCount > 0 ? `(${itemCount})` : ''}
            </Link>
            {!user && (
              <>
                <Link to="/sign-in" className="mobile-nav-link text-white font-medium py-3 border-b border-gray-700 hover:bg-[#292949]" onClick={() => setIsMenuOpen(false)}>
                  Sign In
                </Link>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleSignUp();
                  }}
                  className="mobile-nav-button mt-3 bg-[#00bcd4] hover:bg-[#0097a7] text-white font-medium py-2 px-4 rounded-md w-full"
                >
                  Sign Up
                </button>
              </>
            )}
            {user && (
              <>
                <Link to="/profile" className="mobile-nav-link text-white font-medium py-3 border-b border-gray-700 hover:bg-[#292949]" onClick={() => setIsMenuOpen(false)}>
                  Profile
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin/agents" className="mobile-nav-link text-white font-medium py-3 border-b border-gray-700 hover:bg-[#292949]" onClick={() => setIsMenuOpen(false)}>
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleSignOut();
                  }}
                  className="mobile-nav-button signout mt-3 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md w-full"
                >
                  Sign Out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
  );
};

export default Header;
