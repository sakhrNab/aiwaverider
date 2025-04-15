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
import { useTheme } from '../contexts/ThemeContext';
import { FaExclamationTriangle, FaCalendarAlt, FaArrowRight } from 'react-icons/fa';
import { HashLoader } from 'react-spinners';
import '../styles/Agents.css';

// Import theme classes - similar to AITools.jsx
const themeClasses = "bg-gradient-to-br from-[#4158D0] via-[#C850C0] to-[#FFCC70] stars-pattern";

const Agents = () => {
  const location = useLocation();
  const { darkMode } = useTheme();
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

  // Add a ref for the agents container
  const agentsContainerRef = useRef(null);

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
    if (!agents || agents.length === 0) return;
    
    console.log("Calculating filter counts from", agents.length, "agents");
    const tagCount = {};
    const featureCount = {};
    
    // Count tags based on category or tags property
    agents.forEach(agent => {
      // For tags, use category or tags array if available
      if (agent.category) {
        const category = agent.category;
        tagCount[category] = (tagCount[category] || 0) + 1;
      }
      
      if (agent.tags && Array.isArray(agent.tags)) {
        agent.tags.forEach(tag => {
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        });
      }
      
      // For features, check for specific properties or use features array if available
      if (agent.features && Array.isArray(agent.features)) {
        agent.features.forEach(feature => {
          featureCount[feature] = (featureCount[feature] || 0) + 1;
        });
      }
      
      // Count free agents
      if (agent.price === 0 || 
          agent.price === '0' || 
          agent.price === 'Free' || 
          agent.price === '$0' || 
          agent.isFree === true) {
        featureCount['Free'] = (featureCount['Free'] || 0) + 1;
      }
      
      // Count subscription agents
      if (typeof agent.price === 'string' && 
          (agent.price.includes('/month') || 
           agent.price.includes('a month') || 
           agent.price.includes('monthly') ||
           agent.price.includes('subscription'))) {
        featureCount['Subscription'] = (featureCount['Subscription'] || 0) + 1;
      }
    });
    
    console.log("Tag counts:", tagCount);
    console.log("Feature counts:", featureCount);
    
    setTagCounts(tagCount);
    setFeatureCounts(featureCount);
  };

  // Load initial data (featured, recommended, wishlists) only once
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setIsRecommendationsLoading(true);
      
      // Load agents data from API
      const allAgentsData = await fetchAgents();
      
      // Save all agents to state for filtering
      if (allAgentsData && allAgentsData.length > 0) {
        // Process the agents data
        const processedAgents = allAgentsData.map(agent => {
          // Add any processing logic here
          return agent;
        });
        
        setAllAgents(processedAgents);
        
        // Calculate filter counts based on actual data
        calculateFilterCounts(processedAgents);
        
        // Apply initial filters
        applyFilters(processedAgents);
      }
      
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
      
      // Debug logging for tags
      console.log('Selected tags:', selectedTags);
      console.log('Sample agent tags:', filteredResults.length > 0 ? 
        (filteredResults[0].tags || 'No tags') : 'No agents after filtering');
    }
    
    // Apply feature filters 
    if (selectedFeatures && selectedFeatures.length > 0) {
      filteredResults = filteredResults.filter(agent => {
        // Process each selected feature
        return selectedFeatures.some(feature => {
          // Check for 'Free' feature
          if (feature === 'Free') {
            return agent.price === 0 || 
                   agent.price === '0' || 
                   agent.price === 'Free' || 
                   agent.price === '$0' ||
                   agent.isFree === true;
          }
          
          // Check for 'Subscription' feature
          if (feature === 'Subscription') {
            return typeof agent.price === 'string' && 
                   (agent.price.includes('/month') || 
                    agent.price.includes('a month') || 
                    agent.price.includes('monthly') ||
                    agent.price.includes('subscription'));
          }
          
          // Check other features in the features array
          return agent.features && 
                 Array.isArray(agent.features) && 
                 agent.features.includes(feature);
        });
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
    
    // Apply sorting based on selected filter
    if (selectedFilter) {
      switch (selectedFilter) {
        case 'Hot & New':
          // Sort by newest first, then by rating
          filteredResults.sort((a, b) => {
            if (a.isNew && !b.isNew) return -1;
            if (!a.isNew && b.isNew) return 1;
            const aRating = a.rating?.average || 0;
            const bRating = b.rating?.average || 0;
            return bRating - aRating;
          });
          break;
        case 'Top Rated':
          // Sort by rating (highest first)
          filteredResults.sort((a, b) => {
            const aRating = a.rating?.average || 0;
            const bRating = b.rating?.average || 0;
            return bRating - aRating;
          });
          break;
        case 'Most Popular':
          // Sort by number of users or views if available, otherwise rating count
          filteredResults.sort((a, b) => {
            const aPopularity = a.usersCount || a.views || a.rating?.count || 0;
            const bPopularity = b.usersCount || b.views || b.rating?.count || 0;
            return bPopularity - aPopularity;
          });
          break;
        case 'Price: Low to High':
          // Sort by price (lowest first)
          filteredResults.sort((a, b) => {
            const aPrice = typeof a.price === 'number' ? a.price : 
                          a.priceDetails?.basePrice || 
                          (typeof a.price === 'string' ? parseFloat(a.price.replace(/[^0-9.]/g, '')) : 0);
            const bPrice = typeof b.price === 'number' ? b.price : 
                          b.priceDetails?.basePrice || 
                          (typeof b.price === 'string' ? parseFloat(b.price.replace(/[^0-9.]/g, '')) : 0);
            return aPrice - bPrice;
          });
          break;
        case 'Price: High to Low':
          // Sort by price (highest first)
          filteredResults.sort((a, b) => {
            const aPrice = typeof a.price === 'number' ? a.price : 
                          a.priceDetails?.basePrice || 
                          (typeof a.price === 'string' ? parseFloat(a.price.replace(/[^0-9.]/g, '')) : 0);
            const bPrice = typeof b.price === 'number' ? b.price : 
                          b.priceDetails?.basePrice || 
                          (typeof b.price === 'string' ? parseFloat(b.price.replace(/[^0-9.]/g, '')) : 0);
            return bPrice - aPrice;
          });
          break;
        default:
          // No sorting
          break;
      }
      console.log(`After sorting by ${selectedFilter}: ${filteredResults.length} agents`);
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
    // Scroll to the agents list when a filter is selected
    agentsContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          <div className="loader"></div>
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
          <div className="mock-data-warning glass-effect text-white mb-4 p-2 rounded-lg text-sm flex items-center">
            <FaExclamationTriangle className="warning-icon mr-2 text-yellow-300" />
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
      // AI-specific tags for better categorization of agents
      const tagsToAssign = [
        'AI Writing',
        'Automation',
        'Business',
        'Coding Assistant',
        'Content Creation',
        'Data Analysis',
        'Email Management',
        'Language Learning',
        'Productivity',
        'Research',
        'Summarization',
        'Task Management',
        'Website Building'
      ];
      
      // AI agent-specific features
      const featuresToAssign = [
        'API Access',
        'Chat Interface',
        'Code Generation',
        'Custom Instructions',
        'Document Processing',
        'Free',
        'Image Generation',
        'Knowledge Base',
        'Multiple Language Support',
        'PDF Processing',
        'Plugins',
        'Subscription',
        'Voice Enabled',
        'Web Search'
      ];
      
      // Add random tags and features to each agent
      const enhancedAgents = allAgents.map(agent => {
        // Generate 2-3 random tags for each agent
        const numTags = Math.floor(Math.random() * 2) + 2;
        const tags = [];
        for (let i = 0; i < numTags; i++) {
          const randomTag = tagsToAssign[Math.floor(Math.random() * tagsToAssign.length)];
          if (!tags.includes(randomTag)) tags.push(randomTag);
        }
        
        // Generate 2-3 random features for each agent
        const numFeatures = Math.floor(Math.random() * 2) + 2;
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

  // Make sure to call calculateFilterCounts whenever agent data changes
  useEffect(() => {
    if (allAgents.length > 0) {
      calculateFilterCounts(allAgents);
    }
  }, [allAgents]);

  // Use the new loader
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-b from-gray-900 to-blue-900">
        <div className="mb-8">
          <HashLoader color="#4FD1C5" size={70} speedMultiplier={0.8} />
        </div>
        <div className="text-white text-xl font-semibold mt-4">
          Loading AI Agents
        </div>
        <div className="text-blue-300 text-sm mt-2">
          Fetching the latest agents for you...
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-16 ${darkMode ? "dark bg-[#2D1846]" : "bg-gray-50"} ${themeClasses}`}>
      {/* Custom booking header that matches the homepage */}
      <div className="bg-indigo-900 py-6 px-6">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white">Wave Rider</h2>
            <p className="text-yellow-500 font-medium">Your Gateway to AI Mastery</p>
          </div>
          <div className="mt-4 md:mt-0">
            <a 
              href="https://calendly.com/your-booking-link" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-red-500 text-white rounded-full font-semibold flex items-center heartbeat-pulse"
            >
              <FaCalendarAlt className="mr-2" />
              Book a Training Session
              <FaArrowRight className="ml-2" />
            </a>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Enhanced 3D Header */}
          <div className="page-header-3d">
            <div className="absolute inset-0 bg-pattern opacity-30"></div>
            <div className="relative z-10">
              <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-yellow-200 text-transparent bg-clip-text">
                  Master AI Agents
                </span>
              </h1>
              <p className="text-white/80 text-lg mb-2">
                Discover and automate your repetitive tasks
              </p>
              <div className="w-20 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mt-4 rounded-full"></div>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-6">
            {/* Sidebar with filters */}
            <aside className="xl:w-1/4 mb-6 xl:mb-0">
              <div className="filter-sidebar glass-effect">
                <FilterSidebar
                  selectedPrice={selectedPrice}
                  onPriceChange={handlePriceChange}
                  selectedRating={selectedRating}
                  onRatingChange={handleRatingChange}
                  selectedTags={selectedTags}
                  onTagChange={handleTagChange}
                  tagCounts={tagCounts}
                  selectedFeatures={selectedFeatures}
                  onFeatureChange={handleFeatureChange}
                  featureCounts={featureCounts}
                />
              </div>
            </aside>

            {/* Main content area */}
            <main className="xl:w-3/4">
              {/* Category navigation */}
              <div className="mb-6 curated-marketplace glass-effect">
                <CategoryNav 
                  selectedCategory={selectedCategory} 
                  onCategoryChange={handleCategoryChange} 
                />
              </div>

              {/* Filter and search area */}
              <div className="filter-search-container glass-effect">
                <div className="filter-options">
                  {['Hot & New', 'Top Rated', 'Most Popular', 'Price: Low to High', 'Price: High to Low'].map((filter) => (
                    <button 
                      key={filter}
                      onClick={() => handleFilterChange(filter)}
                      className={`filter-button ${selectedFilter === filter ? 'active' : ''}`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <div className="search-wrapper">
                  <SearchBar
                    initialQuery={searchQuery}
                    onSearch={handleSearch}
                    placeholder="Search agents..."
                    className="w-full"
                  />
                </div>
              </div>

              {/* Featured agents carousel */}
              {featuredAgents.length > 0 && (
                <section className="mb-12 glass-effect section-container">
                  <h2 className="section-title">Featured Agents</h2>
                  <FeaturedAgents agents={featuredAgents} />
                </section>
              )}

              {/* Agent grid - Conditional rendering based on loading state */}
              {isLoading ? (
                <div className="loading-wrapper glass-effect">
                  <div className="loader"></div>
                </div>
              ) : agents.length === 0 ? (
                <div className="empty-results glass-effect">
                  <FaExclamationTriangle className="empty-icon" />
                  <h3 className="empty-title">No agents found</h3>
                  <p className="empty-message">
                    We couldn't find any agents matching your current filters. Try adjusting your search criteria.
                  </p>
                  <button 
                    onClick={() => {
                      setSelectedCategory('All');
                      setSelectedFilter('Hot & New');
                      setSelectedPrice('all');
                      setSelectedRating(0);
                      setSelectedTags([]);
                      setSelectedFeatures([]);
                      setSearchQuery('');
                      applyFilters(allAgents);
                    }}
                    className="reset-button"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="agents-container glass-effect" ref={agentsContainerRef}>
                  {renderAgentGrid()}
                </div>
              )}

              {/* Recommended agents */}
              {recommendedAgents.length > 0 && (
                <section className="mt-16 glass-effect section-container">
                  <h2 className="section-title">Recommended For You</h2>
                  <div className="carousel-container">
                    {isRecommendationsLoading ? (
                      <div className="loading-recommendations">
                        <div className="loader"></div>
                      </div>
                    ) : (
                      <AgentCarousel agents={recommendedAgents} />
                    )}
                  </div>
                </section>
              )}

              {/* Wishlists */}
              {wishlists.length > 0 && (
                <section className="mt-16 glass-effect section-container">
                  <h2 className="section-title">Your Saved Collections</h2>
                  <WishlistSection wishlists={wishlists} />
                </section>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Agents; 