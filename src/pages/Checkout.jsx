import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaInfoCircle, FaMinus, FaPlus, FaTrashAlt, FaShoppingCart, FaCreditCard } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useCart } from '../contexts/CartContext.jsx';
import { getRelatedProducts } from '../utils/productData';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { createPayPalOrder, capturePayPalPayment } from '../services/paymentApi';
import '../styles/Checkout.css';

const Checkout = () => {
  const { cart, cartTotal, removeFromCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();
  const [{ isPending }] = usePayPalScriptReducer();
  
  const [email, setEmail] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [country, setCountry] = useState('United States');
  const [zipCode, setZipCode] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [newsletter, setNewsletter] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  
  // Payment methods available
  const paymentMethods = [
    { id: 'card', name: 'Credit Card', icon: <FaCreditCard /> },
    { id: 'paypal', name: 'PayPal', icon: '💳' },
    { id: 'apple', name: 'Apple Pay', icon: '🍎' },
    { id: 'google', name: 'Google Pay', icon: '🔵' }
  ];
  
  // Calculate VAT (variable based on country)
  const vatRate = country === 'United States' ? 0 : 0.2; // 20% VAT for non-US
  const vatAmount = (cartTotal - discountAmount) * vatRate;
  
  // Calculate final total
  const finalTotal = cartTotal - discountAmount + vatAmount;
  
  useEffect(() => {
    // Get related products based on items in cart
    if (cart.length > 0) {
      // Use the first item in cart to get related products
      const related = getRelatedProducts(cart[0].id, 3);
      setRelatedProducts(related);
    }
  }, [cart]);
  
  const handleQuantityChange = (id, newQuantity) => {
    if (newQuantity >= 1) {
      updateQuantity(id, newQuantity);
    }
  };
  
  const handleRemoveItem = (id) => {
    removeFromCart(id);
    toast.info('Item removed from cart');
  };
  
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };
  
  const handleCardNumberChange = (e) => {
    const formattedValue = formatCardNumber(e.target.value);
    setCardNumber(formattedValue);
  };
  
  const handleExpiryChange = (e) => {
    let value = e.target.value;
    value = value.replace(/[^\d]/g, '');
    
    if (value.length <= 2) {
      setCardExpiry(value);
    } else if (value.length > 2) {
      setCardExpiry(value.slice(0, 2) + '/' + value.slice(2, 4));
    }
  };
  
  const applyDiscount = () => {
    // Simple discount code implementation
    if (discountCode.toLowerCase() === 'welcome10') {
      const discount = cartTotal * 0.1; // 10% discount
      setDiscountAmount(discount);
      setDiscountApplied(true);
      toast.success('Discount applied: 10% off');
    } else {
      toast.error('Invalid discount code');
    }
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
  };
  
  // Credit card payment processing
  const handleCreditCardSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // In a real implementation, you would:
      // 1. Create a payment intent on your server 
      // 2. Use Stripe.js to tokenize card details
      // 3. Confirm the payment with your backend
      
      // For now, we'll use a setTimeout to simulate processing
      setTimeout(() => {
        toast.success('Payment successful! Thank you for your purchase.');
        clearCart();
        navigate('/thankyou');
        setIsSubmitting(false);
      }, 2000);
    } catch (error) {
      toast.error(error.message || 'Payment failed. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  // PayPal button handlers
  const createPaypalOrder = async () => {
    try {
      // Call backend to create PayPal order
      const orderData = {
        cartTotal: finalTotal,
        items: cart
      };
      const { id } = await createPayPalOrder(orderData);
      return id;
    } catch (error) {
      toast.error("Could not initiate PayPal checkout. Please try again.");
      throw error;
    }
  };
  
  const onPayPalApprove = async (data) => {
    try {
      // Call backend to capture funds
      await capturePayPalPayment(data.orderID);
      
      toast.success('Payment successful! Thank you for your purchase.');
      clearCart();
      navigate('/thankyou');
    } catch (error) {
      toast.error("There was a problem with your payment. Please try again.");
      console.error(error);
    }
  };
  
  if (cart.length === 0) {
    return (
      <div className="checkout-container">
        <div className="checkout-header">
          <Link to="/" className="back-link">
            <FaArrowLeft /> Continue Shopping
          </Link>
          <h1>Checkout</h1>
        </div>
        
        <div className="empty-cart">
          <div className="empty-cart-icon">
            <FaShoppingCart />
          </div>
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added any products to your cart yet.</p>
          <Link to="/agents" className="continue-shopping-btn">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <Link to="/" className="back-link">
          <FaArrowLeft /> Continue Shopping
        </Link>
        <h1>Checkout</h1>
      </div>
      
      <div className="checkout-content">
        <div className="checkout-items">
          <h2>Your Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})</h2>
          
          {cart.map(item => (
            <div key={item.id} className="cart-item">
              <div className="item-image">
                <img src={item.imageUrl} alt={item.title} />
              </div>
              
              <div className="item-details">
                <h3>{item.title}</h3>
                <p className="item-price">${item.price.toFixed(2)}</p>
                
                <div className="item-actions">
                  <div className="quantity-controls">
                    <button 
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <FaMinus />
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => handleQuantityChange(item.id, item.quantity + 1)}>
                      <FaPlus />
                    </button>
                  </div>
                  
                  <button 
                    className="remove-button"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <FaTrashAlt /> Remove
                  </button>
                </div>
              </div>
              
              <div className="item-total">
                ${(item.price * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
          
          <div className="discount-section">
            <input
              type="text"
              placeholder="Discount code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              disabled={discountApplied}
            />
            <button 
              onClick={applyDiscount}
              disabled={discountApplied || !discountCode}
            >
              Apply
            </button>
          </div>
        </div>
        
        <div className="checkout-summary">
          <h2>Order Summary</h2>
          
          <div className="summary-row">
            <span>Subtotal</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          
          {discountApplied && (
            <div className="summary-row discount">
              <span>Discount</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          
          <div className="summary-row">
            <span>
              VAT {vatRate > 0 ? `(${vatRate * 100}%)` : ''}
              {vatRate === 0 && (
                <span className="info-icon">
                  <FaInfoCircle title="No VAT for US customers" />
                </span>
              )}
            </span>
            <span>${vatAmount.toFixed(2)}</span>
          </div>
          
          <div className="summary-row total">
            <span>Total</span>
            <span>${finalTotal.toFixed(2)}</span>
          </div>
          
          {/* Payment method toggle */}
          <div className="payment-methods">
            {paymentMethods.map(method => (
              <div 
                key={method.id}
                className={`payment-method-toggle ${paymentMethod === method.id ? 'active' : ''}`}
                onClick={() => handlePaymentMethodChange(method.id)}
              >
                <div className="method-icon">{method.icon}</div>
                <span>{method.name}</span>
              </div>
            ))}
          </div>
          
          {/* Common customer information */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Your email address"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="country">Country</label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            >
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="Germany">Germany</option>
              <option value="France">France</option>
              <option value="Japan">Japan</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="zipCode">Zip/Postal Code</label>
            <input
              type="text"
              id="zipCode"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              required
              placeholder="Your postal code"
            />
          </div>
          
          {/* Payment method specific forms */}
          {paymentMethod === 'card' && (
            <form onSubmit={handleCreditCardSubmit} className="payment-form">
              <div className="form-group">
                <label htmlFor="cardName">Name on Card</label>
                <input
                  type="text"
                  id="cardName"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  required
                  placeholder="Name as it appears on your card"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="cardNumber">Card Number</label>
                <input
                  type="text"
                  id="cardNumber"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  required
                  placeholder="XXXX XXXX XXXX XXXX"
                  maxLength="19"
                />
              </div>
              
              <div className="card-details">
                <div className="form-group expiry">
                  <label htmlFor="cardExpiry">Expiry Date</label>
                  <input
                    type="text"
                    id="cardExpiry"
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                    required
                    placeholder="MM/YY"
                    maxLength="5"
                  />
                </div>
                
                <div className="form-group cvv">
                  <label htmlFor="cardCvv">CVV</label>
                  <input
                    type="text"
                    id="cardCvv"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                    required
                    placeholder="XXX"
                    maxLength="3"
                  />
                </div>
              </div>
              
              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  id="newsletter"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                />
                <label htmlFor="newsletter">
                  Subscribe to our newsletter for updates and exclusive offers
                </label>
              </div>
              
              <button 
                type="submit" 
                className="pay-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : `Pay $${finalTotal.toFixed(2)} with Credit Card`}
              </button>
            </form>
          )}
          
          {paymentMethod === 'paypal' && (
            <div className="paypal-container">
              <p>Complete your purchase with PayPal:</p>
              {isPending ? (
                <div className="paypal-loading">Loading PayPal buttons...</div>
              ) : (
                <PayPalButtons
                  style={{ layout: 'vertical' }}
                  createOrder={(data, actions) => {
                    // Simple order creation - in a real app, this would call your server
                    return actions.order.create({
                      purchase_units: [
                        {
                          amount: {
                            value: finalTotal.toFixed(2),
                            currency_code: 'USD'
                          },
                          description: `Order from AI Wave Rider (${cart.length} items)`
                        },
                      ],
                    });
                  }}
                  onApprove={(data, actions) => {
                    // Capture the funds from the transaction
                    return actions.order.capture().then(function(details) {
                      // Show a success message
                      toast.success(`Payment completed! Thank you, ${details.payer.name.given_name}`);
                      clearCart();
                      navigate('/thankyou');
                    });
                  }}
                  onError={(err) => {
                    console.error('PayPal error:', err);
                    toast.error("PayPal encountered an error. Please try another payment method.");
                  }}
                  onCancel={() => {
                    toast.info("PayPal transaction cancelled.");
                  }}
                />
              )}
            </div>
          )}
          
          {paymentMethod === 'apple' && (
            <div className="apple-pay-container">
              <p>Apple Pay integration would be implemented here.</p>
              <button 
                disabled
                className="pay-button apple-pay-button"
              >
                Pay with Apple Pay
              </button>
              <p className="payment-info-note">
                Apple Pay requires additional setup with Apple Developer account and merchant ID.
              </p>
            </div>
          )}
          
          {paymentMethod === 'google' && (
            <div className="google-pay-container">
              <p>Google Pay integration would be implemented here.</p>
              <button 
                disabled
                className="pay-button google-pay-button"
              >
                Pay with Google Pay
              </button>
              <p className="payment-info-note">
                Google Pay requires additional setup with Google Pay API.
              </p>
            </div>
          )}
          
          <p className="security-note">
            <small>
              Your payment information is secured with industry-standard encryption.
              We do not store your full credit card details.
            </small>
          </p>
        </div>
      </div>
      
      {relatedProducts.length > 0 && (
        <div className="related-products">
          <h2>You Might Also Like</h2>
          <div className="related-grid">
            {relatedProducts.map(product => (
              <div key={product.id} className="related-product">
                <img src={product.imageUrl} alt={product.title} />
                <h3>{product.title}</h3>
                <p>
                  {product.price > 0 
                    ? `$${product.price.toFixed(2)}` 
                    : 'Free'}
                </p>
                <Link to={`/product/${product.id}`} className="view-button">
                  View Details
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout; 