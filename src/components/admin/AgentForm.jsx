import React, { useState, useEffect } from 'react';
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
import './AgentForm.css';

/**
 * Form component for creating and editing agents
 */
const AgentForm = ({ agent, onSubmit, onCancel }) => {
  // Default form data for a new agent
  const defaultFormData = {
    name: '',
    title: '',
    description: '',
    category: '',
    imageUrl: 'https://placehold.co/300x200?text=Agent+Image',
    iconUrl: 'https://placehold.co/100x100?text=Agent+Icon',
    creator: {
      name: '',
      email: ''
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
  
  // State for form data
  const [formData, setFormData] = useState(agent ? {
    ...defaultFormData,
    ...agent,
    creator: {
      ...defaultFormData.creator,
      ...(agent.creator || {})
    },
    features: Array.isArray(agent.features) && agent.features.length > 0 ? agent.features : [''],
    tags: Array.isArray(agent.tags) && agent.tags.length > 0 ? agent.tags : ['']
  } : {...defaultFormData});
  const [priceData, setPriceData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formError, setFormError] = useState(null);
  
  // Fetch price data if editing an existing agent
  useEffect(() => {
    if (agent && agent.id) {
      fetchAgentPrice(agent.id);
    } else {
      // For new agents, set default price data
      setPriceData({
        basePrice: 0,
        discountedPrice: 0,
        currency: 'USD',
        isFree: true
      });
    }
  }, [agent]);
  
  // Fetch price data from API
  const fetchAgentPrice = async (agentId) => {
    try {
      const data = await getAgentPrice(agentId);
      setPriceData(data);
    } catch (err) {
      console.error('Error fetching price data:', err);
    }
  };
  
  // Ensure all needed form fields have defined values
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      name: prev.name || '',
      title: prev.title || '',
      description: prev.description || '',
      category: prev.category || '',
      imageUrl: prev.imageUrl || 'https://placehold.co/300x200?text=Agent+Image',
      iconUrl: prev.iconUrl || 'https://placehold.co/100x100?text=Agent+Icon',
      creator: {
        name: prev.creator?.name || '',
        email: prev.creator?.email || '',
      },
      features: Array.isArray(prev.features) && prev.features.length > 0 ? prev.features : [''],
      tags: Array.isArray(prev.tags) && prev.tags.length > 0 ? prev.tags : [''],
    }));
  }, []);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
    
    // Special handling for isFree to update pricing
    if (name === 'isFree' && checked) {
      setPriceData(prev => ({
        ...prev,
        basePrice: 0,
        discountedPrice: 0
      }));
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
    setPriceData(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };
  
  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (!formData.category) newErrors.category = 'Category is required';
    
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
      // Prepare agent data
      const agentData = {
        ...formData,
        // Ensure dates are ISO strings
        createdAt: formData.createdAt || new Date().toISOString(),
        dateCreated: formData.dateCreated || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Submit the form data
      const savedAgent = await onSubmit(agentData);
      
      // If we got a valid agent back and it has an ID
      if (savedAgent && savedAgent.id) {
        try {
          // Update agent price if needed
          if (priceData) {
            await updateAgentPrice(savedAgent.id, priceData);
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
              placeholder="Short name for the agent"
              className={errors.name ? 'has-error' : ''}
            />
            {errors.name && <div className="error-message">{errors.name}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="title">
              Display Title*
              <span className="field-required">Required</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Longer title shown to users"
              className={errors.title ? 'has-error' : ''}
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
              placeholder="Detailed description of the agent's capabilities"
              rows="4"
              className={errors.description ? 'has-error' : ''}
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
              className={errors.category ? 'has-error' : ''}
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && <div className="error-message">{errors.category}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="version">Version</label>
            <input
              type="text"
              id="version"
              name="version"
              value={formData.version}
              onChange={handleChange}
              placeholder="e.g. 1.0.0"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="creatorName">Creator Name</label>
              <input
                type="text"
                id="creatorName"
                value={formData.creator?.name || ''}
                onChange={(e) => handleNestedChange('creator', 'name', e.target.value)}
                placeholder="Creator name"
              />
            </div>
            
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.creator?.verified || false}
                  onChange={(e) => handleNestedChange('creator', 'verified', e.target.checked)}
                />
                <span>Verified Creator</span>
              </label>
            </div>
          </div>
        </div>
        
        {/* Media */}
        <div className={`tab-content ${activeTab === 'media' ? 'active' : ''}`}>
          <h3><FaImage /> Media & Images</h3>
          
          <div className="form-group">
            <label htmlFor="iconUrl">Icon URL</label>
            <input
              type="text"
              id="iconUrl"
              name="iconUrl"
              value={formData.iconUrl}
              onChange={handleChange}
              placeholder="URL for agent icon"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="imageUrl">Image URL</label>
            <input
              type="text"
              id="imageUrl"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="URL for agent main image"
            />
            <span className="field-help">Enter an URL or use the file uploader below</span>
          </div>
          
          <div className="form-group">
            <label htmlFor="imageUpload">Upload Image</label>
            <input
              type="file"
              id="imageUpload"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  // For preview only - in a real implementation you would upload to a server
                  const imageUrl = URL.createObjectURL(e.target.files[0]);
                  setFormData({
                    ...formData,
                    imageUrl: imageUrl,
                    _imageFile: e.target.files[0] // Store the file for later upload
                  });
                }
              }}
            />
            <span className="field-help">Supported formats: JPG, PNG, GIF. Max size: 5MB</span>
          </div>
          
          <div className="image-preview">
            <h4>Image Preview</h4>
            <div className="preview-container">
              {formData.imageUrl ? (
                <img 
                  src={formData.imageUrl} 
                  alt="Agent image preview" 
                  onError={(e) => {
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%23f0f0f0'/%3E%3Cpath d='M100 80 L200 120 M200 80 L100 120' stroke='%23999' stroke-width='2'/%3E%3C/svg%3E";
                  }}
                />
              ) : (
                <div className="no-image">
                  <FaImage />
                  <span>No image provided</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="image-preview">
            <h4>Icon Preview</h4>
            <div className="preview-container">
              {formData.iconUrl ? (
                <img 
                  src={formData.iconUrl} 
                  alt="Agent icon preview" 
                  onError={(e) => {
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M35 40 L65 60 M65 40 L35 60' stroke='%23999' stroke-width='2'/%3E%3C/svg%3E";
                  }}
                />
              ) : (
                <div className="no-image">
                  <FaImage />
                  <span>No icon provided</span>
                </div>
              )}
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
                      value={priceData?.basePrice || 0}
                      onChange={handlePriceChange}
                      step="0.01"
                      min="0"
                      disabled={formData.isFree}
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
                      value={priceData?.discountedPrice || 0}
                      onChange={handlePriceChange}
                      step="0.01"
                      min="0"
                      disabled={formData.isFree}
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  name="currency"
                  value={priceData?.currency || 'USD'}
                  onChange={(e) => setPriceData({...priceData, currency: e.target.value})}
                  disabled={formData.isFree}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
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