// src/components/layout/Header.jsx
import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/v6.webp';
import { AuthContext } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext.jsx';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from 'react-toastify';
import { 
  FaShoppingCart, 
  FaSun, 
  FaMoon, 
  FaHome, 
  FaRobot, 
  FaTools, 
  FaMicrochip,
  FaUser,
  FaTimes,
  FaBars,
  FaCircle,
  FaInfoCircle
} from 'react-icons/fa';
import './Header.css'; // Import custom Header CSS
// import { toggleDarkMode, isDarkMode } from '../utils/theme';
// import { handleGoogleProfileImage } from '../utils/imageUtils';

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
    setIsMenuOpen(prevState => !prevState);
  };

  return (
    <header className="main-header shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
        <Link to="/" className="flex-shrink-0 flex items-center mr-4">
          <img src={logo} alt="AI Waverider" className="min-w-[40px] w-10 md:w-12 h-auto site-logo" />
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center justify-center flex-grow">
          <ul className="flex nav-links items-center">
            <li className="nav-item flex items-center">
              <Link 
                to="/" 
                className="nav-link px-2 py-1 md:px-3 md:py-2 rounded-md font-medium flex items-center text-white hover:bg-opacity-10 hover:bg-white"
                aria-label="Home"
              >
                <FaHome className="mr-1.5" /> 
                <span>Home</span>
              </Link>
              <span className="nav-dot mx-2 text-[6px] text-white opacity-70">
                <FaCircle />
              </span>
            </li>
            <li className="nav-item flex items-center">
              <Link 
                to="/agents" 
                className="nav-link px-2 py-1 md:px-3 md:py-2 rounded-md font-medium flex items-center text-white hover:bg-opacity-10 hover:bg-white"
                aria-label="Agents"
              >
                <FaRobot className="mr-1.5" /> 
                <span>Agents</span>
              </Link>
              <span className="nav-dot mx-2 text-[6px] text-white opacity-70">
                <FaCircle />
              </span>
            </li>
            <li className="nav-item flex items-center">
              <Link 
                to="/ai-tools" 
                className="nav-link px-2 py-1 md:px-3 md:py-2 rounded-md font-medium flex items-center text-white hover:bg-opacity-10 hover:bg-white"
                aria-label="AI Tools"
              >
                <FaTools className="mr-1.5" /> 
                <span>AI Tools</span>
              </Link>
              <span className="nav-dot mx-2 text-[6px] text-white opacity-70">
                <FaCircle />
              </span>
            </li>
            <li className="nav-item flex items-center">
              <Link 
                to="/latest-tech" 
                className="nav-link px-2 py-1 md:px-3 md:py-2 rounded-md font-medium flex items-center text-white hover:bg-opacity-10 hover:bg-white"
                aria-label="Latest Tech"
              >
                <FaMicrochip className="mr-1.5" /> 
                <span>Latest Tech</span>
              </Link>
              <span className="nav-dot mx-2 text-[6px] text-white opacity-70">
                <FaCircle />
              </span>
            </li>
            <li className="nav-item flex items-center">
              <Link 
                to="/about" 
                className="nav-link px-2 py-1 md:px-3 md:py-2 rounded-md font-medium flex items-center text-white hover:bg-opacity-10 hover:bg-white"
                aria-label="About"
              >
                <FaInfoCircle className="mr-1.5" /> 
                <span>About Us</span>
              </Link>
            </li>
          </ul>
        </nav>
        
        {/* Right Section with Theme, Cart, Auth, and Mobile Menu Toggle */}
        <div className="flex items-center space-x-3 md:space-x-4">
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleDarkMode}
            className="theme-toggle-button tooltip-container flex-shrink-0"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <FaSun className="text-white" /> : <FaMoon className="text-white" />}
          </button>
          
          {/* Cart Icon - Visible on all screens */}
          <div className="cart-icon-container relative flex-shrink-0">
            <Link to="/checkout" className="text-white hover:text-[#00bcd4] block p-2" aria-label="Shopping Cart">
              <FaShoppingCart className="text-xl" />
              {itemCount > 0 && (
                <span className="cart-badge absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
          
          {/* Auth Buttons - Hidden on Mobile */}
          <div className="hidden md:flex items-center space-x-3">
            {!user && (
              <>
                <Link 
                  to="/sign-in" 
                  className="auth-link text-white hover:text-[#00bcd4] text-base whitespace-nowrap"
                >
                  Sign In
                </Link>
                <button
                  onClick={handleSignUp}
                  className="auth-button bg-[#16213e] hover:bg-[#00bcd4] text-white px-3 py-1.5 rounded-md text-sm whitespace-nowrap"
                >
                  Sign Up
                </button>
              </>
            )}

            {user && (
              <>
                {user.role === 'admin' && (
                  <Link to="/admin/agents" className="auth-link text-white hover:text-[#00bcd4] text-base whitespace-nowrap">
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="auth-button signout-button bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-sm whitespace-nowrap"
                >
                  Sign Out
                </button>
                <Link
                  to="/profile"
                  className="profile-avatar w-10 h-10 overflow-hidden rounded-full border-2 border-[#00bcd4] bg-white flex-shrink-0"
                >
                  <img
                    src={user?.photoURL || '/default-avatar.png'}
                    alt={`${user?.displayName || 'User'}'s Profile`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      if (e.target.src.indexOf('default-avatar.png') === -1) {
                        e.target.src = '/default-avatar.png';
                      }
                      e.target.onerror = null;
                    }}
                  />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button 
            ref={toggleButtonRef}
            className="md:hidden text-white hover:text-[#00bcd4] p-2 flex items-center justify-center flex-shrink-0"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu - Enhanced for better accessibility and UX */}
      {isMenuOpen && (
        <div 
          ref={mobileMenuRef}
          className="md:hidden mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <nav className="container mx-auto px-4 py-3">
            <ul className="space-y-1">
              <li className="mobile-nav-item">
                <Link
                  to="/"
                  className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-teal-600 flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaHome className="mr-3" /> Home
                </Link>
              </li>
              <li className="mobile-nav-item">
                <Link
                  to="/agents"
                  className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-teal-600 flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaRobot className="mr-3" /> Agents
                </Link>
              </li>
              <li className="mobile-nav-item">
                <Link
                  to="/ai-tools"
                  className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-teal-600 flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaTools className="mr-3" /> AI Tools
                </Link>
              </li>
              <li className="mobile-nav-item">
                <Link
                  to="/latest-tech"
                  className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-teal-600 flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaMicrochip className="mr-3" /> Latest Tech
                </Link>
              </li>
              <li className="mobile-nav-item">
                <Link
                  to="/about"
                  className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-teal-600 flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaInfoCircle className="mr-3" /> About
                </Link>
              </li>
              <li className="mobile-nav-item">
                <Link
                  to="/checkout"
                  className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-teal-600 flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaShoppingCart className="mr-3" /> Cart {itemCount > 0 ? `(${itemCount})` : ''}
                </Link>
              </li>
              
              {/* Dark/Light mode toggle on mobile */}
              <li className="mobile-nav-item">
                <button
                  onClick={() => {
                    toggleDarkMode();
                    setIsMenuOpen(false);
                  }}
                  className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-teal-600 flex items-center w-full"
                >
                  {darkMode ? <FaSun className="mr-3" /> : <FaMoon className="mr-3" />}
                  {darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                </button>
              </li>
              
              {/* Mobile-only auth options */}
              <li className="pt-2 mt-2 border-t border-gray-200">
                {!user && (
                  <div className="flex flex-col space-y-1">
                    <Link
                      to="/sign-in"
                      className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-teal-600"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <button
                      className="mx-4 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md text-center"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleSignUp();
                      }}
                    >
                      Sign Up
                    </button>
                  </div>
                )}
                
                {user && (
                  <div className="flex flex-col space-y-1">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-teal-600 flex items-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FaUser className="mr-3" /> Profile
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        to="/admin/agents"
                        className="block px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-teal-600"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleSignOut();
                      }}
                      className="mx-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-center mt-2"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
