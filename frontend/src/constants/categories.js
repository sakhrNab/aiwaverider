// src/constants/categories.js

// Define the categories array once to ensure consistency
const VALID_CATEGORIES = [
  // General categories
  'Trends',
  'Latest Tech',
  'AI Tools',
  'Tutorials',
  'News',
  
  // Specific technology categories
  'Quantum Computing',
  'AI',
  'Text to Image',
  'Image to Video',
  'Text to Video',
  'Text to Sound',
  'Text to Song',
  'Speech to Song',
  'Editing Tools',
  'VR',
  'Health',
  'Finance',
  'Automation',
  'VR and AG'
];

// Export the same array for both CATEGORIES and INTEREST_CATEGORIES
export const CATEGORIES = [...VALID_CATEGORIES];
export const INTEREST_CATEGORIES = [...VALID_CATEGORIES];
