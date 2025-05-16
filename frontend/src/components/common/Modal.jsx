import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import './Modal.css';

/**
 * Reusable Modal component
 * @param {Object} props Component props
 * @param {String} props.title Modal title
 * @param {Function} props.onClose Function to call when modal is closed
 * @param {React.ReactNode} props.children Modal content
 * @param {String} props.size Modal size (small, medium, large)
 * @param {Boolean} props.hideCloseButton Whether to hide the close button
 * @returns {JSX.Element} Modal component
 */
const Modal = ({ 
  title, 
  onClose, 
  children, 
  size = 'medium',
  hideCloseButton = false
}) => {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    
    // Prevent body scrolling while modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);
  
  // Handle clicking outside the modal to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className={`modal modal-${size}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          {!hideCloseButton && (
            <button 
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
          )}
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal; 