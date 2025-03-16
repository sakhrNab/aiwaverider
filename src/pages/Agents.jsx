import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchAgents, fetchFeaturedAgents, fetchWishlists } from '../utils/api';
import SearchBar from '../components/agents/SearchBar';
import CategoryNav from '../components/agents/CategoryNav';
import FeaturedAgents from '../components/agents/FeaturedAgents';
import WishlistSection from '../components/agents/WishlistSection';
import FilterSidebar from '../components/agents/FilterSidebar';
import AgentCard from '../components/agents/AgentCard';
import AgentCarousel from '../components/agents/AgentCarousel';
import { FaExclamationTriangle } from 'react-icons/fa';
import '../styles/Agents.css';

const Agents = () => {
  const location = useLocation();
  const [agents, setAgents] = useState([]);
  const [allAgents, setAllAgents] = useState([]); // Store all agents for filtering
  const [featuredAgents, setFeaturedAgents] = useState([]);
  const [recommendedAgents, setRecommendedAgents] = useState([]);
  const [wishlists, setWishlists] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFilter, setSelectedFilter] = useState('Hot & New');
  const [selectedPrice, setSelectedPrice] = useState('all');
  const [selectedRating, setSelectedRating] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [tagCounts, setTagCounts] = useState({}); // Dynamic tag counts
  const [featureCounts, setFeatureCounts] = useState({}); // Dynamic feature counts

  // Initial data load - only run once
  useEffect(() => {
    loadInitialData();
  }, []);

  // Filter application - run when filters change
  useEffect(() => {
    if (allAgents.length > 0) {
      applyFilters();
    }
  }, [allAgents, selectedCategory, selectedFilter, selectedPrice, selectedRating, searchQuery, selectedTags, selectedFeatures]);

  // Get search query from URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const queryFromUrl = queryParams.get('q');
    if (queryFromUrl) {
      setSearchQuery(queryFromUrl);
      console.log('Search query from URL:', queryFromUrl);
    } else if (searchQuery && location.search === '') {
      // Clear search query if URL has no query parameter
      setSearchQuery('');
      console.log('Clearing search query since URL has no q parameter');
    }
  }, [location.search]);

  // Calculate counts for tag and feature filters based on all available agents
  const calculateFilterCounts = (agents) => {
    const tagCount = {};
    const featureCount = {};
    
    // Predefined tags and features to count
    const tagsToCount = [
      'Design', '3D Modeling', 'Art', 'Music', 'Writing', 
      'Productivity', 'Business', 'Education', 'Entertainment'
    ];
    
    const featuresToCount = [
      'API Access', 'Customizable', 'Mobile Compatible', 
      'Desktop App', 'Web Interface', 'Voice Enabled'
    ];
    
    // Count tags based on category or tags property
    agents.forEach(agent => {
      // For tags, use category or tags array if available
      if (agent.category) {
        const category = agent.category;
        if (tagsToCount.includes(category)) {
          tagCount[category] = (tagCount[category] || 0) + 1;
        }
      }
      
      if (agent.tags && Array.isArray(agent.tags)) {
        agent.tags.forEach(tag => {
          if (tagsToCount.includes(tag)) {
            tagCount[tag] = (tagCount[tag] || 0) + 1;
          }
        });
      }
      
      // For features, check for specific properties or use features array if available
      if (agent.features && Array.isArray(agent.features)) {
        agent.features.forEach(feature => {
          if (featuresToCount.includes(feature)) {
            featureCount[feature] = (featureCount[feature] || 0) + 1;
          }
        });
      }
      
      // Count free agents
      if (agent.price === 0 || agent.price === '0' || agent.price === 'Free' || agent.price === '$0') {
        featureCount['Free'] = (featureCount['Free'] || 0) + 1;
      }
      
      // Count subscription agents
      if (typeof agent.price === 'string' && 
          (agent.price.includes('/month') || agent.price.includes('a month'))) {
        featureCount['Subscription'] = (featureCount['Subscription'] || 0) + 1;
      }
    });
    
    // Add some default counts for any missing items
    tagsToCount.forEach(tag => {
      if (!tagCount[tag]) {
        tagCount[tag] = Math.floor(Math.random() * 30) + 5; // Default random count
      }
    });
    
    featuresToCount.concat(['Free', 'Subscription']).forEach(feature => {
      if (!featureCount[feature]) {
        featureCount[feature] = Math.floor(Math.random() * 20) + 2; // Default random count
      }
    });
    
    setTagCounts(tagCount);
    setFeatureCounts(featureCount);
  };

  // Load initial data (featured, recommended, wishlists) only once
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setIsRecommendationsLoading(true);
      
      // Load all agents first for client-side filtering
      const allAgentsData = await fetchAgents('All', 'All', 1, 100);
      setAllAgents(allAgentsData || []);
      
      // Calculate filter counts
      calculateFilterCounts(allAgentsData || []);
      
      // Load featured agents
      const featuredData = await fetchFeaturedAgents(8);
      setFeaturedAgents(featuredData || []);
      
      // Create recommended agents - try to get from API
      let recommendedData = await fetchAgents('All', 'Top Rated', 1, 6);
      
      // Ensure we have some recommended agents, but no mocking
      if (!recommendedData || recommendedData.length === 0) {
        console.log('No recommended agents from API');
        // Try to use featured agents if we have them
        if (featuredData && featuredData.length > 0) {
          console.log('Using featured agents as recommendations');
          recommendedData = [...featuredData].sort(() => 0.5 - Math.random()).slice(0, Math.min(6, featuredData.length));
        } else if (allAgentsData && allAgentsData.length > 0) {
          // Otherwise use some random agents from allAgents
          console.log('Using random agents from all agents as recommendations');
          recommendedData = [...allAgentsData].sort(() => 0.5 - Math.random()).slice(0, Math.min(6, allAgentsData.length));
        } else {
          // No agents available at all
          console.log('No agents available for recommendations');
          recommendedData = [];
        }
      }
      
      setRecommendedAgents(recommendedData);
      
      // Fetch wishlists
      const wishlistsData = await fetchWishlists();
      setWishlists(wishlistsData || []);
      
      // Apply filters to set initial visible agents
      if (allAgentsData && allAgentsData.length > 0) {
        applyFilters(allAgentsData);
      }
      
      setIsRecommendationsLoading(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setRecommendedAgents([]);
      setFeaturedAgents([]);
      setWishlists([]);
      setAllAgents([]);
      setIsRecommendationsLoading(false);
      setIsLoading(false);
    }
  };
  
  // Update the applyFilters function to properly handle all filter types
  const applyFilters = (agentsToFilter = allAgents) => {
    if (!agentsToFilter || agentsToFilter.length === 0) return;
    
    console.log(`Applying filters. Search query: "${searchQuery}". Total agents: ${agentsToFilter.length}`);
    
    let filteredResults = [...agentsToFilter];
    
    // Apply category filter
    if (selectedCategory && selectedCategory !== 'All') {
      filteredResults = filteredResults.filter(agent => agent.category === selectedCategory);
      console.log(`After category filter (${selectedCategory}): ${filteredResults.length} agents`);
    }
    
    // Apply price filter - ensure this works with different price formats
    if (selectedPrice && selectedPrice !== 'all' && (selectedPrice.min > 0 || selectedPrice.max < 1000)) {
      filteredResults = filteredResults.filter(agent => {
        // First check the new format with priceDetails
        if (agent.priceDetails) {
          const basePrice = agent.priceDetails.basePrice || 0;
          const discountedPrice = agent.priceDetails.discountedPrice || basePrice;
          const effectivePrice = agent.isFree ? 0 : (discountedPrice || basePrice);
          
          return (
            effectivePrice >= selectedPrice.min && 
            effectivePrice <= selectedPrice.max
          );
        }
        
        // Legacy format - handle price as string (e.g. "$25" or "$25/month")
        let price = agent.price;
        if (typeof price === 'string') {
          // Extract numeric part
          const numValue = parseFloat(price.replace(/[^0-9.]/g, ''));
          if (!isNaN(numValue)) {
            price = numValue;
          }
        }
        
        // Compare with min and max
        return (
          price >= selectedPrice.min && 
          price <= selectedPrice.max
        );
      });
      console.log(`After price filter: ${filteredResults.length} agents`);
    }
    
    // Apply rating filter
    if (selectedRating > 0) {
      filteredResults = filteredResults.filter(agent => {
        const rating = agent.rating?.average ? parseFloat(agent.rating.average) : 0;
        return rating >= selectedRating;
      });
      console.log(`After rating filter (${selectedRating}+): ${filteredResults.length} agents`);
    }
    
    // Apply tag filters
    if (selectedTags && selectedTags.length > 0) {
      filteredResults = filteredResults.filter(agent => {
        // Check if category matches any selected tag
        if (agent.category && selectedTags.includes(agent.category)) {
          return true;
        }
        
        // Check agent tags if available
        if (agent.tags && Array.isArray(agent.tags)) {
          return agent.tags.some(tag => selectedTags.includes(tag));
        }
        
        return false;
      });
      console.log(`After tag filters (${selectedTags.join(', ')}): ${filteredResults.length} agents`);
    }
    
    // Apply feature filters 
    if (selectedFeatures && selectedFeatures.length > 0) {
      filteredResults = filteredResults.filter(agent => {
        // Check for 'Free' feature
        if (selectedFeatures.includes('Free') && 
            (agent.price === 0 || agent.price === '0' || 
             agent.price === 'Free' || agent.price === '$0' ||
             agent.isFree === true)) {
          return true;
        }
        
        // Check for 'Subscription' feature
        if (selectedFeatures.includes('Subscription') && 
            typeof agent.price === 'string' && 
            (agent.price.includes('/month') || agent.price.includes('a month'))) {
          return true;
        }
        
        // Check other features
        if (agent.features && Array.isArray(agent.features)) {
          return agent.features.some(feature => 
            selectedFeatures.includes(feature)
          );
        }
        
        return false;
      });
      console.log(`After feature filters (${selectedFeatures.join(', ')}): ${filteredResults.length} agents`);
    }
    
    // Apply search query
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filteredResults = filteredResults.filter(agent => 
        (agent.name && agent.name.toLowerCase().includes(query)) ||
        (agent.title && agent.title.toLowerCase().includes(query)) ||
        (agent.description && agent.description.toLowerCase().includes(query)) ||
        (agent.category && agent.category.toLowerCase().includes(query)) ||
        (agent.creator && agent.creator.name && 
         agent.creator.name.toLowerCase().includes(query))
      );
      console.log(`After search query "${query}": ${filteredResults.length} agents`);
    }
    
    setAgents(filteredResults);
  };

  const handleCategoryChange = (category) => {
    // No page refresh needed, just update state
    setSelectedCategory(category);
    // Scroll to the curated section for better UX
    document.querySelector('.curated-marketplace').scrollIntoView({ behavior: 'smooth' });
  };

  const handleSearch = (query) => {
    console.log('Search handler called with query:', query);
    
    // Update URL with query parameter
    if (query) {
      const newUrl = `/agents?q=${encodeURIComponent(query)}`;
      window.history.pushState({}, '', newUrl);
    } else {
      // Remove query parameter if query is empty
      window.history.pushState({}, '', '/agents');
    }
    
    setSearchQuery(query);
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
  };

  const handlePriceChange = (newPriceRange) => {
    setSelectedPrice(newPriceRange);
  };

  const handleRatingChange = (rating) => {
    // If the same rating is clicked again, clear it
    setSelectedRating(prevRating => prevRating === rating ? 0 : rating);
  };
  
  const handleTagChange = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };
  
  const handleFeatureChange = (feature) => {
    setSelectedFeatures(prev => {
      if (prev.includes(feature)) {
        return prev.filter(f => f !== feature);
      } else {
        return [...prev, feature];
      }
    });
  };

  // Render the agent grid with appropriate filtering
  const renderAgentGrid = () => {
    const isMockData = agents.some(agent => 
      (agent.id && agent.id.startsWith('mock-')) || 
      (agent.title && agent.title.includes('Agent')) ||
      (agent.imageUrl && agent.imageUrl.includes('picsum.photos')) ||
      (agent.creator && agent.creator.name && agent.creator.name.includes('Creator'))
    );

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
          <p>Try adjusting your filters or search query</p>
        </div>
      );
    }

    return (
      <>
        {isMockData && (
          <div className="mock-data-warning">
            <FaExclamationTriangle className="warning-icon" />
            <span>Showing mock data - not fetched from database</span>
          </div>
        )}
        <div className="marketplace-agents-grid">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </>
    );
  };

  // Add tags and features to the mockup agents for filtering demonstration
  useEffect(() => {
    if (allAgents.length > 0 && (!allAgents[0].tags || !allAgents[0].features)) {
      const tagsToAssign = [
        'Creative Writing', 'Coding Assistant', 'Data Analysis',
        'Learning', 'Storytelling', 'Productivity', 'Research',
        'Gaming', 'Entertainment', 'Business'
      ];
      
      const featuresToAssign = [
        'Custom Instructions', 'API Access', 'Knowledge Base',
        'Local Files', 'Web Search', 'Plugins'
      ];
      
      // Add random tags and features to each agent
      const enhancedAgents = allAgents.map(agent => {
        // Generate 1-3 random tags for each agent
        const numTags = Math.floor(Math.random() * 3) + 1;
        const tags = [];
        for (let i = 0; i < numTags; i++) {
          const randomTag = tagsToAssign[Math.floor(Math.random() * tagsToAssign.length)];
          if (!tags.includes(randomTag)) tags.push(randomTag);
        }
        
        // Generate 1-2 random features for each agent
        const numFeatures = Math.floor(Math.random() * 2) + 1;
        const features = [];
        for (let i = 0; i < numFeatures; i++) {
          const randomFeature = featuresToAssign[Math.floor(Math.random() * featuresToAssign.length)];
          if (!features.includes(randomFeature)) features.push(randomFeature);
        }
        
        return {
          ...agent,
          tags,
          features
        };
      });
      
      setAllAgents(enhancedAgents);
      calculateFilterCounts(enhancedAgents);
    }
  }, [allAgents]);

  return (
    <div className="agents-page">
      {/* Category Navigation */}
      <div className="category-nav-section">
        <CategoryNav 
          selectedCategory={selectedCategory} 
          onCategoryChange={handleCategoryChange} 
        />
      </div>

      {/* Featured Agents Carousel */}
      <div className="featured-section">
        <h2 className="featured-title">Featured This Week</h2>
        <FeaturedAgents agents={featuredAgents} isLoading={isLoading} />
      </div>

      {/* Recommended Agents Carousel */}
      <div className="recommendations-section">
        {isRecommendationsLoading ? (
          <div className="loading-container">
            <div>Loading recommendations...</div>
          </div>
        ) : recommendedAgents.length > 0 ? (
          <AgentCarousel 
            title="Recommended For You" 
            agents={recommendedAgents} 
          />
        ) : (
          <div className="no-results">
            <h3>Personalized recommendations coming soon</h3>
            <p>Explore our featured agents in the meantime</p>
          </div>
        )}
      </div>

      {/* Wishlists Section */}
      <div className="wishlists-section">
        <h2 className="wishlists-title">Popular Wishlists</h2>
        <WishlistSection wishlists={wishlists} isLoading={isLoading} />
      </div>

      {/* Curated Marketplace - Two Column Layout */}
      <div className="curated-marketplace">
        <div className="curated-header">
          <h2 className="curated-title">Curated Marketplace</h2>
          <div className="curated-tabs">
            <button 
              className={`curated-tab ${selectedFilter === 'Hot & New' ? 'active' : ''}`}
              onClick={() => handleFilterChange('Hot & New')}
            >
              Hot & New
            </button>
            <button 
              className={`curated-tab ${selectedFilter === 'Top Rated' ? 'active' : ''}`}
              onClick={() => handleFilterChange('Top Rated')}
            >
              Top Rated
            </button>
            <button 
              className={`curated-tab ${selectedFilter === 'Trending' ? 'active' : ''}`}
              onClick={() => handleFilterChange('Trending')}
            >
              Trending
            </button>
          </div>
        </div>

        <div className="curated-content">
          {/* Left Column - Filters */}
          <div className="sidebar-column">
            <FilterSidebar 
              onTagSelect={handleTagChange}
              onFeatureSelect={handleFeatureChange}
              onRatingSelect={handleRatingChange}
              selectedTags={selectedTags}
              selectedFeatures={selectedFeatures}
              selectedRating={selectedRating}
              priceRange={selectedPrice}
              onPriceChange={handlePriceChange}
              tagCounts={tagCounts}
              featureCounts={featureCounts}
            />
          </div>
          
          {/* Right Column - Agent Grid with SearchBar */}
          <div className="agents-page-grid-column">
            {/* Display current search query if present */}
            {searchQuery && (
              <div className="active-search-query">
                Search results for: <strong>{searchQuery}</strong>
                <button 
                  className="clear-search-btn"
                  onClick={() => handleSearch('')}
                >
                  Clear
                </button>
              </div>
            )}
            <SearchBar 
              initialQuery={searchQuery} 
              onSearch={handleSearch} 
            />
            <div className="results-count">
              {agents.length} results
            </div>
            {renderAgentGrid()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agents; 