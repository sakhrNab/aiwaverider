import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  FaImage, 
  FaDollarSign, 
  FaTags, 
  FaInfoCircle, 
  FaSave, 
  FaRegCheckCircle,
  FaFeatherAlt,
  FaTools,
  FaArrowUp,
  FaChevronRight,
  FaFileUpload,
  FaFileAlt
} from 'react-icons/fa';
import { getAgentPrice, updateAgentPrice } from '../../services/priceService';
import { AuthContext } from '../../contexts/AuthContext';
import './AgentForm.css';
import { toast } from 'react-hot-toast';
import firebase from 'firebase/compat/app';
import 'firebase/compat/storage';
import { createAgent, updateAgent } from '../../utils/api';

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
    features: [''],
    tags: [''],
    isFeatured: false,
    isVerified: false,
    isPopular: false,
    isTrending: false,
    status: 'active',
    templateUrl: '',  // Add default for template URL
    downloadUrl: '',  // Add default for download URL
    // Add other default fields as needed
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
    console.log("Initial useState for formData, agent:", agent);
    
    if (!agent) {
      // For new agents, use current user info for creator
      return { ...defaultFormData };
    }
    
    // Start with the agent object itself
    let combinedAgent = { ...agent };
    console.log("Using agent data for initialization:", combinedAgent);
    
    // First, parse the data field if it's a JSON string
    let parsedOuterData = {};
    if (agent.data && typeof agent.data === 'string') {
      try {
        parsedOuterData = JSON.parse(agent.data);
        console.log("Successfully parsed outer data field (init):", parsedOuterData);
        // Merge the parsed data into our combined data
        combinedAgent = { ...combinedAgent, ...parsedOuterData };
      } catch (e) {
        console.error("Error parsing agent.data (init):", e);
      }
    } else if (agent.data && typeof agent.data === 'object') {
      // The data is already an object, merge it
      combinedAgent = { ...combinedAgent, ...agent.data };
    }
    
    // Next, check if there's a nested data property inside the parsed data
    if (parsedOuterData.data && typeof parsedOuterData.data === 'string') {
      try {
        const parsedInnerData = JSON.parse(parsedOuterData.data);
        console.log("Successfully parsed nested inner data field (init):", parsedInnerData);
        // Merge the inner parsed data, giving it highest priority
        combinedAgent = { ...combinedAgent, ...parsedInnerData };
      } catch (e) {
        console.error("Error parsing nested inner data (init):", e);
      }
    } else if (parsedOuterData.data && typeof parsedOuterData.data === 'object') {
      // The nested data is already an object, merge it
      combinedAgent = { ...combinedAgent, ...parsedOuterData.data };
    }
    
    // Get image URLs from various possible locations
    const imageUrl = 
      combinedAgent.imageUrl || 
      (agent.image && agent.image.url) || 
      (parsedOuterData.image && parsedOuterData.image.url) || 
      '';
      
    const iconUrl = 
      combinedAgent.iconUrl || 
      (agent.icon && agent.icon.url) || 
      (parsedOuterData.icon && parsedOuterData.icon.url) || 
      '';
    
    // Helper functions for safe image handling
    const safeImageUrl = (url) => {
      // If it's a blob URL, empty string, or not valid (including example.com), use a placeholder
      if (!url || isBlobUrl(url) || !isValidImageUrl(url)) {
        return generatePlaceholderImage('image', combinedAgent.name?.charAt(0) || 'A');
      }
      return url;
    };
    
    const safeIconUrl = (url) => {
      // If it's a blob URL, empty string, or not valid (including example.com), use a placeholder
      if (!url || isBlobUrl(url) || !isValidImageUrl(url)) {
        return generatePlaceholderImage('icon', combinedAgent.name?.charAt(0) || 'A');
      }
      return url;
    };
    
    // Important: Log each field to debug what's happening
    console.log("Agent fields being used for initialization (combined):");
    console.log("- name:", combinedAgent.name);
    console.log("- title:", combinedAgent.title);
    console.log("- description:", combinedAgent.description);
    console.log("- category:", combinedAgent.category);
    console.log("- imageUrl:", imageUrl);
    console.log("- iconUrl:", iconUrl);
    console.log("- features:", combinedAgent.features);
    
    return {
      ...defaultFormData,
      ...combinedAgent,
      // Ensure these fields are always defined
      id: combinedAgent.id || '',
      name: combinedAgent.name || '',
      title: combinedAgent.title || '',
      description: combinedAgent.description || '',
      category: combinedAgent.category || '',
      // Use combined image URLs
      imageUrl: safeImageUrl(imageUrl),
      iconUrl: safeIconUrl(iconUrl),
      version: combinedAgent.version || '',
      templateUrl: combinedAgent.templateUrl || '',
      downloadUrl: combinedAgent.downloadUrl || '',
      fileUrl: combinedAgent.fileUrl || '',
      creator: {
        ...defaultFormData.creator,
        ...(combinedAgent.creator || {}),
        name: combinedAgent.creator?.name || defaultFormData.creator.name,
        email: combinedAgent.creator?.email || defaultFormData.creator.email,
        username: combinedAgent.creator?.username || defaultFormData.creator.username,
        role: combinedAgent.creator?.role || defaultFormData.creator.role,
        id: combinedAgent.creator?.id || defaultFormData.creator.id
      },
      features: Array.isArray(combinedAgent.features) && combinedAgent.features.length > 0 ? combinedAgent.features : [''],
      tags: Array.isArray(combinedAgent.tags) && combinedAgent.tags.length > 0 ? combinedAgent.tags : [''],
      isFree: combinedAgent.isFree ?? false,
      isSubscription: combinedAgent.isSubscription ?? false,
      isFeatured: combinedAgent.isFeatured ?? false,
      isVerified: combinedAgent.isVerified ?? false,
      isPopular: combinedAgent.isPopular ?? false,
      isTrending: combinedAgent.isTrending ?? false,
      status: combinedAgent.status || 'active',
      basePrice: combinedAgent.basePrice || combinedAgent.priceDetails?.basePrice || 0,
      discountedPrice: combinedAgent.discountedPrice || combinedAgent.priceDetails?.discountedPrice || 0,
      currency: combinedAgent.currency || combinedAgent.priceDetails?.currency || 'USD'
    };
  });
  
  // Track original values to detect actual changes
  const [originalData, setOriginalData] = useState({});
  
  // State for image and icon previews
  const [imagePreview, setImagePreview] = useState('');
  const [iconPreview, setIconPreview] = useState('');
  
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
  
  // Use effect to synchronize form data when agent prop changes
  useEffect(() => {
    // Only run if agent exists and has changed
    if (agent) {
      console.log('Agent prop changed, syncing form data:', agent);
      
      // Start with the agent object itself
      let combinedData = { ...agent };
      
      // First, check if there's a data property that needs parsing
      let parsedOuterData = {};
      if (agent.data && typeof agent.data === 'string') {
        try {
          parsedOuterData = JSON.parse(agent.data);
          console.log("Successfully parsed outer data field:", parsedOuterData);
          // Merge the parsed data into our combined data
          combinedData = { ...combinedData, ...parsedOuterData };
        } catch (e) {
          console.error("Error parsing agent.data:", e);
        }
      } else if (agent.data && typeof agent.data === 'object') {
        // The data is already an object, merge it
        combinedData = { ...combinedData, ...agent.data };
      }
      
      // Next, check if there's a nested data property inside the parsed data
      if (parsedOuterData.data && typeof parsedOuterData.data === 'string') {
        try {
          const parsedInnerData = JSON.parse(parsedOuterData.data);
          console.log("Successfully parsed nested inner data field:", parsedInnerData);
          // Merge the inner parsed data, giving it highest priority
          combinedData = { ...combinedData, ...parsedInnerData };
        } catch (e) {
          console.error("Error parsing nested inner data:", e);
        }
      } else if (parsedOuterData.data && typeof parsedOuterData.data === 'object') {
        // The nested data is already an object, merge it
        combinedData = { ...combinedData, ...parsedOuterData.data };
      }
      
      // Look for image URLs in various locations
      const imageUrl = 
        combinedData.imageUrl || 
        (agent.image && agent.image.url) || 
        (parsedOuterData.image && parsedOuterData.image.url) || 
        '';
        
      const iconUrl = 
        combinedData.iconUrl || 
        (agent.icon && agent.icon.url) || 
        (parsedOuterData.icon && parsedOuterData.icon.url) || 
        '';
      
      // Log what we found after all parsing
      console.log("Final combined data for form:", combinedData);
      console.log("- title:", combinedData.title);
      console.log("- description:", combinedData.description);
      
      // Update form data directly with the combined data
      setFormData(prevData => {
        const updatedData = {
          ...prevData, // Keep default structure
          // Apply the combined data
          ...combinedData,
          // Ensure required fields are defined
          id: combinedData.id || prevData.id || '',
          name: combinedData.name || prevData.name || '',
          title: combinedData.title || prevData.title || '',
          description: combinedData.description || prevData.description || '',
          category: combinedData.category || prevData.category || '',
          // Use combined image URLs
          imageUrl: imageUrl || prevData.imageUrl,
          iconUrl: iconUrl || prevData.iconUrl,
          // Handle arrays
          features: Array.isArray(combinedData.features) && combinedData.features.length > 0 
            ? combinedData.features 
            : prevData.features || [''],
          tags: Array.isArray(combinedData.tags) && combinedData.tags.length > 0 
            ? combinedData.tags 
            : prevData.tags || [''],
          // Price data
          basePrice: combinedData.basePrice || combinedData.priceDetails?.basePrice || prevData.basePrice || 0,
          discountedPrice: combinedData.discountedPrice || combinedData.priceDetails?.discountedPrice || prevData.discountedPrice || 0,
          currency: combinedData.currency || combinedData.priceDetails?.currency || prevData.currency || 'USD',
          isFree: combinedData.isFree ?? (combinedData.priceDetails?.isFree) ?? prevData.isFree ?? false,
        };
        
        console.log('Form data updated:', updatedData);
        return updatedData;
      });
      
      // Also update price data directly from combined data
      const priceData = {
        basePrice: combinedData.basePrice || combinedData.priceDetails?.basePrice || 0,
        discountedPrice: combinedData.discountedPrice || combinedData.priceDetails?.discountedPrice || 0,
        currency: combinedData.currency || combinedData.priceDetails?.currency || 'USD',
        isFree: combinedData.isFree ?? combinedData.priceDetails?.isFree ?? false,
        isSubscription: combinedData.isSubscription ?? combinedData.priceDetails?.isSubscription ?? false
      };
      
      setPriceData(priceData);
      console.log('Price data updated:', priceData);
    }
  }, [agent]); // Only depend on agent
  
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
    
    // Add console logging to help diagnose issues
    console.log('Form submission starting with agent:', agent);
    console.log('Current form data:', formData);
    console.log('Current price data:', priceData);
    
    if (!formData.name) {
      toast.error('Agent name is required');
      return;
    }
    
    setIsSaving(true);
    
    try {
      console.log('Starting form submission with data:', formData);
      
      // Create a clean clone without runtime-only properties
      const finalFormData = { ...formData };
      
      // Define which properties should be removed before submission
      const runtimeProperties = ['isSubmitting', 'errors', 'originalAgentData'];
      
      // Remove runtime-only properties
      runtimeProperties.forEach(prop => {
        if (finalFormData[prop] !== undefined) {
          delete finalFormData[prop];
        }
      });
      
      // Ensure all required arrays are properly initialized
      finalFormData.features = finalFormData.features || [''];
      finalFormData.tags = finalFormData.tags || [''];
      
      // Filter out empty feature and tag entries
      finalFormData.features = finalFormData.features.filter(feature => feature.trim() !== '');
      finalFormData.tags = finalFormData.tags.filter(tag => tag.trim() !== '');
      
      // Ensure we have the creator info
      finalFormData.creator = {
        name: finalFormData.creator?.name || 'Unknown',
        id: finalFormData.creator?.id || user?.uid || 'unknown',
        imageUrl: finalFormData.creator?.imageUrl || '',
        ...finalFormData.creator
      };
      
      // Add pricing details
      finalFormData.basePrice = priceData.basePrice;
      finalFormData.discountedPrice = priceData.discountedPrice;
      finalFormData.currency = priceData.currency;
      finalFormData.isFree = priceData.isFree;
      finalFormData.isSubscription = priceData.isSubscription;
      
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
      
      // Add jsonFile to finalFormData directly for the API to handle
      if (jsonFile) {
        console.log('Adding JSON file to form data');
        finalFormData.jsonFile = jsonFile;
        finalFormData.jsonFileName = jsonFileName || jsonFile.name;
        
        // No need to upload here - will be handled by the API
        /* 
        console.log('Uploading JSON file');
        const jsonUrl = await uploadJsonFile(jsonFile, jsonFileName || `${finalFormData.name.toLowerCase().replace(/\s+/g, '-')}.json`);
        finalFormData.jsonFileUrl = jsonUrl;
        */
      }
      
      console.log('Submitting final form data:', finalFormData);
      
      // Handle create or update
      if (formData.id) {
        // Update existing agent
        await updateAgent(formData.id, finalFormData);
        toast.success('Agent updated successfully');
      } else {
        // Create new agent
        await createAgent(finalFormData);
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