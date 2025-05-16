/**
 * Utility functions for handling images and image placeholders
 */

// URL cache to prevent redundant processing of the same URLs
const processedUrlCache = new Map();

/**
 * Fixes via.placeholder.com URLs by converting them to data URIs or placehold.co URLs
 * This ensures images still work even if via.placeholder.com is unavailable or blocked.
 * 
 * @param {string} url - The original URL that might be a via.placeholder.com URL
 * @returns {string} - A fixed URL that will work reliably, or the original URL
 */
export const fixPlaceholderUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  
  // Check in-memory cache first
  if (processedUrlCache.has(url)) {
    return processedUrlCache.get(url);
  }
  
  // Check localStorage cache
  try {
    const localStorageKey = `img_cache:${url}`;
    const cachedUrl = localStorage.getItem(localStorageKey);
    if (cachedUrl) {
      // Also update in-memory cache
      processedUrlCache.set(url, cachedUrl);
      return cachedUrl;
    }
  } catch (e) {
    // localStorage might be unavailable in some contexts
    console.warn('localStorage not available for image caching:', e);
  }
  
  try {
    // Only convert via.placeholder.com URLs
    if (url.includes('via.placeholder.com')) {
      // First, try to parse it as a standard via.placeholder URL
      let dimensions = '300x200';
      let bgColor = '3498db';
      let textColor = 'ffffff';
      let text = 'Image';
      
      // Parse URL parameters in various formats
      if (url.includes('?')) {
        // Extract query parameters
        const queryString = url.split('?')[1];
        const params = new URLSearchParams(queryString);
        
        if (params.get('text')) {
          text = params.get('text');
        }
      }
      
      // Extract path components - dimensions and colors
      try {
        const urlPath = url.split('?')[0];
        const pathParts = urlPath.split('/');
        
        // Look for dimensions in format: 300x200
        for (let part of pathParts) {
          if (/^\d+x\d+$/.test(part)) {
            dimensions = part;
            break;
          }
        }
        
        // Look for colors
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (/^[0-9a-f]{3,6}$/.test(pathParts[i]) && 
              /^[0-9a-f]{3,6}$/.test(pathParts[i+1])) {
            bgColor = pathParts[i];
            textColor = pathParts[i+1];
            break;
          }
        }
      } catch (parseError) {
        console.warn('Error parsing via.placeholder URL components:', parseError);
      }
      
      // Option 1: Create an SVG data URI (works offline, no network request)
      // Extract width and height from dimensions
      const [width, height] = dimensions.split('x').map(Number);
      
      // Ensure text is properly encoded for SVG
      const encodedText = encodeURIComponent(text);
      
      const dataUri = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Crect width='${width}' height='${height}' fill='%23${bgColor}'/%3E%3Ctext x='${width/2}' y='${height/2}' font-family='Arial' font-size='16' text-anchor='middle' dominant-baseline='middle' fill='%23${textColor}'%3E${encodedText}%3C/text%3E%3C/svg%3E`;
      
      // Cache the result in memory
      processedUrlCache.set(url, dataUri);
      
      // Cache in localStorage
      try {
        const localStorageKey = `img_cache:${url}`;
        localStorage.setItem(localStorageKey, dataUri);
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
      
      return dataUri;
      
      // Option 2: Return placehold.co fallback (requires network)
      // return `https://placehold.co/${dimensions}/${bgColor}/${textColor}?text=${encodeURIComponent(text)}`;
    }
    
    // Cache the original URL too (in memory)
    processedUrlCache.set(url, url);
    
    // Don't cache original URLs in localStorage to save space
    // We mainly want to cache the generated SVGs
    
    return url;
  } catch (error) {
    console.error('Error converting placeholder URL:', error);
    
    // Last resort fallback - create a default SVG data URI
    const encodedText = encodeURIComponent('Image');
    const fallbackUri = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200' viewBox='0 0 300 200'%3E%3Crect width='300' height='200' fill='%233498db'/%3E%3Ctext x='150' y='100' font-family='Arial' font-size='16' text-anchor='middle' dominant-baseline='middle' fill='%23ffffff'%3E${encodedText}%3C/text%3E%3C/svg%3E`;
    
    // Cache the fallback in memory
    processedUrlCache.set(url, fallbackUri);
    
    // Cache in localStorage
    try {
      const localStorageKey = `img_cache:${url}`;
      localStorage.setItem(localStorageKey, fallbackUri);
    } catch (e) {
      console.warn('Failed to save fallback to localStorage:', e);
    }
    
    return fallbackUri;
  }
};

/**
 * Generates a placeholder image URL using placehold.co
 * 
 * @param {object} options - Options for generating the placeholder
 * @param {string} options.text - Text to display in the placeholder
 * @param {string} options.width - Width of the placeholder
 * @param {string} options.height - Height of the placeholder
 * @param {string} options.bgColor - Background color hex (without #)
 * @param {string} options.textColor - Text color hex (without #)
 * @returns {string} - The generated placeholder URL
 */
export const generatePlaceholderImage = ({
  text = 'Image',
  width = 300,
  height = 200,
  bgColor = '3498db',
  textColor = 'ffffff'
} = {}) => {
  return `https://placehold.co/${width}x${height}/${bgColor}/${textColor}?text=${encodeURIComponent(text)}`;
};

/**
 * Generates a placeholder image specifically for agents
 * 
 * @param {string} category - The agent category
 * @param {string} name - The agent name
 * @param {number} index - Optional index for the agent
 * @returns {string} - The generated placeholder URL
 */
export const generateAgentPlaceholder = (category = 'AI', name = '', index = '') => {
  const displayText = category && name 
    ? `${category} - ${name}${index ? ' ' + index : ''}`
    : category 
      ? `${category} Agent${index ? ' ' + index : ''}`
      : `Agent${index ? ' ' + index : ''}`;
      
  return generatePlaceholderImage({
    text: displayText,
    width: 300,
    height: 200,
    bgColor: '3498db'
  });
};

/**
 * Generates a placeholder image for an agent icon
 * 
 * @param {string} name - The agent name
 * @returns {string} - The generated placeholder URL
 */
export const generateAgentIconPlaceholder = (name = 'AI') => {
  // Get the first letter of the name or use 'A'
  const initial = name && name.length > 0 ? name.charAt(0).toUpperCase() : 'A';
  
  return generatePlaceholderImage({
    text: initial,
    width: 200,
    height: 200,
    bgColor: '3498db'
  });
};

/**
 * General function to create an SVG-based text icon as a data URI
 * This is useful when you want to avoid network requests entirely
 * 
 * @param {object} options - Options for generating the SVG
 * @param {string} options.text - Text to display (usually initials)
 * @param {number} options.width - Width of the SVG
 * @param {number} options.height - Height of the SVG
 * @param {string} options.bgColor - Background color hex (without #)
 * @param {string} options.textColor - Text color hex (without #)
 * @param {number} options.fontSize - Font size in pixels
 * @returns {string} - Data URI with the SVG
 */
export const createSvgDataUri = ({
  text = 'A',
  width = 100,
  height = 100,
  bgColor = '4a69bd',
  textColor = 'ffffff',
  fontSize = 40
} = {}) => {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Crect width='${width}' height='${height}' fill='%23${bgColor}'/%3E%3Ctext x='${width/2}' y='${height/2 + fontSize/3}' font-family='Arial' font-size='${fontSize}' font-weight='bold' text-anchor='middle' fill='%23${textColor}'%3E${text}%3C/text%3E%3C/svg%3E`;
};

/**
 * Handle Google profile image URLs that might face rate limiting (429 errors)
 * @param {string} url - The Google image URL
 * @return {string} - Either the cached URL or a fallback avatar
 */
export const handleGoogleProfileImage = (url) => {
  if (!url) return generatePlaceholderImage({ text: 'User' });
  
  // Check if it's a Google user content URL
  if (url.includes('googleusercontent.com')) {
    // For Google images that might be rate-limited, provide a fallback
    // We could store these in localStorage for better caching, but for now just return a fallback
    try {
      // You could implement localStorage caching here if needed
      // For now, just generate a consistent avatar based on the URL
      const uniqueId = url.split('/').pop().substring(0, 8);
      return generatePlaceholderImage({ 
        text: uniqueId.substring(0, 2).toUpperCase(),
        bgColor: hashStringToColor(uniqueId),
        width: 96,
        height: 96 
      });
    } catch (err) {
      console.error('Error handling Google image:', err);
      return generatePlaceholderImage({ text: 'User' });
    }
  }
  
  return url;
};

/**
 * Generate a consistent color from a string
 * @param {string} str - Input string
 * @return {string} - Hex color
 */
export const hashStringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).slice(-2);
  }
  
  return color;
}; 