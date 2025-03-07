import React, { useState, useEffect } from 'react';
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
  
  // Helper function for API requests with consistent error handling
  const apiRequest = async (url, method, data = null) => {
    console.log(`🔄 ${method} request to ${url}`);
    
    // Use our imported getAuthHeaders utility
    const options = {
      method,
      headers: getAuthHeaders(),
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    try {
      // Log full request details
      console.log(`API Request: ${method} ${url}`, options);
      
      // Ensure token is valid before making request
      validateAndRefreshToken();
      
      const response = await fetch(url, options);
      
      // Log response status and headers
      console.log(`API Response: ${response.status} ${response.statusText}`);
      console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error: ${response.status} - ${errorText}`);
        throw new Error(errorText || `${method} request failed with status ${response.status}`);
      }
      
      // Try to parse JSON, but handle text responses too
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        console.log('Response is not JSON:', text);
        return { message: text };
      }
    } catch (error) {
      console.error(`API Error in ${method} ${url}:`, error);
      
      // For development environment, create mock successful responses
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Generating mock response for ${method} ${url}`);
        
        // Generate appropriate mock responses based on the request
        if (url.includes('/api/agents') && method === 'GET') {
          return { agents: generateMockAgents() };
        } else if (url.includes('/price') && method === 'GET') {
          const agentId = url.split('/')[4]; // Extract agent ID from URL
          return {
            id: `price-${agentId}`,
            basePrice: 99.99,
            discount: 0,
            finalPrice: 99.99,
            currency: 'USD',
            agentId
          };
        } else if (method === 'DELETE') {
          return { success: true, message: 'Agent deleted successfully (mock)' };
        } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
          return { 
            ...data, 
            id: data.id || `mock-agent-${Date.now()}`,
            updatedAt: new Date().toISOString(),
            message: 'Operation completed successfully (mock)'
          };
        }
        
        // Generic mock response
        return { success: true, mockData: true };
      }
      
      throw error;
    }
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
        setAgents(data.agents);
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
  
  // Function to edit an agent
  const handleEditClick = (agent) => {
    setSelectedAgent(agent);
    setShowAgentForm(true);
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
      
      if (selectedAgent) {
        // Update existing agent - Work around CORS issues with PATCH
        // Option 1: Use POST with a special field to indicate it's an update
        const updateData = {
          ...agentData,
          _method: 'PATCH' // Some backends support this convention
        };
        
        // Ensure agent ID is sanitized (no slashes or spaces)
        const sanitizedAgentId = selectedAgent.id.trim().split('/')[0];
        console.log('Updating agent:', sanitizedAgentId, updateData);
        
        try {
          // Try POST with _method first
          savedAgent = await apiRequest(
            `http://localhost:4000/api/agent/${sanitizedAgentId}`, 
            'POST',
            updateData
          );
        } catch (patchError) {
          console.error('POST with _method failed, trying alternative:', patchError);
          
          // Option 2: Try PUT method instead of PATCH
          try {
            savedAgent = await apiRequest(
              `http://localhost:4000/api/agent/${sanitizedAgentId}`, 
              'PUT',
              agentData
            );
          } catch (putError) {
            console.error('PUT method failed, using mock data:', putError);
            
            // Fallback to mock data if both methods fail
            savedAgent = {
              ...selectedAgent,
              ...agentData,
              updatedAt: new Date().toISOString()
            };
            console.log('Using mock data for update:', savedAgent);
          }
        }
      } else {
        // Create new agent
        console.log('Creating new agent:', agentData);
        
        try {
          savedAgent = await apiRequest(
            'http://localhost:4000/api/agent', 
            'POST',
            agentData
          );
        } catch (createError) {
          console.error('Failed to create agent, using mock data:', createError);
          
          // Fallback to mock data
          savedAgent = {
            ...agentData,
            id: `mock-agent-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          console.log('Using mock data for creation:', savedAgent);
        }
      }
      
      // Update the agents list
      if (selectedAgent) {
        setAgents(agents.map(agent => agent.id === savedAgent.id ? savedAgent : agent));
      } else {
        setAgents([...agents, savedAgent]);
      }
      
      setShowAgentForm(false);
      setSelectedAgent(null);
      
      return savedAgent;
    } catch (err) {
      console.error('Error saving agent:', err);
      throw err;
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
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Category filter
    const matchesCategory = categoryFilter === '' || agent.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });
  
  // Sort filtered agents
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    // Handle numeric sorting
    if (sortField === 'priceDetails.basePrice') {
      const aPrice = a.priceDetails?.basePrice || 0;
      const bPrice = b.priceDetails?.basePrice || 0;
      return sortDirection === 'asc' ? aPrice - bPrice : bPrice - aPrice;
    }
    
    // Handle string sorting
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    
    if (sortDirection === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });
  
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
  
  return (
    <AdminLayout>
      <div className="manage-agents-container">
        <header className="page-header">
          <h1>Manage Agents</h1>
          {!apiStatus.isOnline && (
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
            >
              <FaPlus /> Create New Agent
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
                              src={agent.iconUrl || "https://via.placeholder.com/40?text=AI"} 
                              alt={agent.name}
                              className="agent-icon"
                              onError={(e) => {
                                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M35 40 L65 60 M65 40 L35 60' stroke='%23999' stroke-width='2'/%3E%3C/svg%3E";
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