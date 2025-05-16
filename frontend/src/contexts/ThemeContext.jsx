import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  // Check if there's a saved theme preference in localStorage
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('aiWaveRiderTheme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    
    // If no preference in localStorage, check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    
    // Default to dark mode if no preference found
    return true;
  });

  // Toggle dark mode function
  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };

  // Update HTML attributes and localStorage when darkMode changes
  useEffect(() => {
    const themeValue = darkMode ? 'dark' : 'light';
    
    // Store in localStorage
    localStorage.setItem('aiWaveRiderTheme', themeValue);
    
    // Apply to HTML and body elements
    document.documentElement.setAttribute('data-theme', themeValue);
    document.body.setAttribute('data-theme', themeValue);
    
    // Apply/remove dark class from body for Tailwind
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Define handler for changes to system preference
    const handleSystemThemeChange = (e) => {
      // Only update if we don't have user preference saved
      if (!localStorage.getItem('aiWaveRiderTheme')) {
        setDarkMode(e.matches);
      }
    };
    
    // Add listener for media query changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemThemeChange);
    }
    
    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 