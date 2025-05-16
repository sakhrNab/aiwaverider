import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { fetchAgents } from '../api/marketplace/agentApi'; //fetchWishlists
import { fixPlaceholderUrl } from '../utils/imageUtils';

// Helper to fix any via.placeholder.com URLs at runtime
const fixPlaceholderUrls = (agents) => {
  if (!agents || !Array.isArray(agents)) return agents;
  
  return agents.map(agent => {
    // Create a copy to avoid mutating the original
    const fixedAgent = { ...agent };
    
    // Fix imageUrl using our utility function
    if (fixedAgent.imageUrl) { //TODO: fixedAgent.image.url
      fixedAgent.imageUrl = fixPlaceholderUrl(fixedAgent.imageUrl);
    } else if (!fixedAgent.imageUrl) {
      // Generate a default placeholder if no image URL exists
      fixedAgent.imageUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%233498db'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='16' text-anchor='middle' dominant-baseline='middle' fill='%23ffffff'%3E${encodeURIComponent(fixedAgent.name || 'Agent')}%3C/text%3E%3C/svg%3E`;
    }
    
    // Fix iconUrl using our utility function
    if (fixedAgent.iconUrl) {
      fixedAgent.iconUrl = fixPlaceholderUrl(fixedAgent.iconUrl);
    } else if (!fixedAgent.iconUrl) {
      // Generate a default icon placeholder if no icon URL exists
      const initial = fixedAgent.name ? fixedAgent.name.charAt(0).toUpperCase() : 'A';
      fixedAgent.iconUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%234a69bd'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='40' font-weight='bold' text-anchor='middle' dominant-baseline='middle' fill='%23ffffff'%3E${initial}%3C/text%3E%3C/svg%3E`;
    }
    
    return fixedAgent;
  });
};

// Add a new variable to track API request state at the top of the file
let pendingRequest = null;
let currentLoadId = null;
let lastSuccessfulFetchTime = null;

const useAgentStore = create(
  devtools(
    (set, get) => ({
      // State
      agents: [],
      allAgents: [],
      featuredAgents: [],
      recommendedAgents: [],
      // wishlists: [],
      selectedCategory: 'All',
      selectedFilter: 'Hot & New',
      selectedPrice: { min: 0, max: 1000 },
      selectedRating: 0,
      selectedTags: [],
      selectedFeatures: [],
      searchQuery: '',
      isLoading: true,
      isRecommendationsLoading: true,
      tagCounts: {},
      featureCounts: {},
      lastLoadTime: null, // Track when data was last loaded
      cacheExpiry: 30 * 60 * 1000, // Increase cache to 30 minutes
      
      // Actions
      setAgents: (agents) => set({ agents }),
      setAllAgents: (allAgents) => set({ allAgents }),
      setFeaturedAgents: (featuredAgents) => set({ featuredAgents }),
      setRecommendedAgents: (recommendedAgents) => set({ recommendedAgents }),
      // setWishlists: (wishlists) => set({ wishlists }),
      setCategory: (category) => set({ selectedCategory: category }),
      setFilter: (filter) => set({ selectedFilter: filter }),
      setPrice: (price) => set({ selectedPrice: price }),
      setRating: (rating) => set({ selectedRating: rating }),
      setTags: (tags) => set({ selectedTags: tags }),
      setFeatures: (features) => set({ selectedFeatures: features }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setLoading: (isLoading) => set({ isLoading }),
      setRecommendationsLoading: (isLoading) => set({ isRecommendationsLoading: isLoading }),
      setTagCounts: (tagCounts) => set({ tagCounts }),
      setFeatureCounts: (featureCounts) => set({ featureCounts }),
      
      // New method to refresh data after mutations (add/edit/delete)
      refreshAfterMutation: async () => {
        console.log('Refreshing agent store after mutation');
        // Clear the lastLoadTime to force a refresh
        set({ lastLoadTime: null });
        // Call loadInitialData with forceRefresh to get fresh data
        await get().loadInitialData(true);
      },
      
      // Toggle a tag selection
      toggleTag: (tag) => set((state) => ({
        selectedTags: state.selectedTags.includes(tag) 
          ? state.selectedTags.filter(t => t !== tag)
          : [...state.selectedTags, tag]
      })),
      
      // Toggle a feature selection
      toggleFeature: (feature) => set((state) => ({
        selectedFeatures: state.selectedFeatures.includes(feature)
          ? state.selectedFeatures.filter(f => f !== feature)
          : [...state.selectedFeatures, feature]
      })),
      
      // Reset all filters
      resetFilters: () => set({
        selectedCategory: 'All',
        selectedFilter: 'Hot & New',
        selectedPrice: { min: 0, max: 1000 },
        selectedRating: 0,
        selectedTags: [],
        selectedFeatures: [],
        searchQuery: ''
      }),
      
      // Calculate filter counts
      calculateFilterCounts: (agents) => {
        if (!agents || agents.length === 0) return;
        
        const tagCount = {};
        const featureCount = {};
        
        // Use more efficient loops for better performance
        for (let i = 0; i < agents.length; i++) {
          const agent = agents[i];
          
          // For tags, use category or tags array if available
          if (agent.category) {
            const category = agent.category;
            tagCount[category] = (tagCount[category] || 0) + 1;
          }
          
          if (agent.tags && Array.isArray(agent.tags)) {
            for (let j = 0; j < agent.tags.length; j++) {
              const tag = agent.tags[j];
              tagCount[tag] = (tagCount[tag] || 0) + 1;
            }
          }
          
          // For features, check for specific properties or use features array
          if (agent.features && Array.isArray(agent.features)) {
            for (let j = 0; j < agent.features.length; j++) {
              const feature = agent.features[j];
              featureCount[feature] = (featureCount[feature] || 0) + 1;
            }
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
        }
        
        set({ tagCounts: tagCount, featureCounts: featureCount });
      },
      
      // Apply filters to allAgents
      applyFilters: () => {
        const { 
          allAgents, 
          selectedCategory, 
          selectedFilter, 
          selectedPrice, 
          selectedRating, 
          selectedTags, 
          selectedFeatures, 
          searchQuery 
        } = get();
        
        if (!allAgents || allAgents.length === 0) return;
        
        let filteredResults = [...allAgents];
        
        console.log('Applying filters to', allAgents.length, 'agents');
        console.log('Current filters:', {
          category: selectedCategory,
          filter: selectedFilter,
          price: selectedPrice,
          rating: selectedRating,
          tags: selectedTags,
          features: selectedFeatures,
          query: searchQuery
        });
        
        // Apply category filter
        if (selectedCategory && selectedCategory !== 'All') {
          filteredResults = filteredResults.filter(agent => agent.category === selectedCategory);
          console.log(`After category filter (${selectedCategory}):`, filteredResults.length, 'agents');
        }
        
        // Apply price filter
        if (selectedPrice && (selectedPrice.min > 0 || selectedPrice.max < 1000)) {
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
            
            // Legacy format - handle price as string
            let price = agent.price;
            if (typeof price === 'string') {
              // Extract numeric part
              const numValue = parseFloat(price.replace(/[^0-9.]/g, ''));
              if (!isNaN(numValue)) {
                price = numValue;
              } else {
                price = 0; // Default for non-numeric prices
              }
            }
            
            // Compare with min and max
            return (
              price >= selectedPrice.min && 
              price <= selectedPrice.max
            );
          });
          console.log(`After price filter (${selectedPrice.min}-${selectedPrice.max}):`, filteredResults.length, 'agents');
        }
        
        // Apply rating filter
        if (selectedRating > 0) {
          filteredResults = filteredResults.filter(agent => {
            const rating = agent.rating?.average ? parseFloat(agent.rating.average) : 0;
            return rating >= selectedRating;
          });
          console.log(`After rating filter (${selectedRating}+):`, filteredResults.length, 'agents');
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
          console.log(`After tag filters (${selectedTags.join(', ')}):`, filteredResults.length, 'agents');
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
          console.log(`After feature filters (${selectedFeatures.join(', ')}):`, filteredResults.length, 'agents');
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
          console.log(`After search query "${query}":`, filteredResults.length, 'agents');
        }
        
        // Apply sorting based on selected filter
        if (selectedFilter) {
          console.log(`Sorting by ${selectedFilter}`);
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
        }
        
        // Set the filtered agents to state
        console.log('Setting filtered results:', filteredResults.length, 'agents');
        set({ agents: filteredResults });
      },
      
      // Load initial data
      loadInitialData: async (forceRefresh = false) => {
        // Generate a unique ID for this request
        const requestId = Date.now();
        currentLoadId = requestId;
        
        try {
          // Check if we have recent data in cache
          const now = Date.now();
          const lastLoad = get().lastLoadTime;
          const cacheExpiry = get().cacheExpiry;
          
          // Skip cache if forceRefresh is true
          if (!forceRefresh && lastLoad && (now - lastLoad < cacheExpiry) && get().allAgents.length > 0) {
            console.log('Using cached agent data from', Math.round((now - lastLoad)/1000), 'seconds ago');
            // If we have cached data, just update loading states
            set({ isLoading: false, isRecommendationsLoading: false });
            return;
          }
          
          // Set loading state
          set({ isLoading: true, isRecommendationsLoading: true });
          
          // If the ID changes during fetch, abort operation
          if (currentLoadId !== requestId) {
            console.log('Aborting superseded loadInitialData request');
            return;
          }
          
          // MAKE ONLY ONE API CALL - Get all agents with a larger limit to ensure we have enough data
          console.log('Fetching fresh agent data with a single API call');
          
          // Avoid duplicate calls with a short timeout
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Check again if this request is still relevant
          if (currentLoadId !== requestId) {
            console.log('Aborting superseded loadInitialData request after timeout');
            return;
          }
          
          // Use a larger limit to ensure we have enough agents for all purposes
          // We need to make sure we get enough for:
          // 1. All standard filtering
          // 2. Featured agents
          // 3. Recommended agents
          const allAgentsResponse = await fetchAgents('All', 'All', 1, { 
            limit: 100, // Higher limit to get enough data for all needs
            bypassCache: forceRefresh, // Only bypass cache if forceRefresh is true
            useMockData: process.env.NODE_ENV === 'development' // Use mock data in development if needed
          });
          
          // Check if this request is still relevant
          if (currentLoadId !== requestId) {
            console.log('Ignoring stale agent data response');
            return;
          }
          
          // Fetch wishlists separately (this is essential user data, not redundant)
          // Only fetch wishlists if we have an authenticated user or force refresh is true
          // let wishlistsResponse = [];
          // if (localStorage.getItem('authToken') || forceRefresh) {
          //   try {
          //     wishlistsResponse = await fetchWishlists();
          //   } catch (error) {
          //     console.error('Error fetching wishlists, using empty array:', error);
          //     wishlistsResponse = [];
          //   }
          // } else {
          //   console.log('Skipping wishlist fetch for unauthenticated user');
          // }
          
          // Check again if this request is still relevant
          if (currentLoadId !== requestId) {
            console.log('Ignoring stale wishlist data response');
            return;
          }
          
          // Apply URL fixes to ensure placeholders work
          const fixedAgents = fixPlaceholderUrls(allAgentsResponse) || [];
          
          // DERIVE FEATURED AGENTS - No separate API call
          const featuredAgents = [...fixedAgents]
            .filter(agent => agent.isFeatured === true) // Only include agents explicitly marked as featured
            .sort((a, b) => {
              // Sort by creation date - newest first
              const aDate = a.createdAt || a.dateCreated || a.updatedAt || '0';
              const bDate = b.createdAt || b.dateCreated || b.updatedAt || '0';
              return new Date(bDate) - new Date(aDate);
            })
            .slice(0, 8); // Limit to 8 featured agents
            
          console.log(`Derived ${featuredAgents.length} featured agents locally from all agents data`);
          
          // DERIVE RECOMMENDED AGENTS - No separate API call
          const recommendedAgents = [...fixedAgents]
            .sort((a, b) => {
              const aPopularity = a.usersCount || a.views || a.rating?.count || 0;
              const bPopularity = b.usersCount || b.views || b.rating?.count || 0;
              
              if (aPopularity !== bPopularity) {
                return bPopularity - aPopularity;
              }
              
              const aRating = a.rating?.average || 0;
              const bRating = b.rating?.average || 0;
              return bRating - aRating;
            })
            .slice(0, 10);
            
          console.log(`Derived ${recommendedAgents.length} recommended agents locally from all agents data`);
          
          // Update store with ALL data at once
          set({ 
            agents: fixedAgents,
            allAgents: fixedAgents,
            featuredAgents: featuredAgents,
            recommendedAgents: recommendedAgents,
            // wishlists: wishlistsResponse,
            isLoading: false,
            isRecommendationsLoading: false,
            lastLoadTime: Date.now() // Update the cache timestamp
          });
          
          // Compute tag and feature statistics
          const tagCounter = {};
          const featureCounter = {};
          
          fixedAgents.forEach(agent => {
            // Count tags
            if (agent.tags && Array.isArray(agent.tags)) {
              agent.tags.forEach(tag => {
                tagCounter[tag] = (tagCounter[tag] || 0) + 1;
              });
            }
            
            // Count features
            if (agent.features && Array.isArray(agent.features)) {
              agent.features.forEach(feature => {
                featureCounter[feature] = (featureCounter[feature] || 0) + 1;
              });
            }
          });
          
          set({ 
            tagCounts: tagCounter, 
            featureCounts: featureCounter
          });
        } catch (error) {
          console.error('Error in loadInitialData:', error);
          set({ isLoading: false, isRecommendationsLoading: false });
        }
      },
      
      // Get featured agents from the store with proper filtering
      getFeaturedAgents: (limit = 8) => {
        const { allAgents } = get();
        
        if (!allAgents || allAgents.length === 0) {
          return [];
        }
        
        // Only include agents explicitly marked as featured
        return [...allAgents]
          .filter(agent => agent.isFeatured === true)
          .sort((a, b) => {
            // Sort by creation date - newest first
            const aDate = a.createdAt || a.dateCreated || a.updatedAt || '0';
            const bDate = b.createdAt || b.dateCreated || b.updatedAt || '0';
            return new Date(bDate) - new Date(aDate);
          })
          .slice(0, limit);
      },
      
      // Get recommended agents with appropriate filtering
      getRecommendedAgents: (limit = 4) => {
        const { allAgents, recommendedAgents } = get();
        
        // If we already have recommended agents, use those
        if (recommendedAgents && recommendedAgents.length > 0) {
          return recommendedAgents.slice(0, limit);
        }
        
        if (!allAgents || allAgents.length === 0) {
          return [];
        }
        
        // Create recommendations based on popularity or ratings
        return [...allAgents]
          .sort((a, b) => {
            // Sort by view count or popularity metrics
            const aPopularity = a.usersCount || a.views || a.rating?.count || 0;
            const bPopularity = b.usersCount || b.views || b.rating?.count || 0;
            
            if (aPopularity !== bPopularity) {
              return bPopularity - aPopularity; // Higher popularity first
            }
            
            // If popularity is the same, sort by rating
            const aRating = a.rating?.average || 0;
            const bRating = b.rating?.average || 0;
            return bRating - aRating;
          })
          .slice(0, limit);
      }
    }),
    { name: 'agent-store' }
  )
);

export default useAgentStore; 