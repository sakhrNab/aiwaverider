/**
 * Banking Services - Utilities for IBAN validation and BIC lookup
 * 
 * This module provides utilities for working with bank account information:
 * - IBAN validation
 * - BIC code lookup from IBAN
 * - Country-specific bank code extraction
 */

/**
 * Validates an IBAN (International Bank Account Number)
 * 
 * @param {string} iban - The IBAN to validate
 * @returns {Object} Result object with isValid flag and reason if invalid
 */
export const validateIban = (iban) => {
  // Remove spaces and convert to uppercase
  iban = iban.replace(/\s+/g, '').toUpperCase();
  
  // Basic structure validation
  if (!/^[A-Z]{2}[0-9A-Z]{2,}$/.test(iban)) {
    return { isValid: false, reason: 'Invalid IBAN format' };
  }
  
  // Check country-specific length
  const countryLengths = {
    'AT': 20, 'BE': 16, 'BG': 22, 'CH': 21, 'CY': 28, 'CZ': 24, 
    'DE': 22, 'DK': 18, 'EE': 20, 'ES': 24, 'FI': 18, 'FR': 27, 
    'GB': 22, 'GI': 23, 'GR': 27, 'HR': 21, 'HU': 28, 'IE': 22, 
    'IT': 27, 'LI': 21, 'LT': 20, 'LU': 20, 'LV': 21, 'MC': 27,
    'MT': 31, 'NL': 18, 'PL': 28, 'PT': 25, 'RO': 24, 'SE': 24, 
    'SI': 19, 'SK': 24
  };
  
  const countryCode = iban.substring(0, 2);
  const expectedLength = countryLengths[countryCode];
  
  if (expectedLength && iban.length !== expectedLength) {
    return { 
      isValid: false, 
      reason: `IBAN for ${countryCode} should be ${expectedLength} characters` 
    };
  }
  
  // MOD-97 checksum validation (the mathematical IBAN validation)
  // Move the first four characters to the end
  const rearranged = iban.substring(4) + iban.substring(0, 4);
  
  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numeric = '';
  for (let i = 0; i < rearranged.length; i++) {
    const char = rearranged.charAt(i);
    if (/[0-9]/.test(char)) {
      numeric += char;
    } else {
      numeric += (char.charCodeAt(0) - 55); // A is ASCII 65, so A-55 = 10
    }
  }
  
  // Calculate mod 97
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric.charAt(i), 10)) % 97;
  }
  
  // IBAN is valid if remainder is 1
  return { 
    isValid: remainder === 1,
    reason: remainder !== 1 ? 'IBAN checksum is invalid' : null
  };
};

/**
 * Extract bank identifier from IBAN based on country-specific rules
 * 
 * @param {string} iban - The validated IBAN
 * @returns {Object|null} Object with country code and bank identifier or null if extraction fails
 */
export const extractBankIdentifier = (iban) => {
  if (!iban || iban.length < 6) return null;
  
  // Remove spaces and convert to uppercase
  iban = iban.replace(/\s+/g, '').toUpperCase();
  
  // Extract country code
  const countryCode = iban.substring(0, 2);
  let bankIdentifier;
  
  switch (countryCode) {
    case 'DE': // Germany
      bankIdentifier = iban.substring(4, 12); // Bankleitzahl
      break;
    case 'FR': // France
      bankIdentifier = iban.substring(4, 9); // Code Banque
      break;
    case 'GB': // United Kingdom
      bankIdentifier = iban.substring(4, 10); // Sort Code + Account prefix
      break;
    case 'ES': // Spain
      bankIdentifier = iban.substring(4, 8); // Entidad
      break;
    case 'IT': // Italy
      bankIdentifier = iban.substring(5, 10); // ABI + CAB
      break;
    case 'NL': // Netherlands
      bankIdentifier = iban.substring(4, 8); // Bank code
      break;
    case 'BE': // Belgium
      bankIdentifier = iban.substring(4, 7); // Bank code
      break;
    case 'AT': // Austria
      bankIdentifier = iban.substring(4, 9); // Bank code
      break;
    case 'PT': // Portugal
      bankIdentifier = iban.substring(4, 8); // Bank code
      break;
    case 'FI': // Finland
      bankIdentifier = iban.substring(4, 7); // Bank code
      break;
    case 'IE': // Ireland
      bankIdentifier = iban.substring(4, 8); // Bank code
      break;
    default:
      // For other countries, use a generic approach or return null
      return null;
  }
  
  if (!bankIdentifier) return null;
  
  return { countryCode, bankIdentifier };
};

/**
 * Get BIC from IBAN using official BIC API service
 * 
 * This implementation uses the OpenIBAN API service (https://openiban.com) for accurate BIC lookup.
 * If API is unavailable, falls back to a pattern-based approach or indicates manual entry is required.
 * 
 * @param {string} iban - The validated IBAN
 * @returns {Promise<Object>} Promise resolving to object with:
 *   - bic: The BIC code if found, null otherwise
 *   - requiresManualEntry: Boolean indicating if manual BIC entry is required
 *   - error: Error message to display to the user if applicable
 *   - bankName: Name of the bank if available (from OpenIBAN)
 *   - isGenerated: Boolean indicating if BIC was generated as a fallback
 */
export const getBicFromIban = async (iban) => {
  if (!iban || iban.length < 6) return { bic: null, requiresManualEntry: false, error: null };
  
  // Remove spaces and convert to uppercase
  iban = iban.replace(/\s+/g, '').toUpperCase();
  
  try {
    console.log(`Using OpenIBAN service to look up BIC code for IBAN: ${iban}`);
    
    // Use the OpenIBAN API which is free and doesn't require API keys
    const openIbanUrl = `https://openiban.com/validate/${iban}?getBIC=true&validateBankCode=true`;
    
    try {
      const response = await fetch(openIbanUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`OpenIBAN API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.valid && data.bankData && data.bankData.bic) {
        console.log(`Successfully retrieved BIC: ${data.bankData.bic} for IBAN: ${iban}`);
        console.log(`Bank: ${data.bankData.name}`);
        return { 
          bic: data.bankData.bic, 
          requiresManualEntry: false, 
          error: null,
          bankName: data.bankData.name || null
        };
      } else {
        console.warn(`BIC not found for IBAN: ${iban}`, data);
        // BIC wasn't found in the API, suggest manual entry
        return { 
          bic: null, 
          requiresManualEntry: true, 
          error: 'BIC not found for this IBAN. Please enter it manually.' 
        };
      }
    } catch (apiError) {
      console.error('Error calling OpenIBAN API:', apiError);
      // OpenIBAN API failed, suggest manual entry
      return { 
        bic: null, 
        requiresManualEntry: true, 
        error: 'BIC lookup service unavailable. Please enter BIC manually.' 
      };
    }
    
    // If the OpenIBAN API failed, try to extract bank identifier and search with custom API
    // (Only as a backup if the free OpenIBAN service is down or has CORS issues)
    const extractedData = extractBankIdentifier(iban);
    if (!extractedData) {
      console.warn(`Could not extract bank identifier from IBAN: ${iban}`);
      return { 
        bic: null, 
        requiresManualEntry: true, 
        error: 'Could not determine BIC from IBAN. Please enter it manually.' 
      };
    }
    
    const { countryCode, bankIdentifier } = extractedData;
    
    // Try to use the BIC API service as fallback if credentials are available
    const apiUrl = import.meta.env.VITE_BIC_API_URL;
    const apiKey = import.meta.env.VITE_BIC_API_KEY;
    
    if (apiUrl && apiKey) {
      console.log(`Falling back to secondary BIC API service for bank identifier: ${bankIdentifier}`);
      
      try {
        const response = await fetch(`${apiUrl}?api_key=${apiKey}&country=${countryCode}&identifier=${bankIdentifier}&format=json`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`BIC API returned status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.bic) {
          console.log(`Successfully retrieved BIC: ${data.bic} for bank identifier: ${bankIdentifier}`);
          return { 
            bic: data.bic, 
            requiresManualEntry: false, 
            error: null 
          };
        } else {
          console.warn(`BIC not found for bank identifier: ${bankIdentifier}`, data);
          return { 
            bic: null, 
            requiresManualEntry: true, 
            error: 'BIC not found. Please enter it manually.' 
          };
        }
      } catch (fallbackApiError) {
        console.error('Error calling fallback BIC API:', fallbackApiError);
        return { 
          bic: null, 
          requiresManualEntry: true, 
          error: 'BIC lookup services unavailable. Please enter BIC manually.' 
        };
      }
    }
    
    // Last resort fallback to basic pattern-based approach
    console.warn('All BIC lookup services failed. Using pattern-based fallback approach.');
    const fallbackBic = buildFallbackBic(countryCode, bankIdentifier);
    
    return { 
      bic: fallbackBic, 
      requiresManualEntry: true, 
      error: 'BIC lookup services unavailable. Generated a possible BIC but please verify or enter manually.',
      isGenerated: true
    };
    
  } catch (error) {
    console.error('Error in BIC lookup:', error);
    return { 
      bic: null, 
      requiresManualEntry: true, 
      error: 'Error looking up BIC. Please enter it manually.' 
    };
  }
};

/**
 * Builds a fallback BIC code pattern when API lookup is unavailable
 * 
 * WARNING: These are NOT official BIC codes and should only be used
 * when an official BIC lookup service is unavailable
 * 
 * @param {string} countryCode - The country code from IBAN
 * @param {string} bankIdentifier - The extracted bank identifier
 * @returns {string|null} A BIC-like code using pattern rules or null
 */
const buildFallbackBic = (countryCode, bankIdentifier) => {
  if (!bankIdentifier || bankIdentifier.length < 4) return null;
  
  // Create a simple BIC-like code based on bank code and country
  // This is just a basic pattern and won't return official BIC codes
  const firstFour = bankIdentifier.substring(0, 4);
  return `${firstFour}${countryCode}`;
};

export default {
  validateIban,
  getBicFromIban,
  extractBankIdentifier
}; 