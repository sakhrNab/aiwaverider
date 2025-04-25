import React, { useState, useEffect, useContext } from 'react';
import { 
  FaImage, 
  FaDollarSign, 
  FaTags, 
  FaInfoCircle, 
  FaSave, 
  FaRegCheckCircle,
  FaFeatherAlt,
  FaTools
} from 'react-icons/fa';
import { getAgentPrice, updateAgentPrice } from '../../services/priceService';
import { AuthContext } from '../../contexts/AuthContext';
import './AgentForm.css';

/**
 * Form component for creating and editing agents
 */
const AgentForm = ({ agent, onSubmit, onCancel, onFieldChange }) => {
  // Get current user from AuthContext
  const { user } = useContext(AuthContext);

  // Handle blob URLs in image fields more safely
  const isBlobUrl = (url) => {
    return url && typeof url === 'string' && url.startsWith('blob:');
  };

  // Safe image URL validator
  const isValidImageUrl = (url) => {
    if (!url) return false;
    if (typeof url !== 'string') return false;
    
    // Handle blob URLs separately
    if (isBlobUrl(url)) {
      // We can't really validate blob URLs, so we'll just return true
      // and handle errors with the onError handler on the image
      return true;
    }
    
    // Detect example.com URLs which we know will fail
    if (url.includes('example.com')) {
      console.log('Detected example.com URL which is likely to fail:', url);
      return false;
    }
    
    // For regular URLs, do basic validation
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:', 'data:'].includes(parsedUrl.protocol);
    } catch (error) {
      return false;
    }
  };
  
  // Generate a safe placeholder image for icons and images
  const generatePlaceholderImage = (type = 'icon', text = 'AI') => {
    const isIcon = type === 'icon';
    const width = isIcon ? 100 : 300;
    const height = isIcon ? 100 : 200;
    const bgColor = '4a4de7';
    const textColor = 'ffffff';
    const fontSize = isIcon ? 14 : 24;
    
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Crect width='${width}' height='${height}' fill='%23${bgColor}'/%3E%3Ctext x='${width/2}' y='${height/2}' font-family='Arial' font-size='${fontSize}' text-anchor='middle' dominant-baseline='middle' fill='%23${textColor}'%3E${text}%3C/text%3E%3C/svg%3E`;
  };
  
  // Default form data for a new agent
  const defaultFormData = {
    name: '',
    title: '',
    description: '',
    category: '',
    imageUrl: generatePlaceholderImage('image', 'Agent Image'),
    iconUrl: generatePlaceholderImage('icon', 'AI'),
    creator: {
      name: user?.displayName || user?.firstName || '',
      email: user?.email || '',
      username: user?.username || (user?.displayName?.replace(/\s+/g, '')) || (user?.email?.split('@')[0]) || '',
      role: user?.role || 'Admin',
      id: user?.uid || ''
    },
    isFree: false,
    features: [''],
    tags: [''],
    isFeatured: false,
    isVerified: false,
    isPopular: false,
    isTrending: false,
    status: 'active'
  };
  
  // Default price data to prevent uncontrolled to controlled component warnings
  const defaultPriceData = {
    basePrice: 0,
    discountedPrice: 0,
    currency: 'USD',
    isFree: false
  };
  
  // State for form data
  const [formData, setFormData] = useState(() => {
    if (!agent) {
      // For new agents, use current user info for creator
      return { ...defaultFormData };
    }
    
    // For existing agents, use the agent's data
    const safeAgent = agent || {};
    
    // Helper functions for safe image handling
    const safeImageUrl = (url) => {
      // If it's a blob URL, empty string, or not valid (including example.com), use a placeholder
      if (!url || isBlobUrl(url) || !isValidImageUrl(url)) {
        return generatePlaceholderImage('image', safeAgent.name?.charAt(0) || 'A');
      }
      return url;
    };
    
    const safeIconUrl = (url) => {
      // If it's a blob URL, empty string, or not valid (including example.com), use a placeholder
      if (!url || isBlobUrl(url) || !isValidImageUrl(url)) {
        return generatePlaceholderImage('icon', safeAgent.name?.charAt(0) || 'A');
      }
      return url;
    };
    
    return {
      ...defaultFormData,
      ...safeAgent,
      // Ensure these fields are always defined
      name: safeAgent.name || '',
      title: safeAgent.title || '',
      description: safeAgent.description || '',
      category: safeAgent.category || '',
      imageUrl: safeImageUrl(safeAgent.imageUrl),
      iconUrl: safeIconUrl(safeAgent.iconUrl),
      version: safeAgent.version || '',
      creator: {
        ...defaultFormData.creator,
        ...(safeAgent.creator || {}),
        name: safeAgent.creator?.name || defaultFormData.creator.name,
        email: safeAgent.creator?.email || defaultFormData.creator.email,
        username: safeAgent.creator?.username || defaultFormData.creator.username,
        role: safeAgent.creator?.role || defaultFormData.creator.role,
        id: safeAgent.creator?.id || defaultFormData.creator.id
      },
      features: Array.isArray(safeAgent.features) && safeAgent.features.length > 0 ? safeAgent.features : [''],
      tags: Array.isArray(safeAgent.tags) && safeAgent.tags.length > 0 ? safeAgent.tags : ['']
    };
  });
  
  // Track original values to detect actual changes
  const [originalData, setOriginalData] = useState({});
  
  // Initialize priceData with default values to prevent uncontrolled inputs
  const [priceData, setPriceData] = useState(() => {
    if (!agent) return { ...defaultPriceData };
    
    const safeAgent = agent || {};
    const safeDetails = safeAgent.priceDetails || {};
    
    return {
      basePrice: safeDetails.basePrice ?? 0,
      discountedPrice: safeDetails.discountedPrice ?? safeDetails.finalPrice ?? safeDetails.basePrice ?? 0,
      currency: safeDetails.currency || 'USD',
      isFree: safeAgent.isFree ?? false,
      isSubscription: safeAgent.isSubscription ?? false
    };
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formError, setFormError] = useState(null);
  
  // Reset form data when agent prop changes
  useEffect(() => {
    if (agent) {
      console.log('Agent form received new agent data:', agent);
      
      // Store original data for change detection
      setOriginalData({
        ...agent,
        ...(agent.priceDetails ? {
          basePrice: agent.priceDetails.basePrice,
          discountedPrice: agent.priceDetails.discountedPrice || agent.priceDetails.finalPrice,
          currency: agent.priceDetails.currency,
          isFree: agent.isFree,
          isSubscription: agent.isSubscription
        } : {})
      });
      
      // Clean up potentially problematic image URLs
      const safeImageUrl = (url) => {
        // If it's a blob URL, empty string, or not valid (including example.com), use a placeholder
        if (isBlobUrl(url) || !url || !isValidImageUrl(url)) {
          return generatePlaceholderImage('image', agent.name?.charAt(0) || 'A');
        }
        return url;
      };
      
      const safeIconUrl = (url) => {
        // If it's a blob URL, empty string, or not valid (including example.com), use a placeholder
        if (isBlobUrl(url) || !url || !isValidImageUrl(url)) {
          return generatePlaceholderImage('icon', agent.name?.charAt(0) || 'A');
        }
        return url;
      };
      
      setFormData({
        ...defaultFormData, // Start with default values for all fields
        ...agent,           // Override with agent values
        // Ensure these fields are always defined with empty strings as fallbacks
        name: agent.name || '',
        title: agent.title || '',
        description: agent.description || '',
        category: agent.category || '',
        version: agent.version || '',
        imageUrl: safeImageUrl(agent.imageUrl),
        iconUrl: safeIconUrl(agent.iconUrl),
        creator: {
          ...defaultFormData.creator,
          ...(agent.creator || {}),
          name: agent.creator?.name || '',
          email: agent.creator?.email || ''
        },
        features: Array.isArray(agent.features) && agent.features.length > 0 ? agent.features : [''],
        tags: Array.isArray(agent.tags) && agent.tags.length > 0 ? agent.tags : ['']
      });
      
      // If agent has priceDetails, use them to initialize price data
      if (agent.priceDetails) {
        const initialPriceData = {
          basePrice: agent.priceDetails.basePrice || 0,
          discountedPrice: agent.priceDetails.discountedPrice || agent.priceDetails.finalPrice || agent.priceDetails.basePrice || 0, 
          currency: agent.priceDetails.currency || 'USD',
          isFree: agent.isFree || false,
          isSubscription: agent.isSubscription || false
        };
        console.log('Setting initial price data from agent:', initialPriceData);
        setPriceData(initialPriceData);
      }
    } else {
      // Reset to defaults for new agent
      setFormData({...defaultFormData});
      setPriceData(defaultPriceData);
      setOriginalData({});
    }
  }, [agent]); // Only re-run if agent changes
  
  // Skip separate price data fetch if we already have it in the agent object
  useEffect(() => {
    if (agent && agent.id) {
      if (agent.priceDetails) {
        console.log('Using price data from agent object, skipping API call');
        // We already have price data from the agent object - ensure all values are defined
        setPriceData({
          basePrice: agent.priceDetails?.basePrice ?? 0,
          discountedPrice: agent.priceDetails?.discountedPrice ?? 
                           agent.priceDetails?.finalPrice ?? 
                           agent.priceDetails?.basePrice ?? 0,
          currency: agent.priceDetails?.currency || 'USD',
          isFree: agent.isFree ?? false,
          isSubscription: agent.isSubscription ?? false
        });
      } else {
        // Only fetch price if we don't have it already
        fetchAgentPrice(agent.id);
      }
    } else {
      // For new agents, set default price data
      setPriceData({
        basePrice: 0,
        discountedPrice: 0, 
        currency: 'USD',
        isFree: true,
        isSubscription: false
      });
    }
  }, [agent]);
  
  // Fetch price data from API
  const fetchAgentPrice = async (agentId) => {
    try {
      console.log('Fetching price data for agent:', agentId);
      const data = await getAgentPrice(agentId);
      console.log('Retrieved price data:', data);
      
      // Ensure we have default values for all price fields to prevent controlled/uncontrolled input issues
      setPriceData({
        basePrice: data?.basePrice ?? 0,
        discountedPrice: data?.discountedPrice ?? data?.finalPrice ?? data?.basePrice ?? 0,
        currency: data?.currency || 'USD',
        isFree: data?.isFree ?? (data?.basePrice === 0) ?? false,
        isSubscription: data?.isSubscription ?? false
      });
      
      // Update form data with price-related flags
      setFormData(prevData => ({
        ...prevData,
        isFree: data?.isFree ?? (data?.basePrice === 0) ?? false,
        isSubscription: data?.isSubscription ?? false
      }));
    } catch (err) {
      console.error('Error fetching price data:', err);
      // If we have pricing data in the agent object, use that as a fallback
      if (agent && agent.priceDetails) {
        console.log('Using price data from agent object as fallback');
        const fallbackData = {
          basePrice: agent.priceDetails?.basePrice ?? 0,
          discountedPrice: agent.priceDetails?.discountedPrice ?? agent.priceDetails?.basePrice ?? 0,
          currency: agent.priceDetails?.currency || 'USD',
          isFree: agent?.isFree ?? (agent.priceDetails?.basePrice === 0) ?? false,
          isSubscription: agent?.isSubscription ?? false
        };
        setPriceData(fallbackData);
      } else {
        // Set safe default values if no pricing data is available
        setPriceData({
          basePrice: 0,
          discountedPrice: 0,
          currency: 'USD',
          isFree: true,
          isSubscription: false
        });
      }
    }
  };
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Notify parent about field change for tracking modified fields
    if (onFieldChange) {
      onFieldChange(name, value, originalData[name]);
    }
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
    
    // Notify parent about field change
    if (onFieldChange) {
      onFieldChange(name, checked, originalData[name]);
    }
    
    // Special handling for isFree to update pricing
    if (name === 'isFree') {
      if (checked) {
        // If setting agent to free, reset price data
        setPriceData(prev => ({
          ...prev,
          basePrice: 0,
          discountedPrice: 0,
          isFree: true
        }));
        
        // Also notify about price changes
        if (onFieldChange) {
          onFieldChange('basePrice', 0, originalData.basePrice);
          onFieldChange('discountedPrice', 0, originalData.discountedPrice);
        }
      } else {
        // If setting to paid, ensure we have default prices
        setPriceData(prev => ({
          ...prev,
          basePrice: prev.basePrice || 9.99,
          discountedPrice: prev.discountedPrice || prev.basePrice || 9.99,
          isFree: false
        }));
        
        // Notify about price changes
        if (onFieldChange) {
          onFieldChange('basePrice', 9.99, originalData.basePrice);
          onFieldChange('discountedPrice', 9.99, originalData.discountedPrice);
        }
      }
    }
  };
  
  // Handle nested object changes (e.g., creator.name)
  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
    
    // Notify parent about nested field change
    if (onFieldChange) {
      onFieldChange(`${parent}.${field}`, value, originalData[parent]?.[field]);
    }
  };
  
  // Handle tags and features (comma-separated values)
  const handleArrayInput = (field, value) => {
    // Split by commas and trim each item
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({
      ...prev,
      [field]: array
    }));
  };
  
  // Handle price changes
  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    const numericValue = parseFloat(value) || 0;
    
    if (name === 'basePrice') {
      // When base price changes, update discounted price only if they were previously equal
      // (meaning no discount was applied)
      setPriceData(prev => {
        // Ensure prev is always an object with defined properties
        const safePrice = prev || {};
        const wasEqual = (safePrice.basePrice ?? 0) === (safePrice.discountedPrice ?? 0);
        return {
          ...safePrice,
          basePrice: numericValue,
          // Update discounted price only if it was previously equal to base price
          discountedPrice: wasEqual ? numericValue : (safePrice.discountedPrice ?? numericValue),
          // If price is 0, mark as free
          isFree: numericValue === 0
        };
      });
      
      // If price becomes 0, update the isFree checkbox
      if (numericValue === 0) {
        setFormData(prev => ({
          ...prev,
          isFree: true
        }));
        
        // Notify about isFree change
        if (onFieldChange) {
          onFieldChange('isFree', true, originalData?.isFree);
        }
      } else if (formData.isFree) {
        // If agent was free but now has a price, update isFree
        setFormData(prev => ({
          ...prev,
          isFree: false
        }));
        
        // Notify about isFree change
        if (onFieldChange) {
          onFieldChange('isFree', false, originalData?.isFree);
        }
      }
    } else {
      // For other price fields, just update the value
      setPriceData(prev => ({
        ...(prev || {}), // Ensure prev is an object
        [name]: numericValue
      }));
    }
    
    // Notify parent about price field change
    if (onFieldChange) {
      onFieldChange(name, numericValue, originalData?.[name]);
    }
  };
  
  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    
    // Validate image - now required
    if (!formData.imageUrl || !isValidImageUrl(formData.imageUrl)) {
      newErrors.imageUrl = 'Please upload an image for the agent';
    }
    
    // Validate price
    if (!formData.isFree && (!priceData || priceData.basePrice <= 0)) {
      newErrors.basePrice = 'Price must be greater than 0 for non-free agents';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Ensure all form fields have defined values by using nullish coalescing
      const safeFormData = {
        ...formData,
        name: formData.name ?? '',
        title: formData.title ?? '',
        description: formData.description ?? '',
        category: formData.category ?? '',
        version: formData.version ?? '',
        imageUrl: formData.imageUrl ?? '',
        // Always use the placeholder image for icon
        iconUrl: formData.iconUrl ?? generatePlaceholderImage('icon', formData.name?.charAt(0) || 'A'),
        features: formData.features ?? [''],
        tags: formData.tags ?? [''],
        isFree: formData.isFree ?? false,
        isSubscription: formData.isSubscription ?? false,
        creator: {
          ...(formData.creator || {}),
          name: formData.creator?.name ?? user?.displayName ?? 'Admin',
          email: formData.creator?.email ?? user?.email ?? '',
          id: formData.creator?.id ?? user?.uid ?? '',
          username: formData.creator?.username ?? 
                   user?.username ?? 
                   (formData.creator?.name?.replace(/\s+/g, '') || user?.displayName?.replace(/\s+/g, '')) ?? 
                   user?.email?.split('@')[0] ?? 
                   'AIWaverider',
          role: formData.creator?.role ?? user?.role ?? 'Admin'
        }
      };
      
      // Prepare agent data with safe values
      const agentData = {
        ...safeFormData,
        // Ensure dates are ISO strings
        createdAt: safeFormData.createdAt || new Date().toISOString(),
        dateCreated: safeFormData.dateCreated || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Include price details for better data consistency
        priceDetails: {
          basePrice: priceData?.basePrice ?? 0,
          discountedPrice: priceData?.discountedPrice ?? priceData?.basePrice ?? 0,
          currency: priceData?.currency || 'USD'
        },
        // Pass pricing flags to agent data
        basePrice: priceData?.basePrice ?? 0,
        discountedPrice: priceData?.discountedPrice ?? priceData?.basePrice ?? 0
      };
      
      // Submit the form data
      const savedAgent = await onSubmit(agentData);
      
      // If we got a valid agent back and it has an ID
      if (savedAgent && savedAgent.id) {
        try {
          // Update agent price if needed
          if (priceData) {
            // Make sure we're updating with the most current price data
            // IMPORTANT: Ensure discountedPrice is explicitly included
            const updatedPriceData = {
              ...priceData,
              basePrice: priceData.basePrice,
              discountedPrice: priceData.discountedPrice, // Explicitly include this
              isFree: formData.isFree,
              isSubscription: formData.isSubscription
            };
            
            console.log('Submitting price data to backend:', updatedPriceData);
            await updateAgentPrice(savedAgent.id, updatedPriceData);
          }
        } catch (priceError) {
          // Log the error but don't fail the whole submission
          console.error('Error updating price:', priceError);
        }
        
        // Show success message
        setFormError(null);
        
        // Reset form for a new submission or close form
        if (!agent) {
          setFormData(defaultFormData);
        }
      }
      
      // Call onCancel to close the form
      if (onCancel) {
        onCancel();
      }
    } catch (err) {
      console.error('Error saving agent:', err);
      setFormError('Failed to save agent. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Category options
  const categories = [
    'Self Improvement',
    'Design',
    'Drawing & Painting',
    '3D',
    'Music & Sound Design',
    'Software Development',
    'Business',
    'Education',
    'Entertainment',
    'Writing',
    'Productivity'
  ];
  
  // Render the agent form with tabs
  return (
    <form className="agent-form" onSubmit={handleSubmit}>
      {/* Form tabs */}
      <div className="form-tabs">
        <button 
          type="button"
          className={`tab-button ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          <FaInfoCircle /> Basic Info
        </button>
        <button 
          type="button"
          className={`tab-button ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          <FaImage /> Media
        </button>
        <button 
          type="button"
          className={`tab-button ${activeTab === 'price' ? 'active' : ''}`}
          onClick={() => setActiveTab('price')}
        >
          <FaDollarSign /> Pricing
        </button>
        <button 
          type="button"
          className={`tab-button ${activeTab === 'features' ? 'active' : ''}`}
          onClick={() => setActiveTab('features')}
        >
          <FaTools /> Features
        </button>
        <button 
          type="button"
          className={`tab-button ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          <FaRegCheckCircle /> Status
        </button>
      </div>
      
      {/* Form tab content */}
      <div className="form-content">
        {/* Basic Information */}
        <div className={`tab-content ${activeTab === 'basic' ? 'active' : ''}`}>
          <h3><FaInfoCircle /> Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="name">
              Agent Name*
              <span className="field-required">Required</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <div className="error-message">{errors.name}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="title">
              Agent Title*
              <span className="field-required">Required</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <div className="error-message">{errors.title}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="description">
              Description*
              <span className="field-required">Required</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className={errors.description ? 'error' : ''}
            />
            {errors.description && <div className="error-message">{errors.description}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="category">
              Category*
              <span className="field-required">Required</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={errors.category ? 'error' : ''}
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            {errors.category && <div className="error-message">{errors.category}</div>}
          </div>
          
          {/* Creator Information Section */}
          <div className="form-group creator-info">
            <h4>Creator Information</h4>
            <div className="creator-fields">
              <div className="creator-field">
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.creator?.name || ''}
                  onChange={(e) => handleNestedChange('creator', 'name', e.target.value)}
                />
              </div>
              
              <div className="creator-field">
                <label>Email:</label>
                <input
                  type="email"
                  value={formData.creator?.email || ''}
                  onChange={(e) => handleNestedChange('creator', 'email', e.target.value)}
                  disabled={!!agent} // Only allow editing for new agents
                />
              </div>
              
              <div className="creator-field">
                <label>Username:</label>
                <input
                  type="text"
                  value={formData.creator?.username || ''}
                  onChange={(e) => handleNestedChange('creator', 'username', e.target.value)}
                />
              </div>
              
              <div className="creator-field">
                <label>Role:</label>
                <select
                  value={formData.creator?.role || 'Admin'}
                  onChange={(e) => handleNestedChange('creator', 'role', e.target.value)}
                >
                  <option value="Admin">Admin</option>
                  <option value="Partner">Partner</option>
                  <option value="User">User</option>
                </select>
              </div>
            </div>
            <p className="creator-note">
              These fields will be displayed as the creator of this agent.
            </p>
          </div>
          
          <div className="form-group">
            <label htmlFor="version">Version</label>
            <input
              type="text"
              id="version"
              name="version"
              value={formData.version}
              onChange={handleChange}
              placeholder="e.g., 1.0.0"
            />
          </div>
        </div>
        
        {/* Media */}
        <div className={`tab-content ${activeTab === 'media' ? 'active' : ''}`}>
          <h3><FaImage /> Media & Images</h3>
          
          <div className="form-group">
            <label htmlFor="imageSection">Agent Image</label>
            <div className="media-options">
              <div className="media-option">
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      try {
                        // For preview only - actual upload happens when form is submitted
                        const imageUrl = URL.createObjectURL(e.target.files[0]);
                        console.log('Image file selected:', e.target.files[0]);
                        setFormData({
                          ...formData,
                          imageUrl: imageUrl,
                          _imageFile: e.target.files[0] // Store the file for later upload
                        });
                      } catch (error) {
                        console.error('Error creating object URL:', error);
                        // Fallback to placeholder if createObjectURL fails
                        setFormData({
                          ...formData,
                          imageUrl: generatePlaceholderImage('image', formData.name?.charAt(0) || 'A'),
                          _imageFile: null
                        });
                      }
                    }
                  }}
                  className={errors.imageUrl ? 'error' : ''}
                />
                <span className="field-help">Upload Image from Computer (Required)<br />Supported formats: JPG, PNG, GIF. Max size: 5MB</span>
                {errors.imageUrl && <div className="error-message">{errors.imageUrl}</div>}
              </div>
            </div>
          </div>
          
          <div className="preview-section">
            <div className="image-preview">
              <h4>Image Preview</h4>
              <div className="preview-container">
                {formData.imageUrl && isValidImageUrl(formData.imageUrl) ? (
                  <img 
                    src={formData.imageUrl} 
                    alt="Agent image preview" 
                    onError={(e) => {
                      console.log('Image failed to load:', formData.imageUrl);
                      // Check if it's a blob URL that might be invalid
                      if (isBlobUrl(formData.imageUrl)) {
                        console.log('Detected blob URL that may be invalid, reverting to placeholder');
                        // Revoke the invalid blob URL to free up memory
                        URL.revokeObjectURL(formData.imageUrl);
                        // Update the form data to remove the invalid URL
                        setFormData(prev => ({
                          ...prev,
                          imageUrl: generatePlaceholderImage('image', formData.name?.charAt(0) || 'A'),
                          _imageFile: null
                        }));
                      } else {
                        // Set a placeholder image directly on the element
                        e.target.src = generatePlaceholderImage('image', formData.name?.charAt(0) || 'A');
                        e.target.onerror = null; // Prevent infinite error loops
                      }
                    }}
                  />
                ) : (
                  <div className="no-image">
                    <FaImage />
                    <span>Agent Image</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="icon-preview">
              <h4>Icon Preview</h4>
              <div className="preview-container">
                {formData.iconUrl && isValidImageUrl(formData.iconUrl) ? (
                  <img 
                    src={formData.iconUrl} 
                    alt="Agent icon preview" 
                    onError={(e) => {
                      console.log('Icon failed to load:', formData.iconUrl);
                      // Check if it's a blob URL that might be invalid
                      if (isBlobUrl(formData.iconUrl)) {
                        console.log('Detected blob URL that may be invalid, reverting to placeholder');
                        // Revoke the invalid blob URL to free up memory
                        URL.revokeObjectURL(formData.iconUrl);
                        // Update the form data to remove the invalid URL
                        setFormData(prev => ({
                          ...prev,
                          iconUrl: generatePlaceholderImage('icon', formData.name?.charAt(0) || 'A'),
                          _iconFile: null
                        }));
                      } else {
                        // Set a placeholder image directly on the element
                        e.target.src = generatePlaceholderImage('icon', formData.name?.charAt(0) || 'A');
                        e.target.onerror = null; // Prevent infinite error loops
                      }
                    }}
                  />
                ) : (
                  <div className="no-image">
                    <FaImage />
                    <span>AI</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Pricing */}
        <div className={`tab-content ${activeTab === 'price' ? 'active' : ''}`}>
          <h3><FaDollarSign /> Pricing</h3>
          
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isFree"
                checked={formData.isFree}
                onChange={handleCheckboxChange}
              />
              <span>Free Agent</span>
            </label>
          </div>
          
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isSubscription"
                checked={formData.isSubscription}
                onChange={handleCheckboxChange}
                disabled={formData.isFree}
              />
              <span>Subscription-based</span>
            </label>
          </div>
          
          {!formData.isFree && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="basePrice">
                    Base Price
                    <span className="field-required">Required</span>
                  </label>
                  <div className="price-input">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      id="basePrice"
                      name="basePrice"
                      value={priceData?.basePrice ?? 0}
                      onChange={handlePriceChange}
                      step="0.01"
                      min="0"
                      className={errors.basePrice ? 'has-error' : ''}
                    />
                  </div>
                  {errors.basePrice && <div className="error-message">{errors.basePrice}</div>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="discountedPrice">Discounted Price</label>
                  <div className="price-input">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      id="discountedPrice"
                      name="discountedPrice"
                      value={priceData?.discountedPrice ?? 0}
                      onChange={handlePriceChange}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  name="currency"
                  value={priceData.currency || 'USD'}
                  onChange={handlePriceChange}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </>
          )}
        </div>
        
        {/* Features & Tags */}
        <div className={`tab-content ${activeTab === 'features' ? 'active' : ''}`}>
          <h3><FaTools /> Features & Tags</h3>
          
          <div className="form-group">
            <label htmlFor="features">
              Features
              <span className="field-help">Comma-separated list of features</span>
            </label>
            <textarea
              id="features"
              value={formData.features?.join(', ') || ''}
              onChange={(e) => handleArrayInput('features', e.target.value)}
              placeholder="Desktop App, Voice Enabled, Web Interface"
              rows="3"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="tags">
              Tags
              <span className="field-help">Comma-separated list of tags</span>
            </label>
            <textarea
              id="tags"
              value={formData.tags?.join(', ') || ''}
              onChange={(e) => handleArrayInput('tags', e.target.value)}
              placeholder="Education, Assistant, AI, Creative"
              rows="3"
            />
          </div>
        </div>
        
        {/* Status & Visibility */}
        <div className={`tab-content ${activeTab === 'status' ? 'active' : ''}`}>
          <h3><FaRegCheckCircle /> Status & Visibility</h3>
          
          <div className="status-toggles">
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleCheckboxChange}
                />
                <span>Featured</span>
              </label>
              <p className="field-help">Display in the featured section</p>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isBestseller"
                  checked={formData.isBestseller}
                  onChange={handleCheckboxChange}
                />
                <span>Bestseller</span>
              </label>
              <p className="field-help">Mark as a bestselling agent</p>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isNew"
                  checked={formData.isNew}
                  onChange={handleCheckboxChange}
                />
                <span>New</span>
              </label>
              <p className="field-help">Mark as newly added</p>
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isTrending"
                  checked={formData.isTrending}
                  onChange={handleCheckboxChange}
                />
                <span>Trending</span>
              </label>
              <p className="field-help">Mark as trending</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Form bottom action buttons */}
      <div className="form-actions">
        {agent && agent.id && agent.id.toString().startsWith('agent-') && (
          <div className="mock-agent-notice">
            <FaInfoCircle /> This is a mock agent for development. Some features may be limited.
          </div>
        )}
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : (
            <>
              <FaSave /> {agent ? 'Update Agent' : 'Create Agent'}
            </>
          )}
        </button>
      </div>
      
      {/* General form error */}
      {formError && (
        <div className="form-error-message">
          {formError}
        </div>
      )}
    </form>
  );
};

export default AgentForm; 