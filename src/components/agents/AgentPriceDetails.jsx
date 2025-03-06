import React, { useState, useEffect } from 'react';
import { FaTag, FaHistory, FaInfoCircle } from 'react-icons/fa';
import { getAgentPrice, getAgentPriceHistory, formatPrice, isDiscountValid, calculateEffectivePrice } from '../../services/priceService';
import './AgentPriceDetails.css';

/**
 * Component for displaying detailed price information for an agent
 */
const AgentPriceDetails = ({ agentId }) => {
  const [priceData, setPriceData] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch price details
        const price = await getAgentPrice(agentId);
        setPriceData(price);
        
        // Fetch price history
        const history = await getAgentPriceHistory(agentId);
        setPriceHistory(history.history || []);
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

  // Determine if there's a valid discount
  const hasValidDiscount = priceData?.discount && isDiscountValid(priceData.discount);
  
  // Calculate the effective price (with discount if valid)
  const effectivePrice = priceData ? calculateEffectivePrice(priceData) : 0;
  
  // Format dates for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Calculate discount percentage for display
  const calculateDiscountPercentage = () => {
    if (!priceData || !hasValidDiscount || priceData.basePrice === 0) return 0;
    return Math.round(((priceData.basePrice - effectivePrice) / priceData.basePrice) * 100);
  };

  if (loading) {
    return <div className="agent-price-loading">Loading price information...</div>;
  }

  if (error) {
    return <div className="agent-price-error">{error}</div>;
  }

  if (!priceData) {
    return <div className="agent-price-unavailable">Price information unavailable</div>;
  }

  // If it's a free agent, display simple message
  if (priceData.isFree) {
    return (
      <div className="agent-price-details free">
        <div className="agent-price-header">
          <h3>Price Details</h3>
        </div>
        <div className="agent-price-free-message">
          <FaInfoCircle className="info-icon" />
          <p>This agent is available for free</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-price-details">
      <div className="agent-price-header">
        <h3>Price Details</h3>
        <button 
          className="history-toggle-button" 
          onClick={() => setShowHistory(!showHistory)}
          aria-label={showHistory ? "Hide price history" : "Show price history"}
        >
          <FaHistory />
          {showHistory ? 'Hide History' : 'Price History'}
        </button>
      </div>

      <div className="agent-price-main">
        <div className="agent-price-value">
          {hasValidDiscount && (
            <>
              <span className="agent-price-original">
                {formatPrice(priceData.basePrice, priceData.currency)}
              </span>
              <span className="agent-price-discount-badge">
                <FaTag />
                {calculateDiscountPercentage()}% OFF
              </span>
            </>
          )}
          <span className={`agent-price-current ${hasValidDiscount ? 'discounted' : ''}`}>
            {formatPrice(effectivePrice, priceData.currency)}
          </span>
          {priceData.isSubscription && (
            <span className="agent-price-subscription-label">/month</span>
          )}
        </div>

        {/* Show discount details if there's a valid discount */}
        {hasValidDiscount && (
          <div className="agent-discount-details">
            <p>
              <strong>Discount valid until:</strong> {formatDate(priceData.discount.validUntil || new Date())}
            </p>
            <p className="discount-save">
              You save: {formatPrice(priceData.basePrice - effectivePrice, priceData.currency)}
            </p>
          </div>
        )}
      </div>

      {/* Pricing tiers if available */}
      {priceData.pricingTiers && priceData.pricingTiers.length > 0 && (
        <div className="agent-pricing-tiers">
          <h4>Available Plans</h4>
          <div className="pricing-tiers-container">
            {priceData.pricingTiers.map((tier, index) => (
              <div key={index} className="pricing-tier">
                <h5>{tier.tier}</h5>
                <div className="tier-price">
                  {formatPrice(tier.price, priceData.currency)}
                  {priceData.isSubscription && <span>/month</span>}
                </div>
                <ul className="tier-features">
                  {tier.features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price history section */}
      {showHistory && (
        <div className="agent-price-history">
          <h4>Price History</h4>
          {priceHistory.length === 0 ? (
            <p>No price changes recorded</p>
          ) : (
            <table className="price-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Price</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {priceHistory.map((entry, index) => (
                  <tr key={index}>
                    <td>{formatDate(entry.timestamp)}</td>
                    <td>{formatPrice(entry.price, entry.currency)}</td>
                    <td>{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentPriceDetails; 