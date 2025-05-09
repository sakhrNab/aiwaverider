/**
 * Simple agent validator schema
 */
const AgentSchema = {
  parse: (data) => {
    // This is a simplified version. In a real app, you might use zod or similar
    // For now, just return the same data to maintain API compatibility
    return data;
  }
};

export const parseAgent = (data) => {
  try {
    // Pre-process data to handle common issues
    const processedData = { ...data };
    
    // Ensure title exists (use name as fallback)
    if (!processedData.title && processedData.name) {
      processedData.title = processedData.name;
    } else if (!processedData.title) {
      processedData.title = 'Unnamed Agent';
    }
    
    // Convert features object to array if needed
    if (processedData.features && !Array.isArray(processedData.features)) {
      try {
        // If it's an object, try to convert to array of keys
        processedData.features = Object.keys(processedData.features);
      } catch (e) {
        // If conversion fails, set to empty array
        processedData.features = [];
      }
    }
    
    return AgentSchema.parse(processedData);
  } catch (error) {
    console.error('Agent validation error:', error);
    
    // Return a sanitized version of the data with defaults
    const safeData = {
      id: data.id || `agent-${Date.now()}`,
      title: data.title || data.name || 'Unnamed Agent',
      description: data.description || 'No description available',
      imageUrl: data.imageUrl || null,
      price: data.price || 'Price unavailable',
      creator: {
        name: data.creator?.name || 'Unknown Creator'
      },
      rating: {
        average: data.rating?.average || 0,
        count: data.rating?.count || 0
      },
      // Make sure features is an array
      features: Array.isArray(data.features) ? data.features : 
                (data.features ? Object.keys(data.features) : [])
    };
    
    return safeData;
  }
};

/**
 * Parse and validate an array of agents
 * @param {Array} agents - Array of agent data objects to process
 * @returns {Array} - Array of processed and validated agent objects
 */
export const parseAgents = (agents) => {
  // If agents is not an array or is empty, return empty array
  if (!agents || !Array.isArray(agents) || agents.length === 0) {
    return [];
  }
  
  // Process each agent through parseAgent
  return agents.map(agent => parseAgent(agent));
}; 