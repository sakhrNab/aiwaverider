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

/**
 * Get price for a specific agent
 */
const getAgentPrice = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Find price by agent ID
    const priceQuery = await db.collection('prices')
      .where('agentId', '==', agentId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (priceQuery.empty) {
      // No price found, check if agent exists
      const agentDoc = await db.collection('agents').doc(agentId).get();
      
      if (!agentDoc.exists) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      // Agent exists but no price record, check for price in agent document
      const agentData = agentDoc.data();
      
      // Create a default price based on agent data
      const defaultPrice = {
        id: `price_${agentId}`,
        agentId: agentId,
        basePrice: agentData.price || 0,
        discountedPrice: agentData.discountedPrice || agentData.price || 0,
        discountPercentage: agentData.discountPercentage || 0,
        currency: agentData.currency || 'USD',
        isFree: agentData.isFree || agentData.price === 0 || agentData.price === '0',
        isSubscription: agentData.isSubscription || false,
        billingCycle: agentData.billingCycle || 'one-time',
        createdAt: agentData.createdAt || new Date().toISOString(),
        updatedAt: agentData.updatedAt || new Date().toISOString()
      };
      
      return res.status(200).json(defaultPrice);
    }
    
    // Return the found price data
    const priceDoc = priceQuery.docs[0];
    const priceData = {
      id: priceDoc.id,
      ...priceDoc.data()
    };
    
    return res.status(200).json(priceData);
  } catch (error) {
    console.error('Error fetching agent price:', error);
    return res.status(500).json({ error: 'Failed to fetch agent price' });
  }
};

/**
 * Update price for a specific agent
 */
const updateAgentPrice = async (req, res) => {
  try {
    // Check if user is an admin
    const isAdmin = req.user && req.user.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only administrators can update agent prices' });
    }
    
    const { agentId } = req.params;
    const priceData = req.body;
    
    // Check if agent exists
    const agentDoc = await db.collection('agents').doc(agentId).get();
    if (!agentDoc.exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Find existing price by agent ID
    const priceQuery = await db.collection('prices')
      .where('agentId', '==', agentId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    // Calculate discounted price if needed
    const basePrice = priceData.basePrice || 0;
    const discountPercentage = priceData.discountPercentage || 0;
    const discountedPrice = discountPercentage > 0 
      ? basePrice - (basePrice * (discountPercentage / 100)) 
      : basePrice;
    
    // Add required fields
    const updatedPriceData = {
      ...priceData,
      agentId,
      basePrice,
      discountedPrice,
      discountPercentage,
      currency: priceData.currency || 'USD',
      isFree: basePrice === 0,
      updatedAt: new Date().toISOString()
    };
    
    let priceId;
    
    if (priceQuery.empty) {
      // No existing price, create new one
      updatedPriceData.createdAt = updatedPriceData.updatedAt;
      const newPriceRef = await db.collection('prices').add(updatedPriceData);
      priceId = newPriceRef.id;
      
      // Also update agent with price information
      await db.collection('agents').doc(agentId).update({
        price: basePrice,
        discountedPrice,
        discountPercentage,
        isFree: basePrice === 0,
        updatedAt: updatedPriceData.updatedAt
      });
    } else {
      // Update existing price
      const priceDoc = priceQuery.docs[0];
      priceId = priceDoc.id;
      
      // Update the price document
      await db.collection('prices').doc(priceId).update(updatedPriceData);
      
      // Also update agent with price information
      await db.collection('agents').doc(agentId).update({
        price: basePrice,
        discountedPrice,
        discountPercentage,
        isFree: basePrice === 0,
        updatedAt: updatedPriceData.updatedAt
      });
    }
    
    // Create price history record
    await db.collection('price_history').add({
      priceId,
      agentId,
      basePrice,
      discountedPrice,
      discountPercentage,
      currency: updatedPriceData.currency,
      changedAt: updatedPriceData.updatedAt,
      changedBy: req.user.uid
    });
    
    // Get the updated price data
    const updatedPriceDoc = await db.collection('prices').doc(priceId).get();
    const updatedPrice = {
      id: updatedPriceDoc.id,
      ...updatedPriceDoc.data()
    };
    
    return res.status(200).json(updatedPrice);
  } catch (error) {
    console.error('Error updating agent price:', error);
    return res.status(500).json({ error: 'Failed to update agent price' });
  }
};

module.exports = {
  getPriceById,
  updatePrice,
  applyDiscount,
  getPriceHistory,
  getAgentPrice,
  updateAgentPrice
}; 