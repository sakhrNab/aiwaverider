import React, { useState, useEffect, useContext, useMemo } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
  FaSort,
  FaRobot,
  FaUsers,
  FaNewspaper,
  FaSync,
} from "react-icons/fa";
import Modal from "../../components/common/Modal";
import AdminLayout from "../../components/layout/AdminLayout";
import AgentForm from "../../components/admin/agents/AgentForm";
import "./AdminManageAgentsPage.css";
import { getAuthHeaders, validateAndRefreshToken } from "../../utils/auth";
import { deleteAgent as deleteAgentHelper } from "../../utils/agent-helper";
import { toast } from "react-hot-toast";
import { checkApiStatus, deletePost, createAgent } from "../../api/marketplace/agentApi";
import {  createUser, updateUser, deleteUser } from "../../api/admin/adminManageUsersApi";
// Import contexts and components for posts management
import { AuthContext } from "../../contexts/AuthContext";
import { PostsContext } from "../../contexts/PostsContext";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import { useNavigate } from "react-router-dom";
import { CATEGORIES } from "../../constants/categories";
import '../../styles/admin/ManageAgentsCards.css';
import { handleGoogleProfileImage } from '../../utils/imageUtils';

/**
 * Admin page for managing agents, posts, and users with CRUD functionality
 */
const ManageAgents = () => {
  // Navigation
  const navigate = useNavigate();

  // Auth context
  const { user, token } = useContext(AuthContext);

  // Posts context
  const {
    posts,
    fetchAllPosts,
    loading: postsLoading,
    error: postsError,
    removePostFromCache,
  } = useContext(PostsContext);

  // Tab selection state
  const [viewMode, setViewMode] = useState("agents");

  // Agent state
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Post state
  const [postToDelete, setPostToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // User state for pagination and sorting
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [userSortBy, setUserSortBy] = useState("username");
  const [userSortDirection, setUserSortDirection] = useState("asc");

  // Shared state
  const [successMessage, setSuccessMessage] = useState("");

  // Agent state for filtering and sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [agentCategoryFilter, setAgentCategoryFilter] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  // State for confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for selected agent and form visibility
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showAgentForm, setShowAgentForm] = useState(false);

  // State for API status
  const [apiStatus, setApiStatus] = useState({
    checked: false,
    isOnline: true,
    message: "",
  });

  // Add state for authentication status
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: true,
    networkError: false,
    errorMessage: null,
    errorCode: null,
  });

  // User state
  const [users, setUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");

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
    return now - cachedData.timestamp < ttl;
  };

  // Function to track modified fields to avoid unnecessary updates
  const [modifiedFields, setModifiedFields] = useState({});

  // Function to sanitize and prepare agent ID for API calls
  const prepareAgentIdForApi = (agentId) => {
    if (!agentId) return null;

    // Remove any 'agent-' prefix for the API call
    let apiId = agentId;
    if (apiId.startsWith("agent-")) {
      apiId = apiId.substring(6); // Remove 'agent-' prefix
    }

    console.log(`Preparing agent ID for API: ${agentId} → ${apiId}`);
    return apiId;
  };

  // Function to get agent with cache management
  const getAgentWithCache = async (
    agentId,
    skipPriceRequest = false,
    forceRefresh = false,
  ) => {
    try {
      if (!agentId) {
        console.error("getAgentWithCache called with null/undefined agentId");
        return null;
      }

      // Sanitize agent ID for consistent cache keys
      const sanitizedAgentId =
        typeof agentId === "string" ? agentId.trim() : String(agentId);

      // Check if this is a mock agent ID (has agent- prefix)
      // If so, we can skip the API call entirely
      const isMockAgent = sanitizedAgentId.toString().startsWith("agent-");

      // Check if we have a valid cached version (use shorter TTL when in edit mode)
      const cachedAgent = agentCache[sanitizedAgentId];
      const isEditMode = !!selectedAgent;

      if (!forceRefresh && isCacheValid(cachedAgent, isEditMode)) {
        console.log(
          `Using cached data for agent ${sanitizedAgentId} (${Math.round((Date.now() - cachedAgent.timestamp) / 1000)}s old)`,
        );
        return cachedAgent.data;
      }

      // If this is a mock agent, we know the backend doesn't have it
      // So we'll create a mock agent without making an API call
      if (isMockAgent) {
        console.log(
          `Creating/refreshing mock data for agent ${sanitizedAgentId}`,
        );
        // Create a mock agent with basic properties
        const mockAgent = {
          id: sanitizedAgentId,
          error: "Endpoint not found",
          message:
            "This API endpoint is not yet available. Try implementing it on the backend.",
          name: `Test Agent ${sanitizedAgentId}`,
          description: "This is a mock agent for testing",
          priceDetails: {
            basePrice: 9.99,
            discountedPrice: 7.99,
            currency: "USD",
          },
          isFree: false,
          isSubscription: false,
        };

        // Store the mock data in cache
        setAgentCache((prev) => ({
          ...prev,
          [sanitizedAgentId]: {
            data: mockAgent,
            timestamp: Date.now(),
          },
        }));

        return mockAgent;
      }

      // Prepare agent ID for API - important to do this correctly to avoid 404s
      const apiAgentId = prepareAgentIdForApi(sanitizedAgentId);
      if (!apiAgentId) {
        console.error("Failed to prepare valid API agent ID");
        return null;
      }

      // No valid cache and not a mock agent, fetch from server
      console.log(
        `Fetching fresh data for agent ${sanitizedAgentId}, API ID: ${apiAgentId}`,
      );
      try {
        // Important: Use the prepared API ID for the request
        const agent = await apiRequest(
          `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/agent/${apiAgentId}`,
          "GET",
          null,
          skipPriceRequest ? {} : { includePrice: "true" },
        );

        // Store in cache with timestamp
        setAgentCache((prev) => ({
          ...prev,
          [sanitizedAgentId]: {
            data: agent,
            timestamp: Date.now(),
          },
        }));

        // If we don't need to make a separate price request
        if (skipPriceRequest || agent.priceDetails) {
          return agent;
        }

        // If we need price data and it wasn't included in the main response
        try {
          // Use the prepared API ID for this request too
          const priceResponse = await apiRequest(
            `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/agent/${apiAgentId}/price`,
            "GET",
          );

          if (priceResponse) {
            // Merge price data with agent data
            const agentWithPrice = {
              ...agent,
              priceDetails: {
                basePrice: priceResponse.basePrice || 0,
                discountedPrice:
                  priceResponse.discountedPrice ||
                  priceResponse.finalPrice ||
                  0,
                currency: priceResponse.currency || "USD",
              },
              isFree: priceResponse.isFree || priceResponse.basePrice === 0,
              isSubscription: priceResponse.isSubscription || false,
            };

            // Update the cache with the combined data
            setAgentCache((prev) => ({
              ...prev,
              [sanitizedAgentId]: {
                data: agentWithPrice,
                timestamp: Date.now(),
              },
            }));

            return agentWithPrice;
          }
        } catch (priceError) {
          console.error(
            `Error fetching price data for agent ${apiAgentId}:`,
            priceError,
          );
          // Continue with just the agent data
        }

        return agent;
      } catch (error) {
        // Check if it's a 404 (agent not found)
        if (error?.status === 404) {
          console.warn(
            `Agent not found with ID ${apiAgentId}, using mock data`,
          );
          // Return a mock agent with basic properties for the form
          const mockAgent = {
            id: sanitizedAgentId,
            error: "Endpoint not found",
            message:
              "This API endpoint is not yet available. Try implementing it on the backend.",
            name: `Test Agent ${sanitizedAgentId}`,
            description: "This is a mock agent for testing",
            priceDetails: {
              basePrice: 9.99,
              discountedPrice: 7.99,
              currency: "USD",
            },
            isFree: false,
            isSubscription: false,
          };

          // Store the mock data in cache
          setAgentCache((prev) => ({
            ...prev,
            [sanitizedAgentId]: {
              data: mockAgent,
              timestamp: Date.now(),
            },
          }));

          return mockAgent;
        }

        throw error;
      }
    } catch (error) {
      console.error("Error in getAgentWithCache:", error);
      throw error;
    }
  };

  // Function to track which fields are modified to avoid unnecessary API calls
  const handleFieldChange = (field, value, originalValue) => {
    // Check if the field value is actually different from the original
    const isModified = value !== originalValue;

    setModifiedFields((prev) => ({
      ...prev,
      [field]: isModified,
    }));
  };

  // Function to invalidate cache for an agent
  const invalidateAgentCache = (agentId) => {
    console.log(`Invalidating cache for agent ${agentId}`);
    setAgentCache((prev) => {
      const newCache = { ...prev };
      delete newCache[agentId];
      return newCache;
    });
  };

  // Add mock auth token for development - REMOVE IN PRODUCTION!
  useEffect(() => {
    // Validate and refresh token if needed
    if (!validateAndRefreshToken() && process.env.NODE_ENV === "development") {
      // Token is invalid or missing, import and use the auth utility
      import("../../utils/auth").then(({ generateMockFirebaseToken }) => {
        const mockToken = generateMockFirebaseToken();
        localStorage.setItem("authToken", mockToken);
        console.log("Mock Firebase-like JWT token set for development");

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
          message: status.message,
        });

        if (!status.isOnline) {
          console.warn("Backend API is not available:", status.message);
          toast.error(`Backend API issue: ${status.message}. Using mock data.`);
        }
      } catch (error) {
        console.error("Error checking API status:", error);
        setApiStatus({
          checked: true,
          isOnline: false,
          message: error.message,
        });
        toast.error("Could not connect to backend. Using mock data.");
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
        credentials: "include",
      };

      // Add body for non-GET requests
      if (data && method !== "GET") {
        options.headers["Content-Type"] = "application/json";
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
      console.log(
        `Response headers:`,
        Object.fromEntries([...response.headers.entries()]),
      );

      // Special handling for 204 No Content responses
      if (response.status === 204) {
        console.log("Received 204 No Content response, treating as success");
        return {
          success: true,
          message: "Operation completed successfully",
          status: 204,
        };
      }

      // Parse the response JSON (or return null if no content)
      const contentType = response.headers.get("content-type");
      const hasJsonContent =
        contentType && contentType.includes("application/json");

      let responseData;
      if (hasJsonContent) {
        responseData = await response.json();
      } else {
        responseData = {
          status: response.status,
          text: await response.text(),
          success: response.ok, // Add success flag based on HTTP status
        };
      }

      // If the response is not ok (status >= 400)
      if (!response.ok) {
        // Log the error response
        console.error(
          ` API Error: ${response.status} - ${JSON.stringify(responseData)}`,
        );

        // Throw a structured error
        const error = new Error(JSON.stringify(responseData));
        error.status = response.status;
        error.statusText = response.statusText;
        error.response = responseData;
        throw error;
      }

      // Normalize price data if it's a price-related endpoint
      if (url.includes("/price") && responseData) {
        // Make sure we have consistent price properties
        const normalizedPrice = normalizePriceData(responseData);
        return normalizedPrice;
      }

      // If it's an agent response, normalize any price data inside it
      if (url.includes("/agent/") && !url.includes("/price") && responseData) {
        return normalizeAgentPriceData(responseData);
      }

      return responseData;
    } catch (error) {
      // Log the full error
      console.error(`API Error in ${method} ${url}:`, error);

      // Check for specific error conditions
      if (error.message === "Failed to fetch") {
        // Network error
        toast.error(
          "Network error. Please check your connection and try again.",
        );
      } else if (error.status === 401) {
        // Authentication error
        toast.error("Authentication error. Please log in again.");
      } else if (error.status === 403) {
        // Permission error
        toast.error(
          "Permission denied. You do not have access to this resource.",
        );
      }

      // Generate a mock response for development purposes
      if (process.env.NODE_ENV === "development" && url.includes("/price")) {
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
    const basePrice =
      typeof priceData.basePrice === "number"
        ? priceData.basePrice
        : parseFloat(priceData.basePrice) || 0;

    // Get discounted price from various possible sources
    let discountedPrice = basePrice;
    if (
      typeof priceData.discountedPrice === "number" ||
      priceData.discountedPrice
    ) {
      discountedPrice =
        typeof priceData.discountedPrice === "number"
          ? priceData.discountedPrice
          : parseFloat(priceData.discountedPrice) || basePrice;
    } else if (
      typeof priceData.finalPrice === "number" ||
      priceData.finalPrice
    ) {
      discountedPrice =
        typeof priceData.finalPrice === "number"
          ? priceData.finalPrice
          : parseFloat(priceData.finalPrice) || basePrice;
    }

    // Calculate discount percentage
    const discountPercentage =
      basePrice > 0
        ? Math.round(((basePrice - discountedPrice) / basePrice) * 100)
        : 0;

    return {
      ...priceData,
      basePrice,
      discountedPrice,
      finalPrice: discountedPrice, // For backwards compatibility
      discountPercentage,
      currency: priceData.currency || "USD",
      isFree: basePrice === 0 || !!priceData.isFree,
      isSubscription: !!priceData.isSubscription,
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
        discountedPrice:
          normalizedAgent.discountedPrice || normalizedAgent.price || 0,
        currency: normalizedAgent.currency || "USD",
        isFree:
          normalizedAgent.isFree ||
          normalizedAgent.basePrice === 0 ||
          normalizedAgent.price === 0,
        isSubscription: normalizedAgent.isSubscription || false,
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
      currency: "USD",
      isFree: false,
      isSubscription: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
        console.log("Using mock data because API is offline");
        const mockData = generateMockAgents();
        setAgents(mockData);
        return;
      }

      // Add a timestamp to prevent caching issues
      const timestamp = Date.now();
      
      // Use our apiRequest helper with fallback to mock data
      const data = await apiRequest(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/agents`,
        "GET",
        null,
        { timestamp } // Add timestamp as query parameter
      ).catch((error) => {
        console.warn("Using mock data due to API error:", error.message);
        // Return mock data structure
        return { agents: generateMockAgents() };
      });

      // Check if data has agents property
      if (data.agents) {
        console.log(
          "✅ Agents fetched successfully:",
          data.agents.length,
          "agents",
        );

        // Clear the entire cache to ensure fresh data
        setAgentCache({});
        
        // Update cache for all agents
        const newCache = {};
        data.agents.forEach((agent) => {
          newCache[agent.id] = {
            data: agent,
            timestamp: Date.now(),
          };
        });
        setAgentCache(newCache);

        // Sort agents by id to maintain consistent order
        const sortedAgents = [...data.agents].sort((a, b) => {
          // Extract numeric part for natural sorting
          const aNum = parseInt(a.id.replace(/\D/g, "")) || 0;
          const bNum = parseInt(b.id.replace(/\D/g, "")) || 0;
          return aNum - bNum;
        });

        setAgents(sortedAgents);
      } else {
        console.warn(
          "⚠️ Response does not contain agents array, using empty array",
        );
        setAgents([]);
      }
    } catch (error) {
      console.error("❌ Error fetching agents:", error);
      setError("Failed to fetch agents. " + error.message);
      setAgents([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Mock data generator for development
  const generateMockAgents = () => {
    return Array(10)
      .fill()
      .map((_, i) => ({
        id: `agent-${i + 1}`,
        name: `Test Agent ${i + 1}`,
        category:
          i % 3 === 0
            ? "AI"
            : i % 3 === 1
              ? "Machine Learning"
              : "Natural Language",
        description: `This is a description for test agent ${i + 1}`,
        price: (i + 1) * 10,
        imageUrl: `https://picsum.photos/200/200?random=${i}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
      toast.error("Cannot delete: Missing agent ID");
      setIsDeleting(false);
      setShowDeleteModal(false);
      return;
    }

    setIsDeleting(true);

    try {
      // Call the helper function to delete the agent
      const result = await deleteAgentHelper(agentToDelete.id);
      console.log("Delete result from helper:", result);

      // Only show success if the operation was actually successful
      if (result.success) {
        // Remove the agent from the local state
        setAgents(agents.filter((agent) => agent.id !== agentToDelete.id));

        // Show success notification
        toast.success("Agent deleted successfully");
        console.log("✅ Agent deleted successfully");
      } else {
        // Show error notification
        toast.error(result.message || "Failed to delete agent");
        console.error("❌ Failed to delete agent:", result.message);

        // Special case for the Firestore error we identified
        if (
          result.message &&
          result.message.includes("not a valid resource path")
        ) {
          toast.error("Database error: The agent ID format is invalid", {
            duration: 6000,
          });
          console.error(
            "Firestore path error detected - agent ID format issue",
          );
        }
      }
    } catch (error) {
      console.error("Error deleting agent:", error);
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
      console.log("Edit clicked for agent:", agent);
      if (!agent || !agent.id) {
        console.error("Cannot edit agent: Missing agent ID");
        showToast("Invalid agent data. Cannot edit.", "error");
        return;
      }

      // Sanitize the agent ID to prevent issues
      const sanitizedAgentId =
        typeof agent.id === "string" ? agent.id.trim() : String(agent.id);

      // Determine if this is a mock agent
      const isMockAgent = sanitizedAgentId.toString().startsWith("agent-");

      // Create a sanitized agent object with the correct ID for the form
      const sanitizedAgent = {
        ...agent,
        id: sanitizedAgentId,
      };
      
      console.log("Sanitized agent being sent to form:", sanitizedAgent);

      // Check if we have a recent cache entry for this agent
      const cachedAgent = agentCache[sanitizedAgentId];
      const isRecentCache =
        cachedAgent && Date.now() - cachedAgent.timestamp < 30000; // 30 seconds

      if (isRecentCache) {
        // If we have recent cache data, use it immediately and open the form
        console.log("Using recently cached data for edit form:", cachedAgent.data);
        setSelectedAgent(cachedAgent.data);
        setShowAgentForm(true);

        // For mock agents, skip the refresh entirely
        if (isMockAgent) {
          console.log(
            "Skipping background refresh for mock agent:",
            sanitizedAgentId,
          );
          return;
        }

        // Only fetch fresh data in the background if cache is older than 10 seconds
        const cacheAge = Date.now() - cachedAgent.timestamp;
        if (cacheAge > 10000) {
          // 10 seconds
          console.log(
            "Cache is older than 10 seconds, refreshing in background",
          );
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
      console.error("Error in handleEditClick:", error);
      showToast(
        "An error occurred while preparing to edit the agent.",
        "error",
      );
    }
  };

  // Function to refresh agent data in the background
  const refreshAgentInBackground = async (agentId) => {
    try {
      if (!agentId) {
        console.error("refreshAgentInBackground: missing agentId parameter");
        return;
      }

      // Check if this is a mock agent (has the agent- prefix)
      // If so, there's no need to make API calls since we know the backend doesn't have it
      const isMockAgent = agentId.toString().startsWith("agent-");

      if (isMockAgent) {
        console.log(
          `Agent ${agentId} is a mock agent, skipping backend refresh`,
        );

        // Get the agent from cache directly
        const cachedAgent = agentCache[agentId];
        if (cachedAgent && cachedAgent.data) {
          console.log("Using cached mock agent data:", cachedAgent.data);
          setSelectedAgent(cachedAgent.data);
          return;
        }
      }

      console.log(`Refreshing agent data in background for ID: ${agentId}`);
      // Get fresh agent data with price included to minimize API calls
      // Pass true for skipPriceRequest parameter to get price in the main call
      const refreshedAgent = await getAgentWithCache(agentId, true, true);

      if (refreshedAgent) {
        console.log("Got refreshed agent data:", refreshedAgent);
        // Update the form with the refreshed data
        setSelectedAgent(refreshedAgent);
      } else {
        console.warn("No data returned when refreshing agent in background");
      }
    } catch (error) {
      console.warn("Error refreshing agent data:", error);
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
      setFormSubmitting(true);
      setFormError(null);
      
      // Get the agent ID from the selected agent
      const agentId = selectedAgent?.id;
      
      console.log('Submitting agent form with data:', agentData);

      // Separate price data from agent data
      const {
        basePrice,
        discountedPrice,
        currency, 
        isFree,
        isSubscription,
        discountPercentage, 
        ...agentDataWithoutPrice
      } = agentData;

      // Create price payload
      const pricePayload = {
        basePrice: parseFloat(basePrice) || 0,
        discountedPrice: parseFloat(discountedPrice) || parseFloat(basePrice) || 0,
        currency: currency || 'USD',
        isFree: isFree === true || basePrice === 0 || basePrice === '0',
        isSubscription: isSubscription === true,
        discountPercentage: discountPercentage || 0
      };
      
      console.log('Price payload:', pricePayload);
      
      let savedAgent;
      
      // Import the combined update function
      let updateAgentWithPrice;
      try {
        // Using dynamic import to ensure the function is loaded
        const api = await import('../../api/marketplace/agentApi');
        updateAgentWithPrice = api.updateAgentWithPrice;
      } catch (importError) {
        console.error('Error importing updateAgentWithPrice:', importError);
        // Will fall back to separate calls
      }

      if (agentId) {
        // Handle update case
        if (updateAgentWithPrice) {
          // Use the combined update if available (more efficient)
          console.log('Using combined update for agent and price');
          savedAgent = await updateAgentWithPrice(agentId, agentDataWithoutPrice, pricePayload);
        } else {
          // Fall back to just updating the agent data
          console.log('Falling back to separate agent update');
        savedAgent = await apiRequest(`/api/agents/${agentId}`, 'PUT', agentDataWithoutPrice);
        }
      } else {
        // Handle create case
        savedAgent = await createAgent({
          ...agentDataWithoutPrice,
          priceDetails: pricePayload
        });
      }

      // Update the UI
      if (savedAgent) {
        // Invalidate local cache for this agent
        invalidateAgentCache(savedAgent.id);
        
        // Also clear server-side cache by calling the refresh-cache endpoint
        try {
          const cacheResponse = await apiRequest('/api/agents/refresh-cache', 'GET');
          console.log('Cache refresh response:', cacheResponse);
        } catch (cacheError) {
          console.warn('Failed to refresh server cache:', cacheError);
          // Continue anyway since local cache is cleared
        }
        
        // Show success message
        toast.success(agentId ? 'Agent updated successfully' : 'Agent created successfully');
        
        // Force refresh the agents list to show the new agent
        setLoading(true);
        await fetchAgents();
        setLoading(false);
        
        // Close the form
        setShowAgentForm(false);
        setSelectedAgent(null);
      }

      return savedAgent;
    } catch (error) {
      console.error('Error submitting agent form:', error);
      toast.error(`Failed to ${selectedAgent ? 'update' : 'create'} agent: ${error.message}`);
      // Keep form open on error
      return null;
    } finally {
      setFormSubmitting(false);
    }
  };

  // Function to handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort agents
  const filteredAgents = agents.filter((agent) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      agent.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.title?.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory =
      agentCategoryFilter === "" || agent.category === agentCategoryFilter;

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
      if (sortField === "priceDetails.basePrice" || sortField === "basePrice") {
        const aPrice = a.priceDetails?.basePrice || a.basePrice || 0;
        const bPrice = b.priceDetails?.basePrice || b.basePrice || 0;
        comparison =
          sortDirection === "asc" ? aPrice - bPrice : bPrice - aPrice;
      }
      // Handle date sorting
      else if (sortField === "createdAt" || sortField === "updatedAt") {
        const aDate = new Date(a[sortField] || 0).getTime();
        const bDate = new Date(b[sortField] || 0).getTime();
        comparison = sortDirection === "asc" ? aDate - bDate : bDate - aDate;
      }
      // Handle string sorting
      else {
        const aValue = a[sortField]?.toString() || "";
        const bValue = b[sortField]?.toString() || "";
        comparison =
          sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
      }

      // If the primary sort field values are equal, fall back to sorting by ID
      // This ensures a consistent ordering regardless of how many times you edit
      if (comparison === 0) {
        const aNum = parseInt((a.id || '').replace(/\D/g, "")) || 0;
        const bNum = parseInt((b.id || '').replace(/\D/g, "")) || 0;
        return aNum - bNum;
      }

      return comparison;
    });
  }, [filteredAgents, sortField, sortDirection]);

  // Get unique categories for filter dropdown
  const categories = [...new Set(agents.map((agent) => agent.category))];

  // Format price for display
  const formatPrice = (agent) => {
    if (agent.isFree) return "Free";

    if (agent.priceDetails) {
      const price =
        agent.priceDetails.discountedPrice || agent.priceDetails.basePrice;
      return `$${price.toFixed(2)}`;
    }

    return "N/A";
  };

  // Add a function to run the price data migration
  const runPriceMigration = async () => {
    try {
      // Show confirmation toast
      toast.loading("Starting price data migration. This may take a while...", {
        id: "migration",
      });

      // Call the migration API endpoint
      const result = await apiRequest(
        `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/agent-prices/migrate`,
        "POST",
      );

      // Show success toast with results
      toast.success(
        <div>
          <strong>Price Migration Completed</strong>
          <p>Total agents: {result.totalAgents}</p>
          <p>Updated: {result.updated}</p>
          <p>Errors: {result.errors?.length || 0}</p>
        </div>,
        { duration: 5000, id: "migration" },
      );

      // If there were errors, show them in the console
      if (result.errors?.length > 0) {
        console.warn("Migration completed with errors:", result.errors);
      }

      // Refresh agent data after migration
      fetchAgents();
    } catch (error) {
      console.error("Error running price migration:", error);
      toast.error(
        <div>
          <strong>Migration Failed</strong>
          <p>{error.message || "An unknown error occurred"}</p>
        </div>,
        { duration: 5000, id: "migration" },
      );
    }
  };

  // Helper function to generate placeholder image for agent icons
  const generateAgentIconPlaceholder = (agent) => {
    // First try to extract initials from the agent name
    const name = agent?.name || "AI";
    const initials = name.charAt(0).toUpperCase();
    
    // For image URLs, return a data URI with the initials
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Crect width='60' height='60' fill='%234a69bd'/%3E%3Ctext x='30' y='35' font-family='Arial' font-size='24' font-weight='bold' text-anchor='middle' fill='white'%3E${initials}%3C/text%3E%3C/svg%3E`;
  };

  // Function to check if an image URL is valid (not example.com)
  const isSafeImageUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    if (url.includes("example.com")) return false;

    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  };
  
  // Get the agent image URL from multiple possible locations
  const getAgentImageUrl = (agent) => {
    // Check for different possible image URL locations
    if (agent.imageUrl && isSafeImageUrl(agent.imageUrl)) {
      console.log("Using agent.imageUrl:", agent.imageUrl);
      return agent.imageUrl;
    }
    
    // Check if image info exists in a nested structure
    if (agent.image && agent.image.url && isSafeImageUrl(agent.image.url)) {
      console.log("Using agent.image.url:", agent.image.url);
      return agent.image.url;
    }
    
    // Try to parse the data field if it's a string
    if (agent.data && typeof agent.data === 'string') {
      try {
        const parsedData = JSON.parse(agent.data);
        if (parsedData.imageUrl && isSafeImageUrl(parsedData.imageUrl)) {
          console.log("Using parsed data.imageUrl:", parsedData.imageUrl);
          return parsedData.imageUrl;
        }
      } catch (e) {
        console.error("Error parsing agent.data for image:", e);
      }
    }
    
    console.log("No valid image URL found, using placeholder for:", agent.id);
    return null;
  };
  
  // Get the agent icon URL from multiple possible locations
  const getAgentIconUrl = (agent) => {
    // Check for different possible icon URL locations
    if (agent.iconUrl && isSafeImageUrl(agent.iconUrl)) {
      console.log("Using agent.iconUrl:", agent.iconUrl);
      return agent.iconUrl;
    }
    
    // Check if icon info exists in a nested structure
    if (agent.icon && agent.icon.url && isSafeImageUrl(agent.icon.url)) {
      console.log("Using agent.icon.url:", agent.icon.url);
      return agent.icon.url;
    }
    
    // Try to parse the data field if it's a string
    if (agent.data && typeof agent.data === 'string') {
      try {
        const parsedData = JSON.parse(agent.data);
        if (parsedData.iconUrl && isSafeImageUrl(parsedData.iconUrl)) {
          console.log("Using parsed data.iconUrl:", parsedData.iconUrl);
          return parsedData.iconUrl;
        }
      } catch (e) {
        console.error("Error parsing agent.data for icon:", e);
      }
    }
    
    // If no icon URL is found, try to use the image URL
    const imageUrl = getAgentImageUrl(agent);
    if (imageUrl) {
      console.log("Using image as icon fallback");
      return imageUrl;
    }
    
    console.log("No valid icon URL found, using placeholder for:", agent.id);
    return null;
  };

  // Fetch data based on current view mode
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        if (viewMode === "posts") {
          await fetchAllPosts("All", 10);
        } else if (viewMode === "agents" && agents.length === 0 && !loading) {
          fetchAgents();
        } else if (viewMode === "users") {
          // Fetch users when users tab is selected
          await fetchUsers();
        }
      } catch (err) {
        if (mounted) {
          setError(err.message);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [viewMode, fetchAllPosts, agents.length, loading, usersPage, userSortBy, userSortDirection]);

  // Create a function to deduplicate posts
  const getUniquePosts = (posts) => {
    if (!posts) return [];
    const seen = new Set();
    return posts.filter((post) => {
      const duplicate = seen.has(post.id);
      seen.add(post.id);
      return !duplicate;
    });
  };

  // Filter posts and ensure uniqueness
  const getFilteredPosts = () => {
    if (!posts) return [];
    const filtered = posts.filter((post) => {
      if (categoryFilter !== "All" && post.category !== categoryFilter) {
        return false;
      }
      const lowerSearch = searchTerm.toLowerCase();
      const inTitle = post.title?.toLowerCase().includes(lowerSearch);
      const inId = post.id?.toLowerCase().includes(lowerSearch);
      return inTitle || inId;
    });

    return getUniquePosts(filtered);
  };

  // Get unique posts once
  const uniqueFilteredPosts = getFilteredPosts();

  // -------------- Post Management --------------

  // Create New Post
  const handleCreateNewPost = () => {
    navigate("/posts/create");
  };

  // Delete Post
  const confirmDeletePost = (post) => {
    setPostToDelete(post);
    setShowDeleteModal(true);
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    try {
      const data = await deletePost(postToDelete.id, token);
      if (data.success) {
        removePostFromCache(postToDelete.id);
        setShowDeleteModal(false);
        setPostToDelete(null);
        setSuccessMessage("Post deleted successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        alert(data.error || "Failed to delete post.");
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("An unexpected error occurred while deleting the post.");
    }
  };

  // -------------- Format Date --------------
  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    const d = new Date(isoString);
    return d.toLocaleString();
  };

  // Users Management
  {viewMode === "users" && (
    <div className="users-management-section">
      <h2 className="section-title">Users Management</h2>
      <div className="users-controls">
        <div className="users-search">
          <input
            type="text"
            placeholder="Search users..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
          />
          <button className="search-button" onClick={fetchUsers}>
            <FaSearch />
          </button>
        </div>
        <div className="sort-controls">
          <select 
            value={userSortBy}
            onChange={(e) => setUserSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="username">Username</option>
            <option value="email">Email</option>
            <option value="role">Role</option>
            <option value="status">Status</option>
            <option value="createdAt">Join Date</option>
          </select>
          <button 
            className={`sort-direction ${userSortDirection === 'desc' ? 'desc' : 'asc'}`}
            onClick={() => setUserSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
          >
            <FaSort />
          </button>
        </div>
        <button className="create-user-btn primary-btn" onClick={handleCreateUserClick}>
          <FaPlus /> Create User
        </button>
      </div>
      
      <div className="users-table-container">
        {userLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : userError ? (
          <div className="error-display">
            <p className="error-message">Error loading users: {userError}</p>
            <button onClick={fetchUsers} className="retry-btn">Retry</button>
          </div>
        ) : (
          <>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map(user => (
                    <tr key={user.id} className={`user-row ${user.status === 'inactive' ? 'inactive' : ''}`}>
                      <td className="user-name-cell">
                        {user.photoURL ? (
                          <img src={handleGoogleProfileImage(user.photoURL)} alt={user.firstName} className="user-avatar" />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.firstName?.charAt(0) || user.username?.charAt(0) || '?'}
                          </div>
                        )}
                        <span>{user.displayName || user.firstName || user.username}</span>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-indicator ${user.status || 'active'}`}>
                          {user.status || 'active'}
                        </span>
                      </td>
                      <td>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="action-btn edit-btn"
                          onClick={() => handleEditUser(user)}
                          title="Edit user"
                        >
                          Edit
                        </button>
                        {user.role !== 'admin' && (
                          <button 
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteUserClick(user)}
                            title="Delete user"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="no-data">
                      No users found. Try adjusting your search or create a new user.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {usersTotalPages > 1 && (
              <div className="pagination">
                <button 
                  className="pagination-btn" 
                  onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                  disabled={usersPage === 1}
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {usersPage} of {usersTotalPages}
                </span>
                <button 
                  className="pagination-btn" 
                  onClick={() => setUsersPage(prev => Math.min(usersTotalPages, prev + 1))}
                  disabled={usersPage === usersTotalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* User Form Modal */}
      {showUserForm && (
        <div className="modal-overlay">
          <div className="modal-content user-form-modal">
            <h2>{selectedUser ? 'Edit User' : 'Create New User'}</h2>
            <form onSubmit={handleUserFormSubmit}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input 
                  type="text"
                  id="username"
                  name="username"
                  value={userForm.username || ''}
                  onChange={handleUserFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input 
                  type="email"
                  id="email"
                  name="email"
                  value={userForm.email || ''}
                  onChange={handleUserFormChange}
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input 
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={userForm.firstName || ''}
                    onChange={handleUserFormChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input 
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={userForm.lastName || ''}
                    onChange={handleUserFormChange}
                  />
                </div>
              </div>
              {!selectedUser && (
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input 
                    type="password"
                    id="password"
                    name="password"
                    value={userForm.password || ''}
                    onChange={handleUserFormChange}
                    required={!selectedUser}
                  />
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    name="role"
                    value={userForm.role || 'user'}
                    onChange={handleUserFormChange}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="moderator">Moderator</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={userForm.status || 'active'}
                    onChange={handleUserFormChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="form-buttons">
                <button type="button" className="cancel-btn" onClick={() => setShowUserForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={userFormSubmitting}>
                  {userFormSubmitting ? 'Saving...' : (selectedUser ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteUserConfirm && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm-modal">
            <h2>Delete User</h2>
            <p>Are you sure you want to delete the user "{selectedUser?.username || selectedUser?.email}"?</p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="form-buttons">
              <button type="button" className="cancel-btn" onClick={() => setShowDeleteUserConfirm(false)}>
                Cancel
              </button>
              <button 
                type="button" 
                className="delete-btn" 
                onClick={handleDeleteUser}
                disabled={deleteUserLoading}
              >
                {deleteUserLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

  // Fetch users with pagination and sorting
  const fetchUsers = async () => {
    if (!token) return;
    
    setUserLoading(true);
    setUserError(null);
    
    try {
      const result = await fetchUsers(
        usersPage,
        10,
        userSearchQuery,
        userSortBy,
        userSortDirection
      );
      
      setUsers(result.users || []);
      setUsersTotalPages(result.totalPages || 1);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUserError(error.message);
    } finally {
      setUserLoading(false);
    }
  };
  
  // User management state
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'user',
    status: 'active'
  });
  const [userToDelete, setUserToDelete] = useState(null);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  
  // Handle editing a user
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserForm({
      username: user.username || '',
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || 'user',
      status: user.status || 'active'
    });
    setShowUserForm(true);
  };
  
  // Handle user form changes
  const handleUserFormChange = (e) => {
    const { name, value } = e.target;
    setUserForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle user form submission
  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (selectedUser) {
        // Update existing user
        await updateUser(selectedUser.id, userForm);
        toast.success('User updated successfully');
      } else {
        // Create new user
        await createUser(userForm);
        toast.success('User created successfully');
      }
      
      // Reset form and fetch updated user list
      setShowUserForm(false);
      setSelectedUser(null);
      setUserForm({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        role: 'user',
        status: 'active'
      });
      fetchUsers();
    } catch (error) {
      console.error('Error submitting user form:', error);
      toast.error(error.message);
    }
  };
  
  // Handle clicking delete user button
  const handleDeleteUserClick = (user) => {
    setUserToDelete(user);
    setShowDeleteUserModal(true);
  };
  
  // Handle confirming user deletion
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await deleteUser(userToDelete.id);
      
      toast.success('User deleted successfully');
      setShowDeleteUserModal(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message);
    }
  };
  
  // Handle creating a new user
  const handleCreateUserClick = () => {
    setSelectedUser(null);
    setUserForm({
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      role: 'user',
      status: 'active'
    });
    setShowUserForm(true);
  };

  // Add a function to clear the server cache
  const clearServerCache = async () => {
    try {
      toast.info('Refreshing server cache...');
      const response = await apiRequest('/api/agents/refresh-cache', 'GET');
      console.log('Cache refresh response:', response);
      toast.success(`Server cache cleared: ${response.message || 'Success'}`);
      
      // Also refresh the agents list
      setLoading(true);
      await fetchAgents();
      setLoading(false);
    } catch (error) {
      console.error('Failed to clear server cache:', error);
      toast.error(`Failed to clear cache: ${error.message}`);
    }
  };

  // JSX for the refresh button
  const RefreshButton = () => (
    <button 
      className="btn btn-info" 
      onClick={clearServerCache}
      disabled={loading}
      title="Refresh server cache and reload agents"
    >
      <FaSync className={loading ? 'icon-spin' : ''} /> Refresh Cache
    </button>
  );

  return (
    <AdminLayout>
      <div className="manage-agents-page">
        <div className="page-header">
          <h1>Admin Dashboard</h1>

          {successMessage && (
            <p className="success-message text-green-600 text-center font-semibold mb-4">
              {successMessage}
            </p>
          )}
          {error && (
            <p className="error-message text-red-500 text-center">{error}</p>
          )}

          {/* Tabs for content type selection */}
          <div className="tabs-container flex justify-center gap-4 mb-6">
            <button
              onClick={() => setViewMode("agents")}
              className={`tab-button px-4 py-2 rounded-md flex items-center ${
                viewMode === "agents"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-700"
              }`}
            >
              <FaRobot className="mr-2" />
              Agents
            </button>
            <button
              onClick={() => setViewMode("posts")}
              className={`tab-button px-4 py-2 rounded-md flex items-center ${
                viewMode === "posts"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-700"
              }`}
            >
              <FaNewspaper className="mr-2" />
              Posts
            </button>
            <button
              onClick={() => setViewMode("users")}
              className={`tab-button px-4 py-2 rounded-md flex items-center ${
                viewMode === "users"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-700"
              }`}
            >
              <FaUsers className="mr-2" />
              Users
            </button>
          </div>
        </div>

        {/* Posts Management */}
        {viewMode === "posts" && (
          <div className="posts-management">
            {/* Row with "Create Post" plus local search + category filter */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
              {/* Create button */}
              <button
                onClick={handleCreateNewPost}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Create New Post
              </button>

              {/* Search Input */}
              <input
                type="text"
                placeholder="Search by title or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-md"
              />

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-2 border border-gray-300 rounded-md"
              >
                <option value="All">All</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Loading state */}
            {postsLoading && (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading posts...</p>
              </div>
            )}

            {/* Error state */}
            {postsError && (
              <div className="text-center py-4">
                <p className="text-red-500">{postsError}</p>
              </div>
            )}

            {/* Posts List in 3-column grid */}
            {!postsLoading &&
            !postsError &&
            uniqueFilteredPosts.length === 0 ? (
              <p className="text-gray-600 text-center">
                No posts match your filter/search.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {uniqueFilteredPosts.map((post, index) => (
                  <div
                    key={`${post.id}-${index}`}
                    className="p-4 border border-gray-200 rounded-md shadow-sm hover:shadow-md flex flex-col"
                  >
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-blue-700 mb-1 line-clamp-1">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                        {post.description}
                      </p>
                      {post.imageUrl && (
                        <img
                          src={post.imageUrl}
                          alt={post.title}
                          className="mt-2 h-32 w-full object-cover rounded-md"
                        />
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Category: {post.category || "Uncategorized"}
                      </p>
                      <p className="text-xs text-gray-400">
                        Created By: {post.createdByUsername || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-400">
                        Created At: {formatDate(post.createdAt)}
                      </p>
                    </div>

                    {/* Buttons row */}
                    <div className="mt-4 flex justify-between">
                      {/* Edit navigates to PostDetail */}
                      <button
                        onClick={() => navigate(`/posts/${post.id}`)}
                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => confirmDeletePost(post)}
                        className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Management */}
        {viewMode === "users" && (
          <div className="users-management-section">
            <h2 className="section-title">Users Management</h2>
            <div className="users-controls">
              <div className="users-search">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                />
                <button className="search-button" onClick={fetchUsers}>
                  <FaSearch />
                </button>
              </div>
              <div className="sort-controls">
                <select 
                  value={userSortBy}
                  onChange={(e) => setUserSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="username">Username</option>
                  <option value="email">Email</option>
                  <option value="role">Role</option>
                  <option value="status">Status</option>
                  <option value="createdAt">Join Date</option>
                </select>
                <button 
                  className={`sort-direction ${userSortDirection === 'desc' ? 'desc' : 'asc'}`}
                  onClick={() => setUserSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  <FaSort />
                </button>
              </div>
              <button className="create-user-btn primary-btn" onClick={handleCreateUserClick}>
                <FaPlus /> Create User
              </button>
            </div>
            
            <div className="users-table-container">
              {userLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading users...</p>
                </div>
              ) : userError ? (
                <div className="error-display">
                  <p className="error-message">Error loading users: {userError}</p>
                  <button onClick={fetchUsers} className="retry-btn">Retry</button>
                </div>
              ) : (
                <>
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? (
                        users.map(user => (
                          <tr key={user.id} className={`user-row ${user.status === 'inactive' ? 'inactive' : ''}`}>
                            <td className="user-name-cell">
                              {user.photoURL ? (
                                <img src={handleGoogleProfileImage(user.photoURL)} alt={user.firstName} className="user-avatar" />
                              ) : (
                                <div className="avatar-placeholder">
                                  {user.firstName?.charAt(0) || user.username?.charAt(0) || '?'}
                                </div>
                              )}
                              <span>{user.displayName || user.firstName || user.username}</span>
                            </td>
                            <td>{user.email}</td>
                            <td>
                              <span className={`role-badge ${user.role}`}>
                                {user.role || 'user'}
                              </span>
                            </td>
                            <td>
                              <span className={`status-indicator ${user.status || 'active'}`}>
                                {user.status || 'active'}
                              </span>
                            </td>
                            <td>
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                            </td>
                            <td className="actions-cell">
                              <button 
                                className="action-btn edit-btn"
                                onClick={() => handleEditUser(user)}
                                title="Edit user"
                              >
                                Edit
                              </button>
                              {user.role !== 'admin' && (
                                <button 
                                  className="action-btn delete-btn"
                                  onClick={() => handleDeleteUserClick(user)}
                                  title="Delete user"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="no-data">
                            No users found. Try adjusting your search or create a new user.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  
                  {usersTotalPages > 1 && (
                    <div className="pagination">
                      <button 
                        className="pagination-btn" 
                        onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                        disabled={usersPage === 1}
                      >
                        Previous
                      </button>
                      <span className="page-info">
                        Page {usersPage} of {usersTotalPages}
                      </span>
                      <button 
                        className="pagination-btn" 
                        onClick={() => setUsersPage(prev => Math.min(usersTotalPages, prev + 1))}
                        disabled={usersPage === usersTotalPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* User Form Modal */}
            {showUserForm && (
              <div className="modal-overlay">
                <div className="modal-content user-form-modal">
                  <h2>{selectedUser ? 'Edit User' : 'Create New User'}</h2>
                  <form onSubmit={handleUserFormSubmit}>
                    <div className="form-group">
                      <label htmlFor="username">Username</label>
                      <input 
                        type="text"
                        id="username"
                        name="username"
                        value={userForm.username || ''}
                        onChange={handleUserFormChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input 
                        type="email"
                        id="email"
                        name="email"
                        value={userForm.email || ''}
                        onChange={handleUserFormChange}
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="firstName">First Name</label>
                        <input 
                          type="text"
                          id="firstName"
                          name="firstName"
                          value={userForm.firstName || ''}
                          onChange={handleUserFormChange}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="lastName">Last Name</label>
                        <input 
                          type="text"
                          id="lastName"
                          name="lastName"
                          value={userForm.lastName || ''}
                          onChange={handleUserFormChange}
                        />
                      </div>
                    </div>
                    {!selectedUser && (
                      <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input 
                          type="password"
                          id="password"
                          name="password"
                          value={userForm.password || ''}
                          onChange={handleUserFormChange}
                          required={!selectedUser}
                        />
                      </div>
                    )}
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="role">Role</label>
                        <select
                          id="role"
                          name="role"
                          value={userForm.role || 'user'}
                          onChange={handleUserFormChange}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="moderator">Moderator</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="status">Status</label>
                        <select
                          id="status"
                          name="status"
                          value={userForm.status || 'active'}
                          onChange={handleUserFormChange}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-buttons">
                      <button type="button" className="cancel-btn" onClick={() => setShowUserForm(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="submit-btn" disabled={userFormSubmitting}>
                        {userFormSubmitting ? 'Saving...' : (selectedUser ? 'Update User' : 'Create User')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Delete User Confirmation Modal */}
            {showDeleteUserConfirm && (
              <div className="modal-overlay">
                <div className="modal-content delete-confirm-modal">
                  <h2>Delete User</h2>
                  <p>Are you sure you want to delete the user "{selectedUser?.username || selectedUser?.email}"?</p>
                  <p className="warning-text">This action cannot be undone.</p>
                  <div className="form-buttons">
                    <button type="button" className="cancel-btn" onClick={() => setShowDeleteUserConfirm(false)}>
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="delete-btn" 
                      onClick={handleDeleteUser}
                      disabled={deleteUserLoading}
                    >
                      {deleteUserLoading ? 'Deleting...' : 'Delete User'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Agents Management - Keep existing code from ManageAgents but only show when viewMode === 'agents' */}
        {viewMode === "agents" && (
          <div>
            {/* Existing agent management UI from ManageAgents */}
            <div className="controls">
              <button
                className="btn btn-primary create-button"
                onClick={() => {
                  setSelectedAgent(null);
                  setShowAgentForm(true);
                }}
                style={{ marginTop: "20px" }}
              >
                <FaPlus /> Create New Agent
              </button>

              <button
                className="btn btn-secondary refresh-button"
                onClick={clearServerCache}
                disabled={loading}
                style={{ marginTop: "20px", marginLeft: "10px" }}
              >
                <FaSync className={loading ? "icon-spin" : ""} /> Refresh Cache
              </button>

              <div className="filters">
                <div className="search-filter">
                  <label htmlFor="search">Search:</label>
                  <div className="search-input-container">
                    <FaSearch className="search-icon" />
                    <input
                      id="search"
                      type="text"
                      className="search-input"
                      placeholder="Search agents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="category-filter">
                  <label htmlFor="category">Category:</label>
                  <div className="select-container">
                    <FaFilter className="filter-icon" />
                    <select
                      id="category"
                      value={agentCategoryFilter}
                      onChange={(e) => setAgentCategoryFilter(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      <option value="Productivity">Productivity</option>
                      <option value="Creative">Creative</option>
                      <option value="Educational">Educational</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Business">Business</option>
                    </select>
                  </div>
                </div>

                <div className="sort-filter">
                  <label htmlFor="sort">Sort By:</label>
                  <div className="select-container" style={{ paddingBottom: "22px" }}>
                    <FaSort className="sort-icon" />
                    <select
                      id="sort"
                      value={`${sortField}-${sortDirection}`}
                      onChange={(e) => {
                        const [field, direction] = e.target.value.split("-");
                        setSortField(field);
                        setSortDirection(direction);
                      }}
                    >
                      <option value="name-asc">Name (A-Z)</option>
                      <option value="name-desc">Name (Z-A)</option>
                      <option value="createdAt-desc">Newest First</option>
                      <option value="createdAt-asc">Oldest First</option>
                      <option value="popularity-desc">Most Popular</option>
                      <option value="rating-desc">Highest Rated</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Display loading state */}
            {loading && (
              <div className="loading-container">
                <p>Loading agents...</p>
              </div>
            )}

            {/* Display error state */}
            {error && !loading && (
              <div className="error-container">
                <p className="error-message">{error}</p>
              </div>
            )}

            {/* Display agents list */}
            {!loading && !error && (
              <div className="manage-agents-list">
                {sortedAgents.length === 0 ? (
                  <p className="manage-no-agents-message">No agents found.</p>
                ) : (
                  <div className="manage-agents-grid">
                    {sortedAgents.map((agent) => (
                      <div key={agent.id} className="manage-agent-card">
                        <div className="manage-agent-header">
                          <div className="manage-agent-image">
                            {/* Use our new image URL function */}
                            {(() => {
                              const imageUrl = getAgentImageUrl(agent);
                              if (imageUrl) {
                                return (
                                  <img 
                                    src={imageUrl} 
                                    alt={agent.name}
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = generateAgentIconPlaceholder(agent);
                                    }}
                                  />
                                );
                              } else {
                                return (
                                  <div className="manage-agent-icon-placeholder">
                                    {agent.name ? agent.name.charAt(0).toUpperCase() : 'A'}
                                  </div>
                                );
                              }
                            })()}
                          </div>
                          
                          {/* Add icon next to the name if available */}
                          <div className="manage-agent-title-section">
                            <h3 className="manage-agent-name">{agent.name || "Assistant Pro"}</h3>
                            {(() => {
                              const iconUrl = getAgentIconUrl(agent);
                              if (iconUrl && iconUrl !== getAgentImageUrl(agent)) {
                                return (
                                  <img 
                                    src={iconUrl} 
                                    alt="Icon"
                                    className="manage-agent-small-icon"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                        
                        <div className="manage-agent-details">
                          <p className="manage-agent-description">{agent.description || "An innovative AI tool for enthusiasts, combining cutting-edge technology with intuitive design."}</p>
                          
                          <div className="manage-agent-info-grid">
                            <div className="manage-agent-info-item">
                              <span className="manage-info-label">Category:</span>
                              <span className="manage-info-value">{agent.category || 'All'}</span>
                            </div>
                            
                            <div className="manage-agent-info-item">
                              <span className="manage-info-label">Price:</span>
                              <span className="manage-info-value price">{formatPrice(agent)}</span>
                            </div>
                            
                            {agent.features && Array.isArray(agent.features) && agent.features.length > 0 && (
                              <div className="manage-agent-info-item features">
                                <span className="manage-info-label">Features:</span>
                                <ul className="manage-features-list">
                                  {Array.isArray(agent.features) && agent.features.slice(0, 3).map((feature, index) => (
                                    <li key={`${agent.id}-feature-${index}`}>{feature}</li>
                                  ))}
                                  {Array.isArray(agent.features) && agent.features.length > 3 && (
                                    <li key={`${agent.id}-more-features`}>+{agent.features.length - 3} more...</li>
                                  )}
                                </ul>
                              </div>
                            )}
                            
                            <div className="manage-agent-info-item">
                              <span className="manage-info-label">Created:</span>
                              <span className="manage-info-value">{formatDate(agent.createdAt)}</span>
                            </div>
                            
                            {agent.updatedAt && (
                              <div className="manage-agent-info-item">
                                <span className="manage-info-label">Updated:</span>
                                <span className="manage-info-value">{formatDate(agent.updatedAt)}</span>
                              </div>
                            )}
                            
                            <div className="manage-agent-info-item">
                              <span className="manage-info-label">ID:</span>
                              <span className="manage-info-value id">{agent.id}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="manage-agent-actions">
                          <button 
                            className="btn btn-edit" 
                            onClick={() => handleEditClick(agent)}
                          >
                            <FaEdit /> Edit
                          </button>
                          <button 
                            className="btn btn-delete" 
                            onClick={() => handleDeleteClick(agent)}
                          >
                            <FaTrash /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal for post or agent deletion */}
        {showDeleteModal && (
          <ConfirmationModal
            title="Confirm Deletion"
            message={
              postToDelete
                ? `Are you sure you want to delete the post titled "${postToDelete.title}"? This action cannot be undone.`
                : `Are you sure you want to delete the agent "${agentToDelete?.name}"? This action cannot be undone.`
            }
            onConfirm={postToDelete ? handleDeletePost : deleteAgent}
            onCancel={() => {
              setShowDeleteModal(false);
              setPostToDelete(null);
              setAgentToDelete(null);
            }}
          />
        )}

        {/* Agent Form Modal */}
        {showAgentForm && (
          <Modal
            title={selectedAgent ? "Edit Agent" : "Create New Agent"}
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

        {/* User Deletion Confirmation Modal */}
        {showDeleteUserModal && (
          <ConfirmationModal
            title="Delete User"
            message={`Are you sure you want to delete the user "${userToDelete?.username || 'Unknown'}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={handleDeleteUser}
            onCancel={() => {
              setShowDeleteUserModal(false);
              setUserToDelete(null);
            }}
          />
        )}

        {/* Refresh Cache Button */}
        <RefreshButton />
      </div>
    </AdminLayout>
  );
};

export default ManageAgents;
