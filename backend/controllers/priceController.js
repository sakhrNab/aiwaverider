/**
 * Price Controller
 * 
 * Handles all operations related to agent pricing, including:
 * - Retrieving price information
 * - Setting and updating prices
 * - Applying discounts
 * - Tracking price history
 */

const { db } = require('../config/firebase');
const { 
  validatePrice, 
  createPriceHistoryEntry, 
  isDiscountValid,
  calculateFinalPrice 
} = require('../models/priceModel');

// Collection references
const pricesCollection = db.collection('prices');
const agentsCollection = db.collection('agents');

/**
 * Get the price details for a specific agent
 */
const getPriceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, check if the agent exists
    const agentDoc = await agentsCollection.doc(id).get();
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Now fetch the price document
    const priceDoc = await pricesCollection.doc(id).get();
    
    // If price doesn't exist, check if agent has legacy price info
    if (!priceDoc.exists) {
      const agentData = agentDoc.data();
      
      // Check for legacy pricing (priceDetails or direct price field)
      if (agentData.priceDetails) {
        // Convert from legacy format to new price model
        const legacyPrice = {
          agentId: id,
          basePrice: agentData.priceDetails.basePrice || 0,
          finalPrice: agentData.priceDetails.discountedPrice || agentData.priceDetails.basePrice || 0,
          currency: agentData.priceDetails.currency || 'USD',
          isFree: agentData.isFree || false,
          isSubscription: agentData.isSubscription || false,
          updatedAt: new Date().toISOString()
        };
        
        return res.status(200).json(legacyPrice);
      } else if (typeof agentData.price !== 'undefined') {
        // Even more legacy format with direct price field
        const price = agentData.price;
        const isFree = price === 0 || price === '0' || price === 'Free';
        const isSubscription = typeof price === 'string' && price.includes('/month');
        
        // Parse price value if it's a string
        let numericPrice = 0;
        if (typeof price === 'string') {
          const match = price.match(/\$?(\d+(\.\d+)?)/);
          if (match) {
            numericPrice = parseFloat(match[1]);
          }
        } else if (typeof price === 'number') {
          numericPrice = price;
        }
        
        const legacyPrice = {
          agentId: id,
          basePrice: numericPrice,
          finalPrice: numericPrice,
          currency: 'USD',
          isFree,
          isSubscription,
          updatedAt: agentData.updatedAt || new Date().toISOString()
        };
        
        return res.status(200).json(legacyPrice);
      }
      
      // No price found at all
      return res.status(404).json({ error: 'Price not found for this agent' });
    }
    
    // Return the price data
    const priceData = {
      id: priceDoc.id,
      ...priceDoc.data()
    };
    
    // Check if discount is still valid, update finalPrice if needed
    if (priceData.discount && !isDiscountValid(priceData.discount)) {
      priceData.finalPrice = priceData.basePrice;
    }
    
    return res.status(200).json(priceData);
  } catch (error) {
    console.error('Error getting price:', error);
    return res.status(500).json({ error: 'Failed to get price details' });
  }
};

/**
 * Set or update the price for an agent
 */
const updatePrice = async (req, res) => {
  try {
    const { id } = req.params;
    const priceData = req.body;
    
    // Check if agent exists
    const agentDoc = await agentsCollection.doc(id).get();
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Check if price already exists
    const priceDoc = await pricesCollection.doc(id).get();
    let existingPrice = null;
    
    if (priceDoc.exists) {
      existingPrice = priceDoc.data();
    }
    
    // Prepare the price data with the agent ID
    const newPriceData = {
      ...priceData,
      agentId: id
    };
    
    // Validate the price data
    const validPrice = validatePrice(newPriceData);
    
    // If price exists, add to history
    if (existingPrice && existingPrice.basePrice !== validPrice.basePrice) {
      const historyEntry = createPriceHistoryEntry(
        existingPrice.basePrice,
        validPrice.basePrice,
        existingPrice.currency,
        priceData.reason || 'Price update'
      );
      
      if (!validPrice.priceHistory) {
        validPrice.priceHistory = [];
      }
      
      validPrice.priceHistory.push(historyEntry);
    }
    
    // Save the price
    await pricesCollection.doc(id).set(validPrice, { merge: true });
    
    // Also update some price info on the agent document for backwards compatibility
    await agentsCollection.doc(id).update({
      isFree: validPrice.isFree,
      isSubscription: validPrice.isSubscription,
      priceDetails: {
        basePrice: validPrice.basePrice,
        discountedPrice: validPrice.finalPrice,
        currency: validPrice.currency
      }
    });
    
    return res.status(200).json({
      message: 'Price updated successfully',
      price: validPrice
    });
  } catch (error) {
    console.error('Error updating price:', error);
    return res.status(500).json({ error: 'Failed to update price' });
  }
};

/**
 * Apply a discount to an agent's price
 */
const applyDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const discountData = req.body;
    
    // Validate discount data
    if (!discountData || (!discountData.amount && !discountData.percentage)) {
      return res.status(400).json({ error: 'Invalid discount data. Must include amount or percentage.' });
    }
    
    // Ensure the price exists
    const priceDoc = await pricesCollection.doc(id).get();
    if (!priceDoc.exists) {
      // If price doesn't exist yet, create it first based on agent data
      const agentDoc = await agentsCollection.doc(id).get();
      if (!agentDoc.exists) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      const agentData = agentDoc.data();
      let basePrice = 0;
      
      if (agentData.priceDetails) {
        basePrice = agentData.priceDetails.basePrice;
      } else if (typeof agentData.price === 'number') {
        basePrice = agentData.price;
      } else if (typeof agentData.price === 'string') {
        const match = agentData.price.match(/\$?(\d+(\.\d+)?)/);
        if (match) {
          basePrice = parseFloat(match[1]);
        }
      }
      
      // Create a new price object
      const newPrice = validatePrice({
        agentId: id,
        basePrice,
        currency: 'USD',
        isFree: agentData.isFree || false,
        isSubscription: agentData.isSubscription || false
      });
      
      await pricesCollection.doc(id).set(newPrice);
    }
    
    // Get the current price data
    const priceData = priceDoc.exists ? priceDoc.data() : await pricesCollection.doc(id).get().then(doc => doc.data());
    
    // Create the discount object
    const discount = {
      amount: discountData.amount || 0,
      percentage: discountData.percentage || 0,
      validFrom: discountData.validFrom || new Date().toISOString(),
      validUntil: discountData.validUntil || null
    };
    
    // Calculate new final price
    const finalPrice = calculateFinalPrice(priceData.basePrice, discount);
    
    // Add to price history if this is a new discount
    const historyEntry = createPriceHistoryEntry(
      priceData.finalPrice,
      finalPrice,
      priceData.currency,
      discountData.reason || 'Discount applied'
    );
    
    if (!priceData.priceHistory) {
      priceData.priceHistory = [];
    }
    
    priceData.priceHistory.push(historyEntry);
    
    // Update the price document
    await pricesCollection.doc(id).update({
      discount,
      finalPrice,
      priceHistory: priceData.priceHistory,
      updatedAt: new Date().toISOString()
    });
    
    // Update agent document for backwards compatibility
    await agentsCollection.doc(id).update({
      priceDetails: {
        basePrice: priceData.basePrice,
        discountedPrice: finalPrice,
        currency: priceData.currency
      }
    });
    
    return res.status(200).json({
      message: 'Discount applied successfully',
      discount,
      finalPrice
    });
  } catch (error) {
    console.error('Error applying discount:', error);
    return res.status(500).json({ error: 'Failed to apply discount' });
  }
};

/**
 * Get the price history for an agent
 */
const getPriceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the price document
    const priceDoc = await pricesCollection.doc(id).get();
    
    if (!priceDoc.exists) {
      return res.status(404).json({ error: 'Price not found for this agent' });
    }
    
    const priceData = priceDoc.data();
    
    // Return the price history
    return res.status(200).json({
      agentId: id,
      history: priceData.priceHistory || []
    });
  } catch (error) {
    console.error('Error getting price history:', error);
    return res.status(500).json({ error: 'Failed to get price history' });
  }
};

module.exports = {
  getPriceById,
  updatePrice,
  applyDiscount,
  getPriceHistory
}; 