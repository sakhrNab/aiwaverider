import React, { useState, useEffect } from 'react';
import { fetchAgents, fetchFeaturedAgents, fetchWishlists } from '../utils/api';
import SearchBar from '../components/agents/SearchBar';
import CategoryNav from '../components/agents/CategoryNav';
import FeaturedAgents from '../components/agents/FeaturedAgents';
import WishlistSection from '../components/agents/WishlistSection';
import FilterSidebar from '../components/agents/FilterSidebar';
import AgentCard from '../components/agents/AgentCard';
import AgentCarousel from '../components/agents/AgentCarousel';
import '../styles/Agents.css';

const Agents = () => {
  const [agents, setAgents] = useState([]);
  const [featuredAgents, setFeaturedAgents] = useState([]);
  const [recommendedAgents, setRecommendedAgents] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFilter, setSelectedFilter] = useState('Hot & Now');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [selectedRating, setSelectedRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedFilter, selectedPrice, selectedRating, searchQuery]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching agents with:', { selectedCategory, selectedFilter });
      // Fetch agents with filters
      let mockAgents = await fetchAgents(selectedCategory, selectedFilter);
      console.log('Fetched mock agents:', mockAgents.length);
      
      // Apply price filter
      if (selectedPrice === 'free') {
        mockAgents = mockAgents.filter(agent => {
          if (typeof agent.price === 'string') {
            return agent.price.toLowerCase().includes('free') || agent.price === '$0';
          }
          return agent.price === 0;
        });
        console.log('After free filter:', mockAgents.length);
      } else if (selectedPrice !== 'all') {
        // Extract numeric value from price string if needed
        const priceThreshold = parseInt(selectedPrice);
        mockAgents = mockAgents.filter(agent => {
          if (typeof agent.price === 'string') {
            const numericMatch = agent.price.match(/\$?(\d+(\.\d+)?)/);
            if (numericMatch) {
              const price = parseFloat(numericMatch[1]);
              return price >= priceThreshold;
            }
          }
          return false;
        });
        console.log('After price filter:', mockAgents.length);
      }
      
      // Apply rating filter
      if (selectedRating > 0) {
        console.log('Before rating filter:', mockAgents.length);
        console.log('Selected rating filter:', selectedRating);
        
        // Log the first few agents to see their ratings
        mockAgents.slice(0, 3).forEach(agent => {
          console.log(`Agent ${agent.id || 'unknown'} rating:`, agent.rating);
        });
        
        mockAgents = mockAgents.filter(agent => {
          if (!agent.rating || !agent.rating.average) {
            return false;
          }
          
          // Convert to number to ensure proper comparison
          const agentRating = parseFloat(agent.rating.average);
          return agentRating >= selectedRating;
        });
        console.log('After rating filter:', mockAgents.length);
      }
      
      // Apply search query
      if (searchQuery) {
        mockAgents = mockAgents.filter(agent => 
          (agent.name && agent.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (agent.title && agent.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (agent.description && agent.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        console.log('After search filter:', mockAgents.length);
      }
      
      setAgents(mockAgents);
      console.log('Final agents set:', mockAgents.length);

      // Fetch featured agents
      const mockFeaturedAgents = await fetchFeaturedAgents();
      setFeaturedAgents(mockFeaturedAgents);
      
      // Generate recommended agents (using a subset of featured agents with different sorting)
      console.log('Creating recommended agents from featured agents:', mockFeaturedAgents.length);
      
      // Make sure we have at least some data for recommendations
      let mockRecommendedAgents = [];
      if (mockFeaturedAgents && mockFeaturedAgents.length > 0) {
        mockRecommendedAgents = [...mockFeaturedAgents]
          .sort(() => Math.random() - 0.5) // Shuffle
          .slice(0, 10) // Take first 10
          .map(agent => ({
            ...agent,
            id: agent.id || `rec-${Math.random().toString(36).substr(2, 9)}`,
            title: agent.title || agent.name || 'Recommended Agent',
            price: agent.price || Math.floor(Math.random() * 200) + 10
          }));
      } else {
        // Create fallback recommendations if no featured agents
        mockRecommendedAgents = Array(5).fill().map((_, i) => ({
          id: `rec-${Math.random().toString(36).substr(2, 9)}`,
          title: `Recommended Agent ${i+1}`,
          price: Math.floor(Math.random() * 200) + 10,
          imageUrl: `https://picsum.photos/300/200?random=${i}`,
          rating: { average: (4 + Math.random()).toFixed(1), count: Math.floor(Math.random() * 100) + 10 },
          creator: { name: 'AI Wave Rider', avatar: 'https://picsum.photos/50/50?random=creator' },
          isBestseller: i === 0 || i === 2, // Make some bestsellers
          isNew: i === 1 || i === 4 // Make some new
        }));
      }
      
      console.log('Created recommended agents:', mockRecommendedAgents.length);
      setRecommendedAgents(mockRecommendedAgents);
      
      // Fetch wishlists
      const mockWishlists = await fetchWishlists();
      setWishlists(mockWishlists);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
  };
  
  const handlePriceChange = (price) => {
    setSelectedPrice(price);
  };
  
  const handleRatingChange = (rating) => {
    // If the same rating is clicked again, clear the filter
    if (selectedRating === rating) {
      setSelectedRating(0);
    } else {
      setSelectedRating(rating);
    }
  };

  // Render the main agent grid
  const renderAgentGrid = () => {
    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      );
    }

    if (agents.length === 0) {
      return (
        <div className="no-results">
          <h3>No agents found</h3>
          <p>Try adjusting your filters or search terms</p>
        </div>
      );
    }

    return (
      <div className="agents-grid">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    );
  };

  return (
    <div className="agents-page">
      <div className="search-section">
        <SearchBar onSearch={handleSearch} />
      </div>
      
      <div className="recommendations-section">
        <AgentCarousel 
          title="Curated for you" 
          agents={recommendedAgents} 
        />
      </div>
      
      <div className="category-nav-section">
        <CategoryNav 
          selectedCategory={selectedCategory} 
          onCategoryChange={handleCategoryChange} 
        />
      </div>
      
      <div className="featured-section">
        <FeaturedAgents 
          agents={featuredAgents} 
          isLoading={isLoading} 
        />
      </div>
      
      <div className="wishlists-section">
        <WishlistSection 
          wishlists={wishlists} 
          isLoading={isLoading} 
        />
      </div>
      
      <div className="agents-main-content">
        <div className="page-header">
          <h1 className="page-title">
            {searchQuery 
              ? `Search Results for "${searchQuery}"`
              : `${selectedCategory} Agents`}
          </h1>
        </div>
        
        <div className="content-container">
          <div className="sidebar-container">
            <FilterSidebar 
              selectedPrice={selectedPrice}
              selectedRating={selectedRating}
              onPriceChange={handlePriceChange}
              onRatingChange={handleRatingChange}
            />
          </div>
          
          <div className="main-content">
            <div className="filter-bar">
              <div className="results-count">
                {!isLoading && <span>{agents.length} results</span>}
              </div>
              <div className="sort-options">
                <span className="sort-label">Sort by:</span>
                <select 
                  className="sort-select"
                  value={selectedFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                >
                  <option value="Hot & Now">Most Popular</option>
                  <option value="Top Rated">Highest Rated</option>
                  <option value="New">Newest</option>
                </select>
              </div>
            </div>
            
            {renderAgentGrid()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agents; 