import React from 'react';
import { useLocation } from 'react-router-dom';
import { FaCalendarAlt, FaArrowRight, FaBolt, FaClock } from 'react-icons/fa';
import { useTheme } from '../../contexts/ThemeContext';
import '../../styles/BookingHeader.css';

const BookingHeader = () => {
  const location = useLocation();
  const { darkMode } = useTheme();
  
  // IMPORTANT: Replace with your actual Calendly link
  const calendlyLink = "https://calendly.com/your-booking-link";
  
  // Determine which page we're on to customize the header text
  const getHeaderText = () => {
    const path = location.pathname;
    
    if (path.includes('agents')) {
      return {
        title: 'Master AI Agents',
        subtitle: 'Automate your repetitive tasks'
      };
    } else if (path.includes('ai-tools')) {
      return {
        title: 'AI Tools Directory',
        subtitle: 'Discover tools to enhance your workflow'
      };
    } else if (path.includes('trends')) {
      return {
        title: 'AI Trends & Insights',
        subtitle: 'Stay ahead with the latest innovations'
      };
    } else if (path.includes('latest-tech')) {
      return {
        title: 'Latest Technology',
        subtitle: 'Explore cutting-edge advancements'
      };
    } else {
      return {
        title: 'AI Waverider',
        subtitle: 'Your Gateway to AI Mastery'
      };
    }
  };
  
  const headerText = getHeaderText();

  return (
    <div className="booking-header-container glass-effect">
      <div className="booking-header-content">
        <div className="booking-text">
          <h2 className="booking-title">{headerText.title}</h2>
          <p className="booking-subtitle">{headerText.subtitle}</p>
        </div>
        
        <div className="booking-actions">
          <a href={calendlyLink} 
             target="_blank" 
             rel="noopener noreferrer"
             className="booking-button shimmer-effect heartbeat-pulse">
            <FaCalendarAlt className="booking-icon" />
            <span>Book a Training Session</span>
            <FaArrowRight className="arrow-icon" />
          </a>
        </div>
      </div>
      
      <div className="booking-benefits">
        <div className="benefit-item">
          <FaBolt className="benefit-icon" />
          <span>Elevate Your AI Skills</span>
        </div>
        <div className="benefit-item">
          <FaClock className="benefit-icon" />
          <span>30-Minute Expert Session</span>
        </div>
      </div>
    </div>
  );
};

export default BookingHeader; 