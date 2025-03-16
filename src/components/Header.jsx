// src/components/Header.jsx
import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/v6.webp';
import { AuthContext } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext.jsx';
import { toast } from 'react-toastify';
import { FaShoppingCart } from 'react-icons/fa';
import SearchBar from '../components/agents/SearchBar';
import './Header.css'; // Import custom Header CSS

const Header = ({ openSignUpModal }) => {
  const { user, signOut } = useContext(AuthContext);
  const { cart, itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const mobileMenuRef = useRef(null);
  const toggleButtonRef = useRef(null);

  // For toggling mobile navigation
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // For the search input
  const [searchTerm, setSearchTerm] = useState('');

  // Helper to highlight active route (optional)
  const isActive = (path) => location.pathname === path;
  
  // Check if current page is an admin page
  const isAdminPage = location.pathname.startsWith('/admin');
  
  // Determine if we should show search bar (only on homepage and agents page)
  const shouldShowSearchBar = location.pathname === '/' || location.pathname === '/agents';
  
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

  // Initialize searchTerm from URL when it exists
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const queryFromUrl = queryParams.get('q');
    
    if (queryFromUrl) {
      setSearchTerm(queryFromUrl);
    } else if (searchTerm && !location.search.includes('q=')) {
      // Clear search term when changing pages without a query
      setSearchTerm('');
    }
  }, [location.pathname, location.search]);

  // Handle search - Updated to search within Body.jsx content
  const handleSearch = (query) => {
    if (query && query.trim() !== '') {
      const trimmedQuery = query.trim();
      console.log(`Searching for: ${trimmedQuery}`);
      
      // If we're already on the homepage, just update the search param
      if (location.pathname === '/') {
        navigate(`/?q=${encodeURIComponent(trimmedQuery)}`);
      } 
      // If we're on the agents page, use the agents search
      else if (location.pathname === '/agents') {
        navigate(`/agents?q=${encodeURIComponent(trimmedQuery)}`);
      } 
      // For any other page, redirect to the homepage with search query
      else {
        navigate(`/?q=${encodeURIComponent(trimmedQuery)}`);
      }
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

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <header className="main-header">
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
              <Link to="/agents" className="nav-link">
                Agents
              </Link>
              <Link to="/ai-tools" className="nav-link">
                AI Tools
              </Link>
              <Link to="/trends" className="nav-link">
                Trends
              </Link>
              <Link to="/latest-tech" className="nav-link">
                Latest Tech
              </Link>
            </nav>
          </div>

          {/* Right group: Auth buttons and profile */}
          <div className="flex items-center space-x-3 auth-buttons">
            {/* Cart Icon (Removed Checkout Button) */}
            <div className="cart-container hidden md:flex items-center">
              <Link to="/checkout" className="cart-icon-container">
                <FaShoppingCart className="text-xl" />
                {itemCount > 0 && (
                  <span className="cart-badge">{itemCount}</span>
                )}
              </Link>
            </div>
            
            {!user && (
              <div className="hidden md:flex items-center space-x-3">
                <Link to="/sign-in" className="auth-link">
                  Sign In
                </Link>
                <button
                  onClick={handleSignUp}
                  className="auth-button"
                >
                  Sign Up
                </button>
              </div>
            )}

            {user && (
              <div className="hidden md:flex items-center space-x-3">
                {user.role === 'admin' && (
                  <Link to="/admin/agents" className="auth-link">
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="auth-button signout-button"
                >
                  Sign Out
                </button>
                <Link
                  to="/profile"
                  className="profile-avatar"
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

            {/* Hamburger menu icon - Only shown on mobile */}
            <button 
              ref={toggleButtonRef}
              className="mobile-menu-toggle md:hidden"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <span className={`hamburger-line ${isMenuOpen ? 'active' : ''}`}></span>
              <span className={`hamburger-line ${isMenuOpen ? 'active' : ''}`}></span>
              <span className={`hamburger-line ${isMenuOpen ? 'active' : ''}`}></span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div ref={mobileMenuRef} className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
          <nav className="mobile-nav">
            <Link to="/agents" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
              Agents
            </Link>
            <Link to="/ai-tools" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
              AI Tools
            </Link>
            <Link to="/trends" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
              Trends
            </Link>
            <Link to="/latest-tech" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
              Latest Tech
            </Link>
            {/* Cart in mobile menu */}
            <Link to="/checkout" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
              Cart {itemCount > 0 ? `(${itemCount})` : ''}
            </Link>
            {!user && (
              <>
                <Link to="/sign-in" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                  Sign In
                </Link>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleSignUp();
                  }}
                  className="mobile-nav-button"
                >
                  Sign Up
                </button>
              </>
            )}
            {user && (
              <>
                <Link to="/profile" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                  Profile
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin/agents" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                    Admin Dashboard
                  </Link>
                )}
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleSignOut();
                  }}
                  className="mobile-nav-button signout"
                >
                  Sign Out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Search section - Only shown on homepage and agents page */}
      {shouldShowSearchBar && (
        <div className="search-section">
          <div className="container mx-auto">
            <SearchBar 
              initialQuery={searchTerm} 
              onSearch={handleSearch} 
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
