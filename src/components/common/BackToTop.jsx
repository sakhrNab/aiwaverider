import React, { useState, useEffect } from 'react';
import { FaChevronUp } from 'react-icons/fa';

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when user scrolls down 300px
  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Scroll to top smoothly
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    
    // Clean up listener on component unmount
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          className="back-to-top-button"
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            zIndex: 99,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(79, 209, 197, 0.15)',
            color: '#4FD1C5',
            border: '1px solid rgba(79, 209, 197, 0.3)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: 'all 0.2s ease',
            opacity: 0.8,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(79, 209, 197, 0.3)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(79, 209, 197, 0.15)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <FaChevronUp size={14} />
        </button>
      )}
    </>
  );
};

export default BackToTop; 