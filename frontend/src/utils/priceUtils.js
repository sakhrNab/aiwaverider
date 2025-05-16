/**
 * Format a price consistently for display
 * @param {any} price - The price to format (can be number, string, or price object)
 * @returns {string} - Formatted price string
 */
export const formatPrice = (price) => {
  // Handle null, undefined or empty cases
  if (price === null || price === undefined || price === '') {
    return 'Free';
  }

  // Handle free prices
  if (price === 0 || price === '0' || price === 'Free' || price === 'free' || price === '$0') {
    return 'Free';
  }

  // Handle price objects with priceDetails
  if (price && typeof price === 'object') {
    // Check for priceDetails wrapper - prioritize this
    if (price.priceDetails) {
      const details = price.priceDetails;
      
      // Check if agent is marked as free
      if (details.isFree) {
        return 'Free';
      }
      
      const currencySymbol = details.currency === 'EUR' ? '€' : 
                            details.currency === 'GBP' ? '£' : '$';
      
      // If there's a discount, show the discounted price
      if (details.discountedPrice !== undefined && 
          details.basePrice !== undefined && 
          details.discountedPrice < details.basePrice) {
        return `${currencySymbol}${details.discountedPrice.toFixed(2)}`;
      }
      
      if (details.basePrice !== undefined) {
        return details.basePrice === 0 ? 'Free' : `${currencySymbol}${details.basePrice.toFixed(2)}`;
      }
      
      // If basePrice is undefined but discountedPrice exists
      if (details.discountedPrice !== undefined) {
        return details.discountedPrice === 0 ? 'Free' : `${currencySymbol}${details.discountedPrice.toFixed(2)}`;
      }
    }
    
    // Fallback to base price properties (legacy support)
    if (price.basePrice !== undefined) {
      const currencySymbol = price.currency === 'EUR' ? '€' : 
                           price.currency === 'GBP' ? '£' : '$';
      
      if (price.basePrice === 0 || price.isFree) return 'Free';
      
      // If there's a discount, show the discounted price
      if (price.discountedPrice !== undefined && price.discountedPrice < price.basePrice) {
        return `${currencySymbol}${price.discountedPrice.toFixed(2)}`;
      }
      
      return `${currencySymbol}${price.basePrice.toFixed(2)}`;
    }
    
    // If none of the above, check for price property
    if (price.price !== undefined) {
      const priceValue = parseFloat(price.price);
      if (isNaN(priceValue) || priceValue === 0) return 'Free';
      return `$${priceValue.toFixed(2)}`;
    }
    
    // If it's an object but doesn't have expected format, try to find any number property
    for (const key in price) {
      if (typeof price[key] === 'number') {
        const value = price[key];
        return value === 0 ? 'Free' : `$${value.toFixed(2)}`;
      }
    }
  }

  // Handle string prices
  if (typeof price === 'string') {
    if (price.toLowerCase() === 'free') {
      return 'Free';
    }
    
    // Return as is if it already has a currency symbol
    if (price.startsWith('$') || price.startsWith('€') || price.startsWith('£')) {
      return price;
    }
    
    // Try to parse the string as a number
    const parsedPrice = parseFloat(price.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsedPrice)) {
      return parsedPrice === 0 ? 'Free' : `$${parsedPrice.toFixed(2)}`;
    }
    
    // Otherwise, add $ symbol
    return `$${price}`;
  }

  // Handle numeric prices
  if (typeof price === 'number') {
    return price === 0 ? 'Free' : `$${price.toFixed(2)}`;
  }

  // Default fallback - use 'Price unavailable' to be transparent
  return 'Price unavailable';
}; 