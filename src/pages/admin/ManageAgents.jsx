import React, { useState, useEffect, useMemo } from 'react';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSearch, 
  FaFilter, 
  FaSort,
  FaCheck,
  FaTimes 
} from 'react-icons/fa';
import Modal from '../../components/Modal';
import AdminLayout from '../../components/admin/AdminLayout';
import AgentForm from '../../components/admin/AgentForm';
import './ManageAgents.css';
import { getAuthHeaders, validateAndRefreshToken } from '../../utils/auth';
import { deleteAgent as deleteAgentHelper } from '../../utils/agent-helper';
import { toast } from 'react-hot-toast';
import { checkApiStatus } from '../../utils/api';

/**
 * Admin page for managing agents with CRUD functionality
 */
const ManageAgents = () => {
  // State for agents data
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for filtering and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // State for confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State for selected agent and form visibility
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showAgentForm, setShowAgentForm] = useState(false);
  
  // State for API status
  const [apiStatus, setApiStatus] = useState({ checked: false, isOnline: true, message: '' });
  
  // Add state for authentication status
  const [authStatus, setAuthStatus] = useState({ 
    isAuthenticated: true, 
    networkError: false,
    errorMessage: null,
    errorCode: null 
  });
  
  // Add a cache for individual agent data with timestamps
  const [agentCache, setAgentCache] = useState({});
  
  // Cache constants
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const EDIT_MODE_CACHE_TTL = 30 * 1000; // 30 seconds for more frequent refreshes during editing
  
  // Function to check if cache is valid
  const isCacheValid = (cachedData, isEditMode = false) => {
    if (!cachedData || !cachedData.timestamp) return false;
    
    const now = Date.now();
    const ttl = isEditMode ? EDIT_MODE_CACHE_TTL : CACHE_TTL;
    return (now - cachedData.timestamp) < ttl;
  };
  
  // Function to track modified fields to avoid unnecessary updates
  const [modifiedFields, setModifiedFields] = useState({});
  
  // Function to sanitize and prepare agent ID for API calls
  const prepareAgentIdForApi = (agentId) => {
    if (!agentId) return null;
    
    // Remove any 'agent-' prefix for the API call
    let apiId = agentId;
    if (apiId.startsWith('agent-')) {
      apiId = apiId.substring(6); // Remove 'agent-' prefix
    }
    
    console.log(`Preparing agent ID for API: ${agentId} → ${apiId}`);
    return apiId;
  };
  
  // Function to get agent with cache management
  const getAgentWithCache = async (agentId, skipPriceRequest = false, forceRefresh = false) => {
    try {
      if (!agentId) {
        console.error('getAgentWithCache called with null/undefined agentId');
        return null;
      }
      
      // Sanitize agent ID for consistent cache keys
      const sanitizedAgentId = typeof agentId === 'string' ? agentId.trim() : String(agentId);
      
      // Check if this is a mock agent ID (has agent- prefix)
      // If so, we can skip the API call entirely
      const isMockAgent = sanitizedAgentId.toString().startsWith('agent-');
      
      // Check if we have a valid cached version (use shorter TTL when in edit mode)
      const cachedAgent = agentCache[sanitizedAgentId];
      const isEditMode = !!selectedAgent;
      
      if (!forceRefresh && isCacheValid(cachedAgent, isEditMode)) {
        console.log(`Using cached data for agent ${sanitizedAgentId} (${Math.round((Date.now() - cachedAgent.timestamp)/1000)}s old)`);
        return cachedAgent.data;
      }
      
      // If this is a mock agent, we know the backend doesn't have it
      // So we'll create a mock agent without making an API call
      if (isMockAgent) {
        console.log(`Creating/refreshing mock data for agent ${sanitizedAgentId}`);
        // Create a mock agent with basic properties
        const mockAgent = {
          id: sanitizedAgentId,
          error: 'Endpoint not found',
          message: 'This API endpoint is not yet available. Try implementing it on the backend.',
          name: `Test Agent ${sanitizedAgentId}`,
          description: 'This is a mock agent for testing',
          priceDetails: {
            basePrice: 9.99,
            discountedPrice: 7.99,
            currency: 'USD'
          },
          isFree: false,
          isSubscription: false
        };
        
        // Store the mock data in cache
        setAgentCache(prev => ({
          ...prev,
          [sanitizedAgentId]: {
            data: mockAgent,
            timestamp: Date.now()
          }
        }));
        
        return mockAgent;
      }
      
      // Prepare agent ID for API - important to do this correctly to avoid 404s
      const apiAgentId = prepareAgentIdForApi(sanitizedAgentId);
      if (!apiAgentId) {
        console.error('Failed to prepare valid API agent ID');
        return null;
      }
      
      // No valid cache and not a mock agent, fetch from server
      console.log(`Fetching fresh data for agent ${sanitizedAgentId}, API ID: ${apiAgentId}`);
      try {
        // Important: Use the prepared API ID for the request
        const agent = await apiRequest(
          `http://localhost:4000/api/agent/${apiAgentId}`, 
          'GET',
          null,
          skipPriceRequest ? {} : { includePrice: 'true' }
        );
        
        // Store in cache with timestamp
        setAgentCache(prev => ({
          ...prev,
          [sanitizedAgentId]: {
            data: agent,
            timestamp: Date.now()
          }
        }));
        
        // If we don't need to make a separate price request
        if (skipPriceRequest || agent.priceDetails) {
          return agent;
        }
        
        // If we need price data and it wasn't included in the main response
        try {
          // Use the prepared API ID for this request too
          const priceResponse = await apiRequest(
            `http://localhost:4000/api/agent/${apiAgentId}/price`, 
            'GET'
          );
          
          if (priceResponse) {
            // Merge price data with agent data
            const agentWithPrice = {
              ...agent,
              priceDetails: {
                basePrice: priceResponse.basePrice || 0,
                discountedPrice: priceResponse.discountedPrice || priceResponse.finalPrice || 0,
                currency: priceResponse.currency || 'USD'
              },
              isFree: priceResponse.isFree || priceResponse.basePrice === 0,
              isSubscription: priceResponse.isSubscription || false
            };
            
            // Update the cache with the combined data
            setAgentCache(prev => ({
              ...prev,
              [sanitizedAgentId]: {
                data: agentWithPrice,
                timestamp: Date.now()
              }
            }));
            
            return agentWithPrice;
          }
        } catch (priceError) {
          console.error(`Error fetching price data for agent ${apiAgentId}:`, priceError);
          // Continue with just the agent data
        }
        
        return agent;
      } catch (error) {
        // Check if it's a 404 (agent not found)
        if (error?.status === 404) {
          console.warn(`Agent not found with ID ${apiAgentId}, using mock data`);
          // Return a mock agent with basic properties for the form
          const mockAgent = {
            id: sanitizedAgentId,
            error: 'Endpoint not found',
            message: 'This API endpoint is not yet available. Try implementing it on the backend.',
            name: `Test Agent ${sanitizedAgentId}`,
            description: 'This is a mock agent for testing',
            priceDetails: {
              basePrice: 9.99,
              discountedPrice: 7.99,
              currency: 'USD'
            },
            isFree: false,
            isSubscription: false
          };
          
          // Store the mock data in cache
          setAgentCache(prev => ({
            ...prev,
            [sanitizedAgentId]: {
              data: mockAgent,
              timestamp: Date.now()
            }
          }));
          
          return mockAgent;
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Error in getAgentWithCache:', error);
      throw error;
    }
  };
  
  // Function to track which fields are modified to avoid unnecessary API calls
  const handleFieldChange = (field, value, originalValue) => {
    // Check if the field value is actually different from the original
    const isModified = value !== originalValue;
    
    setModifiedFields(prev => ({
      ...prev,
      [field]: isModified
    }));
  };
  
  // Function to invalidate cache for an agent
  const invalidateAgentCache = (agentId) => {
    console.log(`Invalidating cache for agent ${agentId}`);
    setAgentCache(prev => {
      const newCache = {...prev};
      delete newCache[agentId];
      return newCache;
    });
  };
  
  // Add mock auth token for development - REMOVE IN PRODUCTION!
  useEffect(() => {
    // Validate and refresh token if needed
    if (!validateAndRefreshToken() && process.env.NODE_ENV === 'development') {
      // Token is invalid or missing, import and use the auth utility
      import('../../utils/auth').then(({ generateMockFirebaseToken }) => {
        const mockToken = generateMockFirebaseToken();
        localStorage.setItem('authToken', mockToken);
        console.log('Mock Firebase-like JWT token set for development');
        
        // After setting token, fetch agents
        fetchAgents();
      });
    } else {
      // Token is valid, fetch agents
      fetchAgents();
    }
  }, []);
  
  // Check API status on component load
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const status = await checkApiStatus();
        setApiStatus({
          checked: true,
          isOnline: status.isOnline,
          message: status.message
        });
        
        if (!status.isOnline) {
          console.warn('Backend API is not available:', status.message);
          toast.error(`Backend API issue: ${status.message}. Using mock data.`);
        }
      } catch (error) {
        console.error('Error checking API status:', error);
        setApiStatus({
          checked: true,
          isOnline: false,
          message: error.message
        });
        toast.error('Could not connect to backend. Using mock data.');
      }
    };
    
    checkBackendStatus();
  }, []);
  
  // Send API request with authentication and error handling
  const apiRequest = async (url, method, data = null, queryParams = {}) => {
    try {
      // Log all API requests for debugging
      console.log(`API Request: ${method} ${url}`, { data, queryParams });
      
      // Generate auth headers for every request
      const headers = await getAuthHeaders();
      
      // Build the request options
      const options = {
        method,
        headers,
        credentials: 'include'
      };
      
      // Add body for non-GET requests
      if (data && method !== 'GET') {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
      }
      
      // Add query parameters if provided
      let requestUrl = url;
      if (Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          params.append(key, value);
        });
        requestUrl = `${url}?${params.toString()}`;
      }
      
      // Send the request
      console.log(`API Request: ${method} ${requestUrl}`, options);
      const response = await fetch(requestUrl, options);
      
      // Log the response status and headers
      console.log(`API Response: ${response.status} ${response.statusText}`);
      console.log(`Response headers:`, Object.fromEntries([...response.headers.entries()]));
      
      // Special handling for 204 No Content responses
      if (response.status === 204) {
        console.log('Received 204 No Content response, treating as success');
        return { 
          success: true, 
          message: 'Operation completed successfully',
          status: 204
        };
      }
      
      // Parse the response JSON (or return null if no content)
      const contentType = response.headers.get('content-type');
      const hasJsonContent = contentType && contentType.includes('application/json');
      
      let responseData;
      if (hasJsonContent) {
        responseData = await response.json();
      } else {
        responseData = { 
          status: response.status, 
          text: await response.text(),
          success: response.ok // Add success flag based on HTTP status
        };
      }
      
      // If the response is not ok (status >= 400)
      if (!response.ok) {
        // Log the error response
        console.error(` API Error: ${response.status} - ${JSON.stringify(responseData)}`);
        
        // Throw a structured error
        const error = new Error(JSON.stringify(responseData));
        error.status = response.status;
        error.statusText = response.statusText;
        error.response = responseData;
        throw error;
      }
      
      // Normalize price data if it's a price-related endpoint
      if (url.includes('/price') && responseData) {
        // Make sure we have consistent price properties
        const normalizedPrice = normalizePriceData(responseData);
        return normalizedPrice;
      }
      
      // If it's an agent response, normalize any price data inside it
      if (url.includes('/agent/') && !url.includes('/price') && responseData) {
        return normalizeAgentPriceData(responseData);
      }
      
      return responseData;
    } catch (error) {
      // Log the full error
      console.error(`API Error in ${method} ${url}:`, error);
      
      // Check for specific error conditions
      if (error.message === 'Failed to fetch') {
        // Network error
        toast.error('Network error. Please check your connection and try again.');
      } else if (error.status === 401) {
        // Authentication error
        toast.error('Authentication error. Please log in again.');
      } else if (error.status === 403) {
        // Permission error
        toast.error('Permission denied. You do not have access to this resource.');
      }
      
      // Generate a mock response for development purposes
      if (process.env.NODE_ENV === 'development' && url.includes('/price')) {
        console.log(` Generating mock response for ${method} ${url}`);
        return generateMockPriceData();
      }
      
      // Re-throw the error for the caller to handle
      throw error;
    }
  };
  
  /**
   * Normalize price data to ensure consistent structure
   * @param {object} priceData - Raw price data from API
   * @returns {object} Normalized price data
   */
  const normalizePriceData = (priceData) => {
    if (!priceData) return null;
    
    // Ensure base price is a number
    const basePrice = typeof priceData.basePrice === 'number' 
      ? priceData.basePrice 
      : parseFloat(priceData.basePrice) || 0;
    
    // Get discounted price from various possible sources
    let discountedPrice = basePrice;
    if (typeof priceData.discountedPrice === 'number' || priceData.discountedPrice) {
      discountedPrice = typeof priceData.discountedPrice === 'number'
        ? priceData.discountedPrice
        : parseFloat(priceData.discountedPrice) || basePrice;
    } else if (typeof priceData.finalPrice === 'number' || priceData.finalPrice) {
      discountedPrice = typeof priceData.finalPrice === 'number'
        ? priceData.finalPrice
        : parseFloat(priceData.finalPrice) || basePrice;
    }
    
    // Calculate discount percentage
    const discountPercentage = basePrice > 0 
      ? Math.round(((basePrice - discountedPrice) / basePrice) * 100) 
      : 0;
    
    return {
      ...priceData,
      basePrice,
      discountedPrice,
      finalPrice: discountedPrice, // For backwards compatibility
      discountPercentage,
      currency: priceData.currency || 'USD',
      isFree: basePrice === 0 || !!priceData.isFree,
      isSubscription: !!priceData.isSubscription
    };
  };
  
  /**
   * Normalize agent data to ensure consistent price information
   * @param {object} agentData - Raw agent data from API
   * @returns {object} Normalized agent data with consistent price information
   */
  const normalizeAgentPriceData = (agentData) => {
    if (!agentData) return null;
    
    // Clone the agent data to avoid modifying the original
    const normalizedAgent = { ...agentData };
    
    // If agent has priceDetails, normalize them
    if (normalizedAgent.priceDetails) {
      // Use our price normalization function
      const normalizedPrice = normalizePriceData(normalizedAgent.priceDetails);
      
      // Update the priceDetails object
      normalizedAgent.priceDetails = normalizedPrice;
      
      // Also update direct price fields for backwards compatibility
      normalizedAgent.basePrice = normalizedPrice.basePrice;
      normalizedAgent.discountedPrice = normalizedPrice.discountedPrice;
      normalizedAgent.price = normalizedPrice.discountedPrice; // Legacy field
      normalizedAgent.isFree = normalizedPrice.isFree;
      normalizedAgent.isSubscription = normalizedPrice.isSubscription;
      normalizedAgent.discountPercentage = normalizedPrice.discountPercentage;
    } else {
      // If no priceDetails, create them from direct price fields
      const priceData = {
        basePrice: normalizedAgent.basePrice || 0,
        discountedPrice: normalizedAgent.discountedPrice || normalizedAgent.price || 0,
        currency: normalizedAgent.currency || 'USD',
        isFree: normalizedAgent.isFree || normalizedAgent.basePrice === 0 || normalizedAgent.price === 0,
        isSubscription: normalizedAgent.isSubscription || false
      };
      
      // Normalize the collected price data
      const normalizedPrice = normalizePriceData(priceData);
      
      // Add priceDetails object
      normalizedAgent.priceDetails = normalizedPrice;
      
      // Update direct price fields for consistency
      normalizedAgent.basePrice = normalizedPrice.basePrice;
      normalizedAgent.discountedPrice = normalizedPrice.discountedPrice;
      normalizedAgent.price = normalizedPrice.discountedPrice; // Legacy field
      normalizedAgent.isFree = normalizedPrice.isFree;
      normalizedAgent.isSubscription = normalizedPrice.isSubscription;
      normalizedAgent.discountPercentage = normalizedPrice.discountPercentage;
    }
    
    return normalizedAgent;
  };
  
  /**
   * Generate mock price data for development
   * @returns {object} Mock price data
   */
  const generateMockPriceData = () => {
    return {
      basePrice: 29.99,
      discountedPrice: 19.99,
      finalPrice: 19.99,
      discountPercentage: 33,
      currency: 'USD',
      isFree: false,
      isSubscription: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };
  
  // Fetch agents on component mount
  useEffect(() => {
    fetchAgents();
  }, []);
  
  // Function to fetch agents from the API
  const fetchAgents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // If API is offline, go straight to mock data
      if (apiStatus.checked && !apiStatus.isOnline) {
        console.log('Using mock data because API is offline');
        const mockData = generateMockAgents();
        setAgents(mockData);
        return;
      }
      
      // Use our apiRequest helper with fallback to mock data
      const data = await apiRequest('http://localhost:4000/api/agents', 'GET')
        .catch(error => {
          console.warn('Using mock data due to API error:', error.message);
          // Return mock data structure
          return { agents: generateMockAgents() };
        });
      
      // Check if data has agents property
      if (data.agents) {
        console.log('✅ Agents fetched successfully:', data.agents.length, 'agents');
        
        // Update cache for all agents
        const newCache = {...agentCache};
        data.agents.forEach(agent => {
          newCache[agent.id] = {
            data: agent,
            timestamp: Date.now()
          };
        });
        setAgentCache(newCache);
        
        // Sort agents by id to maintain consistent order
        const sortedAgents = [...data.agents].sort((a, b) => {
          // Extract numeric part for natural sorting
          const aNum = parseInt(a.id.replace(/\D/g, '')) || 0;
          const bNum = parseInt(b.id.replace(/\D/g, '')) || 0;
          return aNum - bNum;
        });
        
        setAgents(sortedAgents);
      } else {
        console.warn('⚠️ Response does not contain agents array, using empty array');
        setAgents([]);
      }
    } catch (error) {
      console.error('❌ Error fetching agents:', error);
      setError('Failed to fetch agents. ' + error.message);
      setAgents([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };
  
  // Mock data generator for development
  const generateMockAgents = () => {
    return Array(10).fill().map((_, i) => ({
      id: `agent-${i+1}`,
      name: `Test Agent ${i+1}`,
      category: i % 3 === 0 ? 'AI' : i % 3 === 1 ? 'Machine Learning' : 'Natural Language',
      description: `This is a description for test agent ${i+1}`,
      price: (i+1) * 10,
      imageUrl: `https://picsum.photos/200/200?random=${i}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  };
  
  // Function to handle delete confirmation
  const handleDeleteClick = (agent) => {
    setAgentToDelete(agent);
    setShowDeleteModal(true);
  };
  
  /**
   * Function to delete an agent
   */
  const deleteAgent = async () => {
    if (!agentToDelete || !agentToDelete.id) {
      toast.error('Cannot delete: Missing agent ID');
      setIsDeleting(false);
      setShowDeleteModal(false);
      return;
    }
    
    setIsDeleting(true);
    
    try {
      // Call the helper function to delete the agent
      const result = await deleteAgentHelper(agentToDelete.id);
      console.log('Delete result from helper:', result);
      
      // Only show success if the operation was actually successful
      if (result.success) {
        // Remove the agent from the local state
        setAgents(agents.filter(agent => agent.id !== agentToDelete.id));
        
        // Show success notification
        toast.success('Agent deleted successfully');
        console.log('✅ Agent deleted successfully');
      } else {
        // Show error notification
        toast.error(result.message || 'Failed to delete agent');
        console.error('❌ Failed to delete agent:', result.message);
        
        // Special case for the Firestore error we identified
        if (result.message && result.message.includes('not a valid resource path')) {
          toast.error('Database error: The agent ID format is invalid', {
            duration: 6000
          });
          console.error('Firestore path error detected - agent ID format issue');
        }
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error(`Error deleting agent: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false); // Close the modal
      setAgentToDelete(null); // Reset the agent to delete
    }
  };
  
  // Function to handle agent edit button click
  const handleEditClick = (agent) => {
    try {
      console.log('Edit clicked for agent:', agent);
      if (!agent || !agent.id) {
        console.error('Cannot edit agent: Missing agent ID');
        showToast('Invalid agent data. Cannot edit.', 'error');
        return;
      }
      
      // Sanitize the agent ID to prevent issues
      const sanitizedAgentId = typeof agent.id === 'string' ? agent.id.trim() : String(agent.id);
      
      // Determine if this is a mock agent 
      const isMockAgent = sanitizedAgentId.toString().startsWith('agent-');
      
      // Create a sanitized agent object with the correct ID for the form
      const sanitizedAgent = {
        ...agent,
        id: sanitizedAgentId
      };
      
      // Check if we have a recent cache entry for this agent
      const cachedAgent = agentCache[sanitizedAgentId];
      const isRecentCache = cachedAgent && (Date.now() - cachedAgent.timestamp < 30000); // 30 seconds
      
      if (isRecentCache) {
        // If we have recent cache data, use it immediately and open the form
        console.log('Using recently cached data for edit form');
        setSelectedAgent(cachedAgent.data);
        setShowAgentForm(true);
        
        // For mock agents, skip the refresh entirely
        if (isMockAgent) {
          console.log('Skipping background refresh for mock agent:', sanitizedAgentId);
          return;
        }
        
        // Only fetch fresh data in the background if cache is older than 10 seconds
        const cacheAge = Date.now() - cachedAgent.timestamp;
        if (cacheAge > 10000) { // 10 seconds
          console.log('Cache is older than 10 seconds, refreshing in background');
          refreshAgentInBackground(sanitizedAgentId);
        }
      } else {
        // If no recent cache, still show the form with what we have
        // while loading fresh data
        setSelectedAgent(sanitizedAgent);
        setShowAgentForm(true);
        
        // Skip refresh for mock agents
        if (!isMockAgent) {
          // Then load fresh data
          refreshAgentInBackground(sanitizedAgentId);
        }
      }
    } catch (error) {
      console.error('Error in handleEditClick:', error);
      showToast('An error occurred while preparing to edit the agent.', 'error');
    }
  };
  
  // Function to refresh agent data in the background
  const refreshAgentInBackground = async (agentId) => {
    try {
      if (!agentId) {
        console.error('refreshAgentInBackground: missing agentId parameter');
        return;
      }
      
      // Check if this is a mock agent (has the agent- prefix)
      // If so, there's no need to make API calls since we know the backend doesn't have it
      const isMockAgent = agentId.toString().startsWith('agent-');
      
      if (isMockAgent) {
        console.log(`Agent ${agentId} is a mock agent, skipping backend refresh`);
        
        // Get the agent from cache directly
        const cachedAgent = agentCache[agentId];
        if (cachedAgent && cachedAgent.data) {
          console.log('Using cached mock agent data:', cachedAgent.data);
          setSelectedAgent(cachedAgent.data);
          return;
        }
      }
      
      console.log(`Refreshing agent data in background for ID: ${agentId}`);
      // Get fresh agent data with price included to minimize API calls
      // Pass true for skipPriceRequest parameter to get price in the main call
      const refreshedAgent = await getAgentWithCache(agentId, true, true);
      
      if (refreshedAgent) {
        console.log('Got refreshed agent data:', refreshedAgent);
        // Update the form with the refreshed data
        setSelectedAgent(refreshedAgent);
      } else {
        console.warn('No data returned when refreshing agent in background');
      }
    } catch (error) {
      console.warn('Error refreshing agent data:', error);
      // Form is already open with the initial data, so user can still proceed
    }
  };
  
  // Function to create a new agent
  const handleCreateClick = () => {
    setSelectedAgent(null);
    setShowAgentForm(true);
  };
  
  // Function to handle form submission
  const handleFormSubmit = async (agentData) => {
    try {
      let savedAgent;
      let agentId = selectedAgent?.id;
      
      // Extract price data from agent data to avoid duplication in payload
      const { basePrice, discountedPrice, isFree, isSubscription, ...agentDataWithoutPrice } = agentData;
      
      // Create a price payload if pricing data is provided
      const pricePayload = {
        basePrice: basePrice || 0,
        discountedPrice: discountedPrice || 0,
        isFree: isFree || false,
        isSubscription: isSubscription || false,
        currency: agentData.currency || 'USD'
      };
      
      if (selectedAgent) {
        // Update existing agent
        // Ensure agent ID is sanitized (no slashes or spaces)
        const sanitizedAgentId = selectedAgent.id.trim().split('/')[0];
        
        // Extract the numeric part for API calls if ID starts with "agent-"
        const apiAgentId = sanitizedAgentId.startsWith('agent-') 
          ? sanitizedAgentId.substring(6) // Remove "agent-" prefix
          : sanitizedAgentId;
        
        console.log('Updating agent:', sanitizedAgentId, 'API ID:', apiAgentId);
        
        // Combined payload that includes price data to reduce API calls
        const combinedUpdateData = {
          ...agentDataWithoutPrice,
          priceData: pricePayload,
          _method: 'PATCH' // Some backends support this convention
        };
        
        try {
          // Use a single API call to update both agent and price
          const response = await apiRequest(
            `http://localhost:4000/api/agent/${apiAgentId}/combined-update`, 
            'POST',
            combinedUpdateData
          );
          
          // Check if the combined update succeeded
          if (response && (response.success || response.status === 204)) {
            console.log('Combined update successful:', response);
            
            // Use the data field from the response if available
            if (response.data) {
              savedAgent = response.data;
            } else {
              // If no data in response (e.g., for 204 responses), fetch the agent again
              console.log('No data in response, fetching updated agent data');
              savedAgent = await getAgentWithCache(sanitizedAgentId, true, true);
            }
            
            // Display success message
            toast.success(response.message || 'Agent updated successfully');
          } else {
            console.log('Combined update failed or returned error:', 
              response?.error || response?.message || 'No valid response');
            
            // Fall back to separate calls
            console.log('Using separate calls for agent and price update');
            
            // Update agent data
            savedAgent = await apiRequest(
              `http://localhost:4000/api/agent/${sanitizedAgentId}`, 
              'POST',
              { ...agentDataWithoutPrice, _method: 'PATCH' }
            );
            
            // Only make price API call if price data was actually changed
            if (basePrice !== undefined || discountedPrice !== undefined || 
                isFree !== undefined || isSubscription !== undefined) {
              
              // Important: Use the same API ID format as in the combined update call
              // to prevent duplicate calls to different endpoints
              const priceResponse = await apiRequest(
                `http://localhost:4000/api/agent/${apiAgentId}/price`,
                'PUT',
                pricePayload
              );
              
              // Merge price data with the agent data for UI consistency
              if (priceResponse) {
                savedAgent = {
                  ...savedAgent,
                  priceDetails: {
                    basePrice: priceResponse.basePrice || 0,
                    discountedPrice: priceResponse.discountedPrice || priceResponse.finalPrice || priceResponse.basePrice || 0,
                    currency: priceResponse.currency || 'USD'
                  },
                  isFree: priceResponse.isFree || false,
                  isSubscription: priceResponse.isSubscription || false
                };
              }
            }
          }
        } catch (updateError) {
          console.error('Update failed, trying alternative approach:', updateError);
          
          // Fallback to PUT method 
          try {
            savedAgent = await apiRequest(
              `http://localhost:4000/api/agent/${sanitizedAgentId}`, 
              'PUT',
              agentDataWithoutPrice
            );
            
            // Update price with PUT if needed
            if (basePrice !== undefined || discountedPrice !== undefined || 
                isFree !== undefined || isSubscription !== undefined) {
              
              // Use the same API ID format consistently
              const priceResponse = await apiRequest(
                `http://localhost:4000/api/agent/${apiAgentId}/price`,
                'PUT',
                pricePayload
              );
              
              // Merge price data
              if (priceResponse) {
                savedAgent = {
                  ...savedAgent,
                  priceDetails: {
                    basePrice: priceResponse.basePrice || 0,
                    discountedPrice: priceResponse.discountedPrice || priceResponse.finalPrice || 0,
                    currency: priceResponse.currency || 'USD'
                  },
                  isFree: priceResponse.isFree || false,
                  isSubscription: priceResponse.isSubscription || false
                };
              }
            }
          } catch (putError) {
            console.error('PUT method failed, using local data:', putError);
            
            // Fallback to mock data if both methods fail
            savedAgent = {
              ...selectedAgent,
              ...agentDataWithoutPrice,
              priceDetails: {
                basePrice: basePrice || selectedAgent.priceDetails?.basePrice || 0,
                discountedPrice: discountedPrice || selectedAgent.priceDetails?.discountedPrice || 0,
                currency: agentData.currency || selectedAgent.priceDetails?.currency || 'USD'
              },
              isFree: isFree ?? selectedAgent.isFree ?? false,
              isSubscription: isSubscription ?? selectedAgent.isSubscription ?? false,
              updatedAt: new Date().toISOString()
            };
          }
        }
      } else {
        // Create new agent with price data in one request
        console.log('Creating new agent with pricing data');
        
        // Combined payload for creation
        const combinedCreateData = {
          ...agentDataWithoutPrice,
          priceData: pricePayload
        };
        
        try {
          // Try to use a single endpoint that handles both agent and price creation
          savedAgent = await apiRequest(
            'http://localhost:4000/api/agent/with-price', 
            'POST',
            combinedCreateData
          );
          
          // Fall back to separate calls if needed
          if (!savedAgent || savedAgent.error === 'Endpoint not found') {
            console.log('Combined creation endpoint not available, using separate calls');
            console.log('FALLBACK: Using separate API calls for agent creation and price update');
            
            savedAgent = await apiRequest(
              'http://localhost:4000/api/agent', 
              'POST',
              agentDataWithoutPrice
            );
            
            // Only if we have a valid agent ID from creation, update price
            if (savedAgent && savedAgent.id) {
              const priceResponse = await apiRequest(
                `http://localhost:4000/api/agent/${savedAgent.id}/price`,
                'PUT',
                pricePayload
              );
              
              // Merge price data
              if (priceResponse) {
                savedAgent = {
                  ...savedAgent,
                  priceDetails: {
                    basePrice: priceResponse.basePrice || 0,
                    discountedPrice: priceResponse.discountedPrice || priceResponse.finalPrice || 0,
                    currency: priceResponse.currency || 'USD'
                  },
                  isFree: priceResponse.isFree || false,
                  isSubscription: priceResponse.isSubscription || false
                };
              }
            }
          }
        } catch (createError) {
          console.error('Failed to create agent, using mock data:', createError);
          
          // Fallback to mock data
          savedAgent = {
            ...agentDataWithoutPrice,
            id: `mock-agent-${Date.now()}`,
            priceDetails: {
              basePrice: basePrice || 0,
              discountedPrice: discountedPrice || 0,
              currency: agentData.currency || 'USD'
            },
            isFree: isFree || false,
            isSubscription: isSubscription || false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
      }
      
      // Invalidate the cache for this agent
      if (agentId) {
        invalidateAgentCache(agentId);
      }
      
      // Update the agents list - ensure we're using the freshest data but maintain order
      if (selectedAgent) {
        // Replace the agent in the list while maintaining the same position
        setAgents(prevAgents => {
          const updatedAgents = prevAgents.map(agent => 
            agent.id === savedAgent.id ? savedAgent : agent
          );
          return updatedAgents;
        });
      } else {
        // Add new agent to the list
        setAgents(prevAgents => [...prevAgents, savedAgent]);
      }
      
      // Update the cache with the new data
      setAgentCache(prev => ({
        ...prev,
        [savedAgent.id]: {
          data: savedAgent,
          timestamp: Date.now()
        }
      }));
      
      setShowAgentForm(false);
      setSelectedAgent(null);
      
      // Show a success message
      toast.success(`Agent ${selectedAgent ? 'updated' : 'created'} successfully!`);
      
      return savedAgent;
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error(`Error ${selectedAgent ? 'updating' : 'creating'} agent: ${error.message}`);
      throw error;
    }
  };
  
  // Function to handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Filter and sort agents
  const filteredAgents = agents.filter(agent => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      agent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Category filter
    const matchesCategory = categoryFilter === '' || agent.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });
  
  // Sort filtered agents - with consistent ordering
  const sortedAgents = useMemo(() => {
    // Create a stable sort by first sorting by ID to maintain consistent order
    // Then apply the user-selected sort
    return [...filteredAgents].sort((a, b) => {
      // First sort by the user-selected field
      let comparison = 0;
      
      // Handle numeric sorting for price fields
      if (sortField === 'priceDetails.basePrice' || sortField === 'basePrice') {
        const aPrice = a.priceDetails?.basePrice || a.basePrice || 0;
        const bPrice = b.priceDetails?.basePrice || b.basePrice || 0;
        comparison = sortDirection === 'asc' ? aPrice - bPrice : bPrice - aPrice;
      } 
      // Handle date sorting
      else if (sortField === 'createdAt' || sortField === 'updatedAt') {
        const aDate = new Date(a[sortField] || 0).getTime();
        const bDate = new Date(b[sortField] || 0).getTime();
        comparison = sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }
      // Handle string sorting
      else {
        const aValue = a[sortField]?.toString() || '';
        const bValue = b[sortField]?.toString() || '';
        comparison = sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // If the primary sort field values are equal, fall back to sorting by ID
      // This ensures a consistent ordering regardless of how many times you edit
      if (comparison === 0) {
        const aNum = parseInt(a.id.replace(/\D/g, '')) || 0;
        const bNum = parseInt(b.id.replace(/\D/g, '')) || 0;
        return aNum - bNum;
      }
      
      return comparison;
    });
  }, [filteredAgents, sortField, sortDirection]);
  
  // Get unique categories for filter dropdown
  const categories = [...new Set(agents.map(agent => agent.category))];
  
  // Format price for display
  const formatPrice = (agent) => {
    if (agent.isFree) return 'Free';
    
    if (agent.priceDetails) {
      const price = agent.priceDetails.discountedPrice || agent.priceDetails.basePrice;
      return `$${price.toFixed(2)}`;
    }
    
    return 'N/A';
  };
  
  // Add a function to run the price data migration
  const runPriceMigration = async () => {
    try {
      // Show confirmation toast
      toast.loading('Starting price data migration. This may take a while...', { id: 'migration' });
      
      // Call the migration API endpoint
      const result = await apiRequest(
        'http://localhost:4000/api/agent-prices/migrate',
        'POST'
      );
      
      // Show success toast with results
      toast.success(
        <div>
          <strong>Price Migration Completed</strong>
          <p>Total agents: {result.totalAgents}</p>
          <p>Updated: {result.updated}</p>
          <p>Errors: {result.errors?.length || 0}</p>
        </div>,
        { duration: 5000, id: 'migration' }
      );
      
      // If there were errors, show them in the console
      if (result.errors?.length > 0) {
        console.warn('Migration completed with errors:', result.errors);
      }
      
      // Refresh agent data after migration
      fetchAgents();
      
    } catch (error) {
      console.error('Error running price migration:', error);
      toast.error(
        <div>
          <strong>Migration Failed</strong>
          <p>{error.message || 'An unknown error occurred'}</p>
        </div>,
        { duration: 5000, id: 'migration' }
      );
    }
  };
  
  // Helper function to generate placeholder image for agent icons
  const generateAgentIconPlaceholder = (agent) => {
    const text = agent?.name?.charAt(0) || 'AI';
    const width = 40;
    const height = 40;
    const bgColor = '4a4de7';
    const textColor = 'ffffff';
    
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Crect width='${width}' height='${height}' fill='%23${bgColor}'/%3E%3Ctext x='${width/2}' y='${height/2}' font-family='Arial' font-size='16' text-anchor='middle' dominant-baseline='middle' fill='%23${textColor}'%3E${text}%3C/text%3E%3C/svg%3E`;
  };
  
  // Function to check if an image URL is valid (not example.com)
  const isSafeImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    if (url.includes('example.com')) return false;
    
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };
  
  return (
    <AdminLayout>
      <div className="manage-agents-container">
        <header className="page-header">
          <h1>Manage Agents</h1>
          
          {/* Auth Network Error Banner */}
          {authStatus.networkError && (
            <div className="auth-error-banner">
              <FaTimes className="status-icon error" />
              <div className="auth-error-content">
                <h3>Authentication Service Unreachable</h3>
                <p>{authStatus.errorMessage || "Cannot connect to authentication service"}</p>
                <ul className="error-troubleshooting">
                  <li>Check your internet connection</li>
                  <li>Verify that you're not behind a restrictive firewall or proxy</li>
                  <li>Try refreshing the page</li>
                  <li>Contact your system administrator if the problem persists</li>
                </ul>
                <button 
                  className="retry-button"
                  onClick={async () => {
                    try {
                      // Attempt to make a simple API request to check connectivity
                      const status = await checkApiStatus();
                      setApiStatus({
                        checked: true,
                        isOnline: status.isOnline,
                        message: status.message
                      });
                      
                      if (status.isOnline) {
                        setAuthStatus({
                          isAuthenticated: true,
                          networkError: false,
                          errorMessage: null,
                          errorCode: null
                        });
                        fetchAgents();
                      }
                    } catch (error) {
                      console.error('Retry failed:', error);
                      toast.error('Still unable to connect. Please check your network.');
                    }
                  }}
                >
                  Retry Connection
                </button>
              </div>
            </div>
          )}
          
          {/* API Offline Banner (existing code) */}
          {!apiStatus.isOnline && !authStatus.networkError && (
            <div className="api-status-warning">
              <FaTimes className="status-icon error" />
              <span>Backend API unavailable: {apiStatus.message}</span>
              <button 
                className="retry-button"
                onClick={async () => {
                  const status = await checkApiStatus();
                  setApiStatus({
                    checked: true,
                    isOnline: status.isOnline,
                    message: status.message
                  });
                  if (status.isOnline) {
                    fetchAgents();
                  }
                }}
              >
                Retry
              </button>
            </div>
          )}
          
          <div className="header-actions">
            <button 
              className="btn btn-primary" 
              onClick={handleCreateClick}
              disabled={authStatus.networkError}
            >
              <FaPlus /> Create New Agent
            </button>
            <button className="btn btn-secondary" onClick={runPriceMigration}>
              <FaSort /> Normalize Price Data
            </button>
          </div>
        </header>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <div className="filters-bar">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="category-filter">
            <FaFilter className="filter-icon" />
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="loading-spinner">Loading agents...</div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="agents-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('id')}>
                      ID
                      {sortField === 'id' && (
                        <FaSort className={`sort-icon ${sortDirection}`} />
                      )}
                    </th>
                    <th onClick={() => handleSort('name')}>
                      Name
                      {sortField === 'name' && (
                        <FaSort className={`sort-icon ${sortDirection}`} />
                      )}
                    </th>
                    <th onClick={() => handleSort('category')}>
                      Category
                      {sortField === 'category' && (
                        <FaSort className={`sort-icon ${sortDirection}`} />
                      )}
                    </th>
                    <th>Status</th>
                    <th onClick={() => handleSort('priceDetails.basePrice')}>
                      Price
                      {sortField === 'priceDetails.basePrice' && (
                        <FaSort className={`sort-icon ${sortDirection}`} />
                      )}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAgents.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-table">
                        No agents found
                      </td>
                    </tr>
                  ) : (
                    sortedAgents.map(agent => (
                      <tr key={agent.id} onClick={() => handleEditClick(agent)}>
                        <td>{agent.id}</td>
                        <td className="agent-name-cell">
                          <div className="agent-info">
                            <img 
                              src={isSafeImageUrl(agent.iconUrl) ? agent.iconUrl : generateAgentIconPlaceholder(agent)}
                              alt={agent.name}
                              className="agent-icon"
                              onError={(e) => {
                                // If image fails to load, use the placeholder
                                e.target.src = generateAgentIconPlaceholder(agent);
                                e.target.onerror = null; // Prevent infinite error loops
                              }}
                            />
                            <div>
                              <div className="agent-title">{agent.title || agent.name}</div>
                              <div className="agent-subtitle">{agent.creator?.name || "Unknown Creator"}</div>
                            </div>
                          </div>
                        </td>
                        <td>{agent.category || "Uncategorized"}</td>
                        <td>
                          <div className="status-indicators">
                            {agent.isFeatured && <span className="status featured">Featured</span>}
                            {agent.isBestseller && <span className="status bestseller">Bestseller</span>}
                            {agent.isNew && <span className="status new">New</span>}
                          </div>
                        </td>
                        <td>{formatPrice(agent)}</td>
                        <td className="actions-cell">
                          <button 
                            className="btn btn-icon btn-edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(agent);
                            }}
                          >
                            <FaEdit />
                          </button>
                          <button 
                            className="btn btn-icon btn-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(agent);
                            }}
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <Modal
            title="Confirm Delete"
            onClose={() => {
              if (!isDeleting) {
                setShowDeleteModal(false);
                setAgentToDelete(null);
              }
            }}
            size="small"
          >
            <div className="confirm-delete-modal">
              <p>Are you sure you want to delete the agent <strong>{agentToDelete?.name}</strong>?</p>
              <p>This action cannot be undone.</p>
              
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    if (!isDeleting) {
                      setShowDeleteModal(false);
                      setAgentToDelete(null);
                    }
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={deleteAgent}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Agent'}
                </button>
              </div>
            </div>
          </Modal>
        )}
        
        {/* Agent Form Modal */}
        {showAgentForm && (
          <Modal
            title={selectedAgent ? 'Edit Agent' : 'Create New Agent'}
            onClose={() => setShowAgentForm(false)}
            size="large"
          >
            <AgentForm 
              agent={selectedAgent}
              onSubmit={handleFormSubmit}
              onCancel={() => setShowAgentForm(false)}
            />
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageAgents;