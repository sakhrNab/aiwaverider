import React, { useState, useEffect } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import './SearchBar.css';

const SearchBar = ({ onSearch, initialQuery = '', placeholder = "Search for agents, products, or creators..." }) => {
  const [query, setQuery] = useState(initialQuery);
  
  // Update local state when initialQuery changes (from URL)
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };
  
  const handleClear = () => {
    setQuery('');
    onSearch('');
  };
  
  return (
    <div className="search-bar-container">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          {query && (
            <button 
              type="button" 
              className="clear-button" 
              onClick={handleClear}
              aria-label="Clear search"
            >
              <FaTimes />
            </button>
          )}
          <button type="submit" className="search-button">
            <FaSearch />
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBar; 