import React from 'react';
import { useLocation } from 'react-router-dom';
import { FaCalendarAlt, FaArrowRight, FaBolt, FaClock, FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';

const BookingHeader = () => {
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();
  
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
    } else if (path.includes('latest-tech')) {
      return {
        title: 'Stay Updated',
        subtitle: 'with the latest AI Tools'
      };
    } else {
      // Default for AI Tools and other pages
      return {
        title: 'Master the Future',
        subtitle: 'with AI Tools'
      };
    }
  };
  
  const { title, subtitle } = getHeaderText();

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-[#2D1846] to-[#1a0b2e] backdrop-blur-lg shadow-xl border-b border-purple-500/30">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-between py-4 px-4">
        <div className="flex items-center mb-3 sm:mb-0">
          <div className="relative">
            <FaBolt className="text-2xl text-yellow-400 mr-2 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full pulse-subtle"></div>
          </div>
          <span className="font-medium text-lg">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-300 to-pink-300">
              {title}
            </span> 
            <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 ml-1">
              {subtitle}
            </span>
          </span>
        </div>
        
        <div className="flex flex-col items-center sm:items-end">
          <div className="flex items-center space-x-4">
            {/* Dark/Light Mode Toggle */}
            <button 
              onClick={toggleDarkMode} 
              className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all duration-300 shimmer-effect relative"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? (
                <FaSun className="text-yellow-400" size={20} />
              ) : (
                <FaMoon className="text-blue-300" size={20} />
              )}
            </button>
            
            <a 
              href={calendlyLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2.5 bg-gradient-to-r from-[#FF8A00] to-[#FF0080] rounded-full font-bold hover:shadow-2xl transition-all duration-300 heartbeat-pulse flex items-center shimmer-effect relative"
            >
              <FaCalendarAlt className="mr-2" />
              Book a Training Session
              <FaArrowRight className="ml-2" />
            </a>
          </div>
          <span className="text-xs text-yellow-400/70 mt-1 flex items-center">
            <FaClock className="mr-1" size={10} />
            Quick 15-min discovery call
          </span>
        </div>
      </div>
    </div>
  );
};

export default BookingHeader; 