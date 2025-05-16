import React from 'react';
import PropTypes from 'prop-types';
import '../../styles/common/LoadingSpinner.css';

/**
 * LoadingSpinner component for indicating loading states
 * 
 * @param {Object} props - Component props
 * @param {string} props.size - Size of the spinner (small, medium, large)
 * @param {string} props.color - Color of the spinner (primary, secondary, light, dark)
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} LoadingSpinner component
 */
const LoadingSpinner = ({ size = 'medium', color = 'primary', className = '' }) => {
  const sizeClass = `spinner-${size}`;
  const colorClass = `spinner-${color}`;
  
  return (
    <div className={`loading-spinner ${sizeClass} ${colorClass} ${className}`}>
      <div className="spinner-circle"></div>
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  color: PropTypes.oneOf(['primary', 'secondary', 'light', 'dark']),
  className: PropTypes.string
};

export default LoadingSpinner; 