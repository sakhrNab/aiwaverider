import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  FaImage, 
  FaDollarSign, 
  FaInfoCircle, 
  FaSave, 
  FaRegCheckCircle,
  FaTools,
  FaArrowUp,
  FaFileUpload,
  FaFileAlt
} from 'react-icons/fa';
import { getAgentPrice } from '../../../services/priceService';
import { AuthContext } from '../../../contexts/AuthContext';
import './AgentForm.css';
import { toast } from 'react-hot-toast';
import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import { createAgent, updateAgent } from '../../../api/marketplace/agentApi';

/**
 * Form component for creating and editing agents
 */
const AgentForm = ({ agent, onSubmit, onCancel, onFieldChange, hideOnSubmit = false, onClose = () => {} }) => {
  // Get current user from AuthContext
  const { user } = useContext(AuthContext);
  
  // Refs for each section
  const basicInfoRef = useRef(null);
  const mediaRef = useRef(null);
  const pricingRef = useRef(null);
  const featuresRef = useRef(null);
  const statusRef = useRef(null);
  const fileUploadsRef = useRef(null);  // New ref for file uploads section
  const formRef = useRef(null);
  
  // State for showing/hiding back to top button
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Scroll handler for back to top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Scroll to section function
  const scrollToSection = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle blob URLs in image fields more safely
  const isBlobUrl = (url) => {
    return url && typeof url === 'string' && url.startsWith('blob:');
  };

  // Validate image URL
  const isValidImageUrl = (url) => {
    // If URL is empty, it's not valid
    if (!url || url.trim() === '') return false;
    
    // Handle Firebase Storage URLs (they're always valid for our app)
    if (url.includes('firebasestorage.googleapis.com')) return true;
    
    // Check for valid URL format for external URLs
    try {
      // Try to create a URL object to validate
      new URL(url);
      return true;
    } catch (e) {
      // Handle potential relative paths (which don't parse as full URLs)
      if (url.startsWith('/')) return true;
      
      console.log('Invalid URL format:', e.message);
      return false;
    }
  };

  // Handle image preview
  const handleImagePreview = (url, type = 'image') => {
    console.log(`Processing ${type} preview for URL:`, url);
    
    if (isValidImageUrl(url)) {
      return url;
    } else {
      // Return appropriate placeholder based on image type
      return type === 'icon' 
        ? '/images/placeholder-icon.png' 
        : '/images/placeholder-image.png';
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
    priceDetails: {
      basePrice: 0,
      discountedPrice: 0,
      currency: 'USD',
      isFree: false,
      isSubscription: false,
      discountPercentage: 0
    },
    features: [''],
    tags: [''],
    isFeatured: false,
    isVerified: false,
    isPopular: false,
    isTrending: false,
    status: 'active',
    downloadUrl: '',
  };
  
  // Default price data to prevent uncontrolled to controlled component warnings
  const defaultPriceData = {
    basePrice: 0,
    discountedPrice: 0,
    currency: 'USD',
    isFree: false,
    isSubscription: false,
    discountPercentage: 0
  };
  
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
  
  // State for form data
  const [formData, setFormData] = useState(() => {
    console.log("Initial useState for formData, agent:", agent);
    
    if (!agent) {
      // For new agents, use current user info for creator
      return { ...defaultFormData };
    }
    
    // Start with the agent object itself
    let combinedAgent = { ...agent };
    console.log("Using agent data for initialization:", combinedAgent);
    
    // First, parse the data field if it's a JSON string
    if (agent.data && typeof agent.data === 'string') {
      try {
        const parsedData = JSON.parse(agent.data);
        console.log("Successfully parsed outer data field (init):", parsedData);
        // Merge the parsed data into our combined data
        combinedAgent = { ...combinedAgent, ...parsedData };
      } catch (e) {
        console.error("Error parsing agent.data (init):", e);
      }
    } else if (agent.data && typeof agent.data === 'object') {
      // The data is already an object, merge it
      combinedAgent = { ...combinedAgent, ...agent.data };
    }
    
    // Always remove the data field after extracting its contents
    delete combinedAgent.data;
    
    // Handle price details from either priceDetails object or individual fields
    const priceDetails = combinedAgent.priceDetails || {
      basePrice: combinedAgent.basePrice || 0,
      discountedPrice: combinedAgent.discountedPrice || 0,
      currency: combinedAgent.currency || 'USD',
      isFree: combinedAgent.isFree || false,
      isSubscription: combinedAgent.isSubscription || false,
      discountPercentage: combinedAgent.discountPercentage || 0
    };
    
    // Set initial price data
    setPriceData(priceDetails);
    
    // Ensure features and tags are arrays
    if (!Array.isArray(combinedAgent.features)) {
      combinedAgent.features = [];
    }
    
    if (!Array.isArray(combinedAgent.tags)) {
      combinedAgent.tags = [];
    }
    
    // Special handling for isFree based on price
    if (priceDetails.basePrice === 0 || priceDetails.discountedPrice === 0) {
      priceDetails.isFree = true;
    }
    
    // Set initial price data for the form
    setPriceData({
      basePrice: priceDetails.basePrice,
      discountedPrice: priceDetails.discountedPrice,
      currency: priceDetails.currency || 'USD',
      isFree: priceDetails.isFree,
      isSubscription: priceDetails.isSubscription || false,
      discountPercentage: priceDetails.discountPercentage || 0
    });
    
    // Add consistent priceDetails to the form data
    combinedAgent.priceDetails = priceDetails;
    
    // Handle image URLs (from nested objects or direct properties)
    if (combinedAgent.image && combinedAgent.image.url) {
      combinedAgent.imageUrl = combinedAgent.image.url;
    }
    
    if (combinedAgent.jsonFile && combinedAgent.jsonFile.url) {
      combinedAgent.downloadUrl = combinedAgent.jsonFile.url;
    }
    
    // Clean up redundant properties
    ['basePrice', 'discountedPrice', 'currency', 'isSubscription', 'discountPercentage', 'templateUrl', 'fileUrl']
      .forEach(prop => {
        if (combinedAgent[prop] !== undefined && prop !== 'isFree') { // Keep isFree for backward compatibility
          delete combinedAgent[prop];
        }
      });
    
    return combinedAgent;
  });
  
  // Track original values to detect actual changes
  const [originalData, setOriginalData] = useState({});
  
  // State for image and icon previews
  const [imagePreview, setImagePreview] = useState('');
  const [iconPreview, setIconPreview] = useState('');
  
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formError, setFormError] = useState(null);
  
  // State for JSON file upload
  const [jsonFile, setJsonFile] = useState(null);
  const [jsonFileName, setJsonFileName] = useState('');
  
  // File upload handlers
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [selectedIconFile, setSelectedIconFile] = useState(null);
  
  // Upload image to Firebase Storage
  const uploadImage = async (file, agentName, type = 'image') => {
    try {
      console.log(`Starting ${type} upload for agent: ${agentName}`);
      
      // Generate a unique filename
      const sanitizedName = agentName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const fileName = `agents/${type}s/${sanitizedName}_${Date.now()}.${file.name.split('.').pop()}`;
      
      // Get storage reference
      const storageRef = firebase.storage().ref();
      const fileRef = storageRef.child(fileName);
      
      // Upload the file
      const snapshot = await fileRef.put(file);
      console.log(`${type} upload completed:`, snapshot);
      
      // Get the download URL
      const downloadUrl = await snapshot.ref.getDownloadURL();
      console.log(`${type} download URL:`, downloadUrl);
      
      return downloadUrl;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type}: ${error.message}`);
      throw error;
    }
  };
  
  // Upload JSON file to Firebase Storage
  const uploadJsonFile = async (file, fileName) => {
    try {
      console.log('Starting JSON file upload:', fileName);
      
      // Generate a unique filename if not provided
      const safeFileName = fileName || `agent_${Date.now()}.json`;
      const storagePath = `agent_templates/${safeFileName.replace(/[^a-zA-Z0-9_.]/g, '_')}`;
      
      // Get storage reference
      const storageRef = firebase.storage().ref();
      const fileRef = storageRef.child(storagePath);
      
      // Upload the file
      const snapshot = await fileRef.put(file);
      console.log('JSON file upload completed:', snapshot);
      
      // Get the download URL
      const downloadUrl = await snapshot.ref.getDownloadURL();
      console.log('JSON file download URL:', downloadUrl);
      
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading JSON file:', error);
      toast.error(`Failed to upload JSON file: ${error.message}`);
      throw error;
    }
  };
  
  // Initialize form when agent is provided
  useEffect(() => {
    if (!agent) return;
    
    console.log("Using agent data for initialization:", agent);
      
    // Create a cleaned and normalized agent object
    let cleanedAgent = { ...agent };
    
    // Step 1: Remove nested data property and flatten the structure
    if (cleanedAgent.data) {
      console.log("Found nested data property, flattening structure");
      // If data is a string, parse it
      if (typeof cleanedAgent.data === 'string') {
        try {
          const parsedData = JSON.parse(cleanedAgent.data);
          cleanedAgent = { ...cleanedAgent, ...parsedData };
        } catch (e) {
          console.error("Error parsing agent.data:", e);
        }
      } else {
        // It's already an object, merge it
        cleanedAgent = { ...cleanedAgent, ...cleanedAgent.data };
      }
      
      // Explicitly delete the data field after extraction
      delete cleanedAgent.data;
    }
    
    // Step 2: Normalize price information
    // Extract all price information into a consistent priceDetails object
    const priceDetails = {
      basePrice: cleanedAgent.priceDetails?.basePrice ?? cleanedAgent.basePrice ?? 0,
      discountedPrice: cleanedAgent.priceDetails?.discountedPrice ?? cleanedAgent.discountedPrice ?? 0,
      currency: cleanedAgent.priceDetails?.currency ?? cleanedAgent.currency ?? 'USD',
      isFree: cleanedAgent.priceDetails?.isFree ?? cleanedAgent.isFree ?? false,
      isSubscription: cleanedAgent.priceDetails?.isSubscription ?? cleanedAgent.isSubscription ?? false,
      discountPercentage: cleanedAgent.priceDetails?.discountPercentage ?? cleanedAgent.discountPercentage ?? 0
    };
    
    // Special handling for isFree based on price
    if (priceDetails.basePrice === 0 || priceDetails.discountedPrice === 0) {
      priceDetails.isFree = true;
    }
    
    // Set initial price data
    setPriceData(priceDetails);
    
    // Ensure features and tags are arrays
    if (!Array.isArray(cleanedAgent.features)) {
      cleanedAgent.features = [];
    }
    
    if (!Array.isArray(cleanedAgent.tags)) {
      cleanedAgent.tags = [];
    }
    
    // Step 3: Handle image URLs from nested objects
    if (cleanedAgent.image && cleanedAgent.image.url) {
      cleanedAgent.imageUrl = cleanedAgent.image.url;
    }
    
    if (cleanedAgent.icon && cleanedAgent.icon.url) {
      cleanedAgent.iconUrl = cleanedAgent.icon.url;
    }
    
    if (cleanedAgent.jsonFile && cleanedAgent.jsonFile.url) {
      cleanedAgent.downloadUrl = cleanedAgent.jsonFile.url || cleanedAgent.fileUrl || cleanedAgent.templateUrl || '';
    }
    
    // Step 4: Initialize form data with cleaned information
    const initialFormData = {
      ...defaultFormData,
      ...cleanedAgent,
      priceDetails,
      // Keep these at the root level for backward compatibility
      isFree: priceDetails.isFree,
      isSubscription: priceDetails.isSubscription,
      price: priceDetails.discountedPrice
    };
    
    // Remove redundant fields
    ['originalAgentData', 'basePrice', 'discountedPrice', 'currency', 'discountPercentage', 'templateUrl', 'fileUrl']
      .forEach(field => {
        if (initialFormData[field] !== undefined && field !== 'isFree') {
          delete initialFormData[field];
        }
    });
    
    // Initialize form data without redundancy
    setFormData(initialFormData);
    
    // Set image previews
    if (cleanedAgent.imageUrl) {
      setImagePreview(handleImagePreview(cleanedAgent.imageUrl, 'image'));
    } else if (cleanedAgent.image && cleanedAgent.image.url) {
      setImagePreview(handleImagePreview(cleanedAgent.image.url, 'image'));
    }
    
    if (cleanedAgent.iconUrl) {
      setIconPreview(handleImagePreview(cleanedAgent.iconUrl, 'icon'));
    } else if (cleanedAgent.icon && cleanedAgent.icon.url) {
      setIconPreview(handleImagePreview(cleanedAgent.icon.url, 'icon'));
    }
    
    // Store original data for comparison
    setOriginalData(cleanedAgent);
  }, [agent]);
  
  // Clean up blob URLs when component unmounts
  useEffect(() => {
    return () => {
      // Revoke any blob URLs to avoid memory leaks
      if (formData.imageUrl && isBlobUrl(formData.imageUrl)) {
        URL.revokeObjectURL(formData.imageUrl);
      }
      if (formData.iconUrl && isBlobUrl(formData.iconUrl)) {
        URL.revokeObjectURL(formData.iconUrl);
      }
    };
  }, [formData.imageUrl, formData.iconUrl]);
  
  // Debug: Log form data whenever it changes
  useEffect(() => {
    console.log("Current form data:", formData);
  }, [formData]);
  
  // Skip separate price data fetch if we already have it in the agent object
  useEffect(() => {
    // We've already handled direct price data in the main useEffect
    // This one will only handle API fetching for missing data
    if (agent && agent.id && !agent.priceDetails && !agent.basePrice) {
      console.log('No direct price data found, attempting API fetch for price');
      fetchAgentPrice(agent.id);
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
    
    // Handle currency selection differently from numeric fields
    if (name === 'currency') {
      setPriceData(prev => ({
        ...(prev || {}),
        currency: value
      }));
      
      // Notify parent about currency field change
      if (onFieldChange) {
        onFieldChange(name, value, originalData?.[name]);
      }
      return;
    }
    
    // For numeric fields, parse the value
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
    } else if (name === 'discountedPrice') {
      // For discounted price, just update the value
      setPriceData(prev => ({
        ...(prev || {}), // Ensure prev is an object
        discountedPrice: numericValue
      }));
    }
    
    // Notify parent about price field change
    if (onFieldChange) {
      onFieldChange(name, numericValue, originalData?.[name]);
    }
  };
  
  // Handle JSON file upload
  const handleJsonFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if file is valid JSON
      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        setErrors(prev => ({
          ...prev,
          jsonFile: 'File must be a valid JSON file'
        }));
        return;
      }
      
      // Clear error if previously set
      if (errors.jsonFile) {
        setErrors(prev => {
          const newErrors = {...prev};
          delete newErrors.jsonFile;
          return newErrors;
        });
      }
      
      setJsonFile(file);
      setJsonFileName(file.name);
      
      // Notify parent about field change
      if (onFieldChange) {
        onFieldChange('jsonFile', file, null);
      }
    }
  };
  
  // Clear JSON file selection
  const clearJsonFile = () => {
    setJsonFile(null);
    setJsonFileName('');
    
    // Notify parent about field change
    if (onFieldChange) {
      onFieldChange('jsonFile', null, jsonFile);
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
    
    console.log('Form submission starting with agent:', agent);
    console.log('Current form data:', formData);
    console.log('Current price data:', priceData);
    
    if (!formData.name) {
      toast.error('Agent name is required');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Create a clean clone without runtime-only properties
      const finalFormData = { ...formData };
      
      // Check for and remove any lingering data property early
      if ('data' in finalFormData) {
        console.log('Found lingering data property, removing it');
        delete finalFormData.data;
      }
      
      // Define which properties should be removed before submission
      const runtimeProperties = ['isSubmitting', 'errors', 'originalAgentData', 'data'];
      
      // Remove runtime-only properties
      runtimeProperties.forEach(prop => {
        if (finalFormData[prop] !== undefined) {
          delete finalFormData[prop];
        }
      });
      
      // Ensure proper price structure
      const priceDetails = {
        basePrice: priceData.basePrice ?? 0,
        discountedPrice: priceData.discountedPrice ?? 0,
        currency: priceData.currency ?? 'USD',
        isFree: priceData.isFree ?? finalFormData.isFree ?? false,
        isSubscription: priceData.isSubscription ?? finalFormData.isSubscription ?? false,
        discountPercentage: priceData.discountPercentage ?? 0
      };
      
      // Update the form data with the normalized price details
      finalFormData.priceDetails = priceDetails;
      finalFormData.price = priceDetails.discountedPrice;
      finalFormData.isFree = priceDetails.isFree;
      finalFormData.isSubscription = priceDetails.isSubscription;
      
      // Ensure all required arrays are properly initialized
      finalFormData.features = finalFormData.features?.filter(feature => feature.trim() !== '') || [];
      finalFormData.tags = finalFormData.tags?.filter(tag => tag.trim() !== '') || [];
      
      // Ensure we have the creator info
      finalFormData.creator = {
        name: finalFormData.creator?.name || 'Unknown',
        id: finalFormData.creator?.id || user?.uid || 'unknown',
        imageUrl: finalFormData.creator?.imageUrl || '',
        ...finalFormData.creator
      };
      
      // If we have image files, upload them
      if (selectedImageFile) {
        console.log('Uploading image file');
        const imageUrl = await uploadImage(selectedImageFile, finalFormData.name, 'image');
        finalFormData.imageUrl = imageUrl;
      }
      
      if (selectedIconFile) {
        console.log('Uploading icon file');
        const iconUrl = await uploadImage(selectedIconFile, finalFormData.name, 'icon');
        finalFormData.iconUrl = iconUrl;
      }
      
      // Handle JSON file upload separately to avoid FormData nesting issues
      if (jsonFile) {
        // Only upload JSON file if it's an actual file object
        if (jsonFile instanceof File) {
          console.log('Uploading JSON file');
          const jsonFileUrl = await uploadJsonFile(jsonFile, jsonFile.name);
          
          // Create proper jsonFile object structure
          finalFormData.jsonFile = {
            url: jsonFileUrl,
            fileName: jsonFile.name,
            originalName: jsonFile.name,
            contentType: jsonFile.type,
            size: jsonFile.size
          };
          
          // Also set downloadUrl for backward compatibility
          finalFormData.downloadUrl = jsonFileUrl;
        } else {
          // If jsonFile is already an object with URL, use it directly
        finalFormData.jsonFile = jsonFile;
          
          // Also ensure the jsonFileData field is removed to prevent nesting
          finalFormData.jsonFileData = undefined;
          delete finalFormData.jsonFileData;
        }
      }
      
      // Create a proper clean data structure for final submission
      const submissionData = { ...finalFormData };
      
      // Remove any nested fields that could cause data duplication
      ['originalAgentData', 'data', 'jsonFile'].forEach(field => {
        if (field === 'data') {
          // Always delete the data field to prevent duplicate data
          if (submissionData[field] !== undefined) {
            console.log(`Removing ${field} field to prevent duplication`);
            delete submissionData[field];
          }
        }
        else if (typeof submissionData[field] === 'object' && !(submissionData[field] instanceof File)) {
          // Move jsonFile properties up to the API expected format
          if (field === 'jsonFile' && submissionData.jsonFile?.url) {
            submissionData.jsonFileData = JSON.stringify(submissionData.jsonFile);
          }
        }
      });
      
      // Final verification - no data field should exist at this point
      if ('data' in submissionData) {
        console.error('Data field still exists after cleanup, removing it');
        delete submissionData.data;
      }
      
      console.log('Submitting clean data:', submissionData);
      
      if (formData.id) {
        // Update existing agent
        await updateAgent(formData.id, submissionData);
        toast.success('Agent updated successfully');
      } else {
        // Create new agent
        await createAgent(submissionData);
        toast.success('Agent created successfully');
        
        // Reset form for new entry if not in modal mode
        if (!hideOnSubmit) {
          // Revoke any blob URLs to avoid memory leaks
          if (formData.imageUrl && isBlobUrl(formData.imageUrl)) {
            URL.revokeObjectURL(formData.imageUrl);
          }
          if (formData.iconUrl && isBlobUrl(formData.iconUrl)) {
            URL.revokeObjectURL(formData.iconUrl);
          }
          
          setFormData({ ...defaultFormData });
          setPriceData({ ...defaultPriceData });
          setSelectedImageFile(null);
          setSelectedIconFile(null);
          setJsonFile(null);
          setJsonFileName('');
        }
      }
      
      // Close modal if needed
      if (hideOnSubmit) {
        onClose();
      }
    } catch (error) {
      console.error('Error submitting agent form:', error);
      toast.error(`Error: ${error.message || 'Failed to save agent'}`);
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
  
  // Add this helper function to get the currency symbol
  const getCurrencySymbol = (currencyCode) => {
    switch(currencyCode) {
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      default:
        return '$';
    }
  };
  
  // Update image previews whenever formData changes
  useEffect(() => {
    // Set image previews based on current formData
    if (formData.imageUrl) {
      console.log('Setting image preview from formData:', formData.imageUrl);
      setImagePreview(handleImagePreview(formData.imageUrl, 'image'));
    }
    
    if (formData.iconUrl) {
      console.log('Setting icon preview from formData:', formData.iconUrl);
      setIconPreview(handleImagePreview(formData.iconUrl, 'icon'));
    }
  }, [formData.imageUrl, formData.iconUrl]);
  
  // Render the agent form as a single page with sections
  return (
    <form className="agent-form" onSubmit={handleSubmit} ref={formRef}>
      {/* Section Navigation */}
      <div className="section-navigation">
        <div className="section-link" onClick={() => scrollToSection(basicInfoRef)}>
          <FaInfoCircle /> Basic Info
        </div>
        <div className="section-link" onClick={() => scrollToSection(mediaRef)}>
          <FaImage /> Media
        </div>
        <div className="section-link" onClick={() => scrollToSection(pricingRef)}>
          <FaDollarSign /> Pricing
        </div>
        <div className="section-link" onClick={() => scrollToSection(featuresRef)}>
          <FaTools /> Features
        </div>
        <div className="section-link" onClick={() => scrollToSection(fileUploadsRef)}>
          <FaFileUpload /> File Uploads
        </div>
        <div className="section-link" onClick={() => scrollToSection(statusRef)}>
          <FaRegCheckCircle /> Status
        </div>
      </div>
      
      {/* Basic Information Section */}
      <div className="form-section" ref={basicInfoRef} id="basic-info">
        <h3 className="form-section-heading"><FaInfoCircle /> Basic Information</h3>
        
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
      
      {/* Media Section */}
      <div className="form-section" ref={mediaRef} id="media">
        <h3 className="form-section-heading"><FaImage /> Media & Images</h3>
        
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
                      setSelectedImageFile(e.target.files[0]); // Store file for upload
                      setFormData({
                        ...formData,
                        imageUrl: imageUrl,
                        _imageFile: e.target.files[0] // Store the file for later upload
                      });
                    } catch (error) {
                      console.error('Error creating object URL:', error);
                      // Fallback to placeholder if createObjectURL fails
                      setSelectedImageFile(null);
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
        
        <div className="form-group">
          <label htmlFor="iconSection">Agent Icon (Optional)</label>
          <div className="media-options">
            <div className="media-option">
              <input
                type="file"
                id="iconUpload"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    try {
                      // For preview only - actual upload happens when form is submitted
                      const iconUrl = URL.createObjectURL(e.target.files[0]);
                      console.log('Icon file selected:', e.target.files[0]);
                      setSelectedIconFile(e.target.files[0]); // Store file for upload
                      setFormData({
                        ...formData,
                        iconUrl: iconUrl,
                        _iconFile: e.target.files[0] // Store the file for later upload
                      });
                    } catch (error) {
                      console.error('Error creating object URL:', error);
                      // Fallback to placeholder if createObjectURL fails
                      setSelectedIconFile(null);
                      setFormData({
                        ...formData,
                        iconUrl: generatePlaceholderImage('icon', formData.name?.charAt(0) || 'A'),
                        _iconFile: null
                      });
                    }
                  }
                }}
              />
              <span className="field-help">Upload Icon from Computer<br />Supported formats: JPG, PNG, GIF. Max size: 5MB</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Pricing Section */}
      <div className="form-section" ref={pricingRef} id="pricing">
        <h3 className="form-section-heading"><FaDollarSign /> Pricing</h3>
        
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
                <div className={`price-input ${errors.basePrice ? 'has-error' : ''}`}>
                  <span className="currency-symbol">{getCurrencySymbol(priceData?.currency || 'USD')}</span>
                  <input
                    type="number"
                    id="basePrice"
                    name="basePrice"
                    value={priceData?.basePrice ?? 0}
                    onChange={handlePriceChange}
                    step="0.01"
                    min="0"
                  />
                </div>
                {errors.basePrice && <div className="error-message">{errors.basePrice}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="discountedPrice">Discounted Price</label>
                <div className="price-input">
                  <span className="currency-symbol">{getCurrencySymbol(priceData?.currency || 'USD')}</span>
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
      
      {/* Features & Tags Section */}
      <div className="form-section" ref={featuresRef} id="features">
        <h3 className="form-section-heading"><FaTools /> Features & Tags</h3>
        
        <div className="form-group">
          <label htmlFor="features">
            Features
            <span className="field-help">Comma-separated list of features</span>
          </label>
          <textarea
            id="features"
            value={Array.isArray(formData.features) ? formData.features.join(', ') : ''}
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
            value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
            onChange={(e) => handleArrayInput('tags', e.target.value)}
            placeholder="Education, Assistant, AI, Creative"
            rows="3"
          />
        </div>
      </div>
      
      {/* File Uploads Section - New Section */}
      <div className="form-section" ref={fileUploadsRef} id="file-uploads">
        <h3 className="form-section-heading"><FaFileUpload /> File Uploads</h3>
        
        <div className="form-group">
          <label htmlFor="jsonFileUpload">
            Agent JSON File
            <span className="field-help">Upload a JSON file with agent configuration or template</span>
          </label>
          <div className="file-upload-container">
            <input
              type="file"
              id="jsonFileUpload"
              accept=".json,application/json"
              onChange={handleJsonFileChange}
              className={errors.jsonFile ? 'error' : ''}
              style={{ display: jsonFileName ? 'none' : 'block' }}
            />
            
            {jsonFileName && (
              <div className="file-selected">
                <FaFileAlt className="file-icon" />
                <span className="file-name">{jsonFileName}</span>
                <button 
                  type="button" 
                  className="clear-file-btn"
                  onClick={clearJsonFile}
                >
                  ✕
                </button>
              </div>
            )}
            
            {errors.jsonFile && <div className="error-message">{errors.jsonFile}</div>}
          </div>
          <p className="file-upload-help">
            Supported format: JSON files only. This file will be downloadable by users who purchase or access this agent.
          </p>
          
          {/* Show existing file URL if available */}
          {formData.downloadUrl && !jsonFile && (
            <div className="existing-file">
              <p><strong>Current file:</strong> <a href={formData.downloadUrl} target="_blank" rel="noopener noreferrer">{formData.downloadUrl.split('/').pop() || 'View file'}</a></p>
              <p className="field-help">Upload a new file to replace the current one, or leave empty to keep it.</p>
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="templateUrl">Template URL (Optional)</label>
          <input
            type="text"
            id="templateUrl"
            name="templateUrl"
            value={formData.templateUrl}
            onChange={handleChange}
            placeholder="https://example.com/template.json"
          />
          <p className="field-help">
            External URL to a template file. Use this if you're not uploading a file directly.
          </p>
        </div>
        
        <div className="form-group">
          <label htmlFor="downloadUrl">Download URL (Optional)</label>
          <input
            type="text"
            id="downloadUrl"
            name="downloadUrl"
            value={formData.downloadUrl}
            onChange={handleChange}
            placeholder="https://example.com/download.json"
          />
          <p className="field-help">
            External URL for downloads. This will be used if no file is uploaded.
          </p>
        </div>
      </div>
      
      {/* Status & Visibility Section */}
      <div className="form-section" ref={statusRef} id="status">
        <h3 className="form-section-heading"><FaRegCheckCircle /> Status & Visibility</h3>
        
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
      
      {/* Back to top button */}
      <div className={`back-to-top ${showBackToTop ? 'visible' : ''}`} onClick={scrollToTop}>
        <FaArrowUp />
      </div>
    </form>
  );
};

export default AgentForm; 