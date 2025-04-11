import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  // Check if there's a saved theme preference in localStorage
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('aiWaveRiderTheme');
    return savedTheme === 'light' ? false : true; // Default to dark mode if not set
  });

  // Toggle dark mode function
  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };

  // Save theme preference to localStorage whenever it changes
  useEffect(() => {
    const themeValue = darkMode ? 'dark' : 'light';
    localStorage.setItem('aiWaveRiderTheme', themeValue);
    
    // Update data-theme attribute on document.documentElement and body
    document.documentElement.setAttribute('data-theme', themeValue);
    document.body.setAttribute('data-theme', themeValue);
    
    // Add/remove dark class from body for global styling
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  const value = {
    darkMode,
    toggleDarkMode
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 