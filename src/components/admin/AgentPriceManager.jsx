import React, { useState, useEffect } from 'react';
import { 
  getAgentPrice, 
  updateAgentPrice, 
  applyAgentDiscount, 
  getAgentPriceHistory, 
  formatPrice 
} from '../../services/priceService';
import './AgentPriceManager.css';

/**
 * Admin component for managing agent prices
 */
const AgentPriceManager = ({ agentId, onPriceUpdate }) => {
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Form states
  const [basePrice, setBasePrice] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [isFree, setIsFree] = useState(false);
  const [isSubscription, setIsSubscription] = useState(false);
  
  // Discount form states
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountValidUntil, setDiscountValidUntil] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  
  // Pricing tiers
  const [pricingTiers, setPricingTiers] = useState([
    { tier: 'Basic', price: 0, features: [] },
    { tier: 'Pro', price: 0, features: [] }
  ]);
  
  // Show discount form
  const [showDiscountForm, setShowDiscountForm] = useState(false);

  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const price = await getAgentPrice(agentId);
        setPriceData(price);
        
        // Initialize form with current price data
        setBasePrice(price.basePrice || 0);
        setCurrency(price.currency || 'USD');
        setIsFree(price.isFree || false);
        setIsSubscription(price.isSubscription || false);
        
        // Initialize pricing tiers if they exist
        if (price.pricingTiers && price.pricingTiers.length > 0) {
          setPricingTiers(price.pricingTiers);
        }
      } catch (err) {
        console.error('Error fetching price details:', err);
        setError('Failed to load price information');
      } finally {
        setLoading(false);
      }
    };
    
    if (agentId) {
      fetchPriceData();
    }
  }, [agentId]);

  // Handle base price form submission
  const handleBasePriceSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Prepare price data
      const updatedPrice = {
        basePrice: parseFloat(basePrice),
        currency,
        isFree,
        isSubscription,
        reason: 'Admin price update'
      };
      
      // Only include pricing tiers if this is a subscription
      if (isSubscription) {
        updatedPrice.pricingTiers = pricingTiers;
      }
      
      // Send update to API
      const result = await updateAgentPrice(agentId, updatedPrice);
      
      // Update price data
      setPriceData(result.price);
      setSuccess('Price updated successfully');
      
      // Notify parent component
      if (onPriceUpdate) {
        onPriceUpdate(result.price);
      }
    } catch (err) {
      console.error('Error updating price:', err);
      setError('Failed to update price');
    } finally {
      setLoading(false);
    }
  };

  // Handle discount form submission
  const handleDiscountSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validate either amount or percentage is set
      if (discountAmount <= 0 && discountPercentage <= 0) {
        setError('Please enter either a discount amount or percentage');
        setLoading(false);
        return;
      }
      
      // Prepare discount data
      const discountData = {
        reason: discountReason || 'Admin discount'
      };
      
      // Add either amount or percentage based on which one is set
      if (discountAmount > 0) {
        discountData.amount = parseFloat(discountAmount);
      } else {
        discountData.percentage = parseFloat(discountPercentage);
      }
      
      // Add valid until date if set
      if (discountValidUntil) {
        discountData.validUntil = new Date(discountValidUntil).toISOString();
      }
      
      // Send update to API
      const result = await applyAgentDiscount(agentId, discountData);
      
      // Reset discount form
      setDiscountAmount(0);
      setDiscountPercentage(0);
      setDiscountValidUntil('');
      setDiscountReason('');
      setShowDiscountForm(false);
      
      // Fetch updated price data
      const updatedPrice = await getAgentPrice(agentId);
      setPriceData(updatedPrice);
      
      setSuccess('Discount applied successfully');
      
      // Notify parent component
      if (onPriceUpdate) {
        onPriceUpdate(updatedPrice);
      }
    } catch (err) {
      console.error('Error applying discount:', err);
      setError('Failed to apply discount');
    } finally {
      setLoading(false);
    }
  };

  // Handle pricing tier updates
  const handleTierChange = (index, field, value) => {
    const updatedTiers = [...pricingTiers];
    updatedTiers[index][field] = field === 'price' ? parseFloat(value) : value;
    setPricingTiers(updatedTiers);
  };

  // Handle adding new feature to a tier
  const handleAddFeature = (index, feature) => {
    if (!feature.trim()) return;
    
    const updatedTiers = [...pricingTiers];
    if (!updatedTiers[index].features) {
      updatedTiers[index].features = [];
    }
    updatedTiers[index].features.push(feature);
    setPricingTiers(updatedTiers);
  };

  // Handle removing a feature from a tier
  const handleRemoveFeature = (tierIndex, featureIndex) => {
    const updatedTiers = [...pricingTiers];
    updatedTiers[tierIndex].features.splice(featureIndex, 1);
    setPricingTiers(updatedTiers);
  };

  // Handle free price toggle
  const handleFreeToggle = (checked) => {
    setIsFree(checked);
    if (checked) {
      setBasePrice(0);
      // Reset tiers prices if needed
      const updatedTiers = pricingTiers.map(tier => ({
        ...tier,
        price: 0
      }));
      setPricingTiers(updatedTiers);
    }
  };

  if (loading && !priceData) {
    return <div className="price-manager-loading">Loading price information...</div>;
  }

  return (
    <div className="agent-price-manager">
      <h2>Price Manager</h2>
      
      {error && <div className="price-manager-error">{error}</div>}
      {success && <div className="price-manager-success">{success}</div>}
      
      {/* Current Price Information */}
      {priceData && (
        <div className="current-price-info">
          <h3>Current Price Information</h3>
          <div className="price-info-container">
            <div className="price-info-item">
              <span className="label">Base Price:</span>
              <span className="value">{formatPrice(priceData.basePrice, priceData.currency)}</span>
            </div>
            
            <div className="price-info-item">
              <span className="label">Final Price:</span>
              <span className="value">{formatPrice(priceData.finalPrice, priceData.currency)}</span>
            </div>
            
            <div className="price-info-item">
              <span className="label">Type:</span>
              <span className="value">
                {priceData.isFree ? 'Free' : (priceData.isSubscription ? 'Subscription' : 'One-time')}
              </span>
            </div>
            
            {priceData.discount && (
              <div className="price-info-item">
                <span className="label">Discount:</span>
                <span className="value">
                  {priceData.discount.amount > 0 
                    ? formatPrice(priceData.discount.amount, priceData.currency) 
                    : `${priceData.discount.percentage}%`}
                  {priceData.discount.validUntil && 
                    ` (until ${new Date(priceData.discount.validUntil).toLocaleDateString()})`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Base Price Update Form */}
      <div className="price-update-form">
        <h3>Update Base Price</h3>
        <form onSubmit={handleBasePriceSubmit}>
          <div className="form-row checkbox-row">
            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={isFree} 
                onChange={(e) => handleFreeToggle(e.target.checked)} 
              />
              <span className="checkbox-label">Free agent</span>
            </label>
          </div>
          
          <div className="form-row">
            <label>
              Base Price:
              <input 
                type="number" 
                min="0" 
                step="0.01" 
                value={basePrice} 
                onChange={(e) => setBasePrice(e.target.value)} 
                disabled={isFree}
              />
            </label>
            
            <label>
              Currency:
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </label>
          </div>
          
          <div className="form-row checkbox-row">
            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={isSubscription} 
                onChange={(e) => setIsSubscription(e.target.checked)} 
                disabled={isFree}
              />
              <span className="checkbox-label">Subscription (recurring)</span>
            </label>
          </div>
          
          {/* Subscription Tiers (show only if subscription is selected) */}
          {isSubscription && (
            <div className="subscription-tiers">
              <h4>Subscription Tiers</h4>
              
              {pricingTiers.map((tier, index) => (
                <div key={index} className="subscription-tier">
                  <div className="tier-header">
                    <input 
                      type="text" 
                      placeholder="Tier Name" 
                      value={tier.tier} 
                      onChange={(e) => handleTierChange(index, 'tier', e.target.value)} 
                    />
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      placeholder="Price" 
                      value={tier.price} 
                      onChange={(e) => handleTierChange(index, 'price', e.target.value)} 
                      disabled={isFree}
                    />
                  </div>
                  
                  <div className="tier-features">
                    <h5>Features</h5>
                    <ul>
                      {tier.features && tier.features.map((feature, featureIndex) => (
                        <li key={featureIndex}>
                          {feature}
                          <button 
                            type="button" 
                            className="remove-feature" 
                            onClick={() => handleRemoveFeature(index, featureIndex)}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="add-feature">
                      <input 
                        type="text" 
                        placeholder="New feature" 
                        id={`new-feature-${index}`} 
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          const input = document.getElementById(`new-feature-${index}`);
                          handleAddFeature(index, input.value);
                          input.value = '';
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="form-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save Price Changes'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Discount Section */}
      {!isFree && (
        <div className="discount-section">
          <div className="discount-header">
            <h3>Discounts</h3>
            <button 
              type="button" 
              className="toggle-discount-btn" 
              onClick={() => setShowDiscountForm(!showDiscountForm)}
            >
              {showDiscountForm ? 'Cancel' : 'Add Discount'}
            </button>
          </div>
          
          {showDiscountForm && (
            <form onSubmit={handleDiscountSubmit} className="discount-form">
              <div className="form-row">
                <label>
                  Discount Amount ({currency}):
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={discountAmount} 
                    onChange={(e) => {
                      setDiscountAmount(e.target.value);
                      if (parseFloat(e.target.value) > 0) {
                        setDiscountPercentage(0);
                      }
                    }} 
                  />
                </label>
                
                <span className="or-divider">OR</span>
                
                <label>
                  Discount Percentage:
                  <div className="percentage-input">
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={discountPercentage} 
                      onChange={(e) => {
                        setDiscountPercentage(e.target.value);
                        if (parseFloat(e.target.value) > 0) {
                          setDiscountAmount(0);
                        }
                      }} 
                    />
                    <span className="percentage-sign">%</span>
                  </div>
                </label>
              </div>
              
              <div className="form-row">
                <label>
                  Valid Until:
                  <input 
                    type="date" 
                    value={discountValidUntil} 
                    onChange={(e) => setDiscountValidUntil(e.target.value)} 
                  />
                </label>
              </div>
              
              <div className="form-row">
                <label>
                  Reason:
                  <input 
                    type="text" 
                    value={discountReason} 
                    onChange={(e) => setDiscountReason(e.target.value)} 
                    placeholder="e.g., Spring Sale, New User Promo" 
                  />
                </label>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="apply-discount-button" disabled={loading}>
                  {loading ? 'Applying...' : 'Apply Discount'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentPriceManager; 