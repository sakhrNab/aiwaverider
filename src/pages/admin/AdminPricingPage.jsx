import React, { useState, useEffect } from 'react';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaExclamationTriangle,
  FaMoneyBillWave
} from 'react-icons/fa';
import AdminLayout from '../../components/layout/AdminLayout';
import './AdminPricingPage.css';

/**
 * Admin Pricing page for managing pricing plans
 */
const Pricing = () => {
  const [pricingPlans, setPricingPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  
  // Fetch pricing plans on component mount
  useEffect(() => {
    fetchPricingPlans();
  }, []);
  
  // Function to fetch pricing plans
  const fetchPricingPlans = async () => {
    setLoading(true);
    try {
      // In a real application, this would be an API call
      // For now, we'll simulate with a timeout and mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockPlans = [
        {
          id: 1,
          name: 'Basic',
          description: 'Essential features for individuals',
          price: 9.99,
          billingCycle: 'monthly',
          features: [
            'Access to basic agents',
            '10 requests per day',
            'Email support'
          ],
          isPopular: false,
          isActive: true
        },
        {
          id: 2,
          name: 'Pro',
          description: 'Advanced features for professionals',
          price: 19.99,
          billingCycle: 'monthly',
          features: [
            'Access to all agents',
            'Unlimited requests',
            'Priority support',
            'Custom agent creation'
          ],
          isPopular: true,
          isActive: true
        },
        {
          id: 3,
          name: 'Enterprise',
          description: 'Complete solution for businesses',
          price: 49.99,
          billingCycle: 'monthly',
          features: [
            'Access to all agents',
            'Unlimited requests',
            'Dedicated support',
            'Custom agent creation',
            'API access',
            'Team collaboration'
          ],
          isPopular: false,
          isActive: true
        },
        {
          id: 4,
          name: 'Lifetime',
          description: 'One-time payment for lifetime access',
          price: 299.99,
          billingCycle: 'one-time',
          features: [
            'Access to all current agents',
            'Unlimited requests',
            'Standard support',
            'Future updates for 2 years'
          ],
          isPopular: false,
          isActive: false
        }
      ];
      
      setPricingPlans(mockPlans);
      setError(null);
    } catch (err) {
      console.error('Error fetching pricing plans:', err);
      setError('Failed to load pricing plans. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle create new plan
  const handleCreateClick = () => {
    setFormMode('create');
    setSelectedPlan({
      name: '',
      description: '',
      price: 0,
      billingCycle: 'monthly',
      features: [''],
      isPopular: false,
      isActive: true
    });
    setIsFormModalOpen(true);
  };
  
  // Handle edit plan
  const handleEditClick = (plan) => {
    setFormMode('edit');
    setSelectedPlan({...plan, features: [...plan.features]});
    setIsFormModalOpen(true);
  };
  
  // Handle delete plan
  const handleDeleteClick = (plan) => {
    setSelectedPlan(plan);
    setIsDeleteModalOpen(true);
  };
  
  // Delete plan
  const deletePlan = () => {
    // In a real application, this would be an API call
    setPricingPlans(pricingPlans.filter(plan => plan.id !== selectedPlan.id));
    setIsDeleteModalOpen(false);
    setSelectedPlan(null);
  };
  
  // Handle form input change
  const handleInputChange = (field, value) => {
    setSelectedPlan({
      ...selectedPlan,
      [field]: value
    });
  };
  
  // Handle feature input change
  const handleFeatureChange = (index, value) => {
    const updatedFeatures = [...selectedPlan.features];
    updatedFeatures[index] = value;
    setSelectedPlan({
      ...selectedPlan,
      features: updatedFeatures
    });
  };
  
  // Add new feature field
  const addFeatureField = () => {
    setSelectedPlan({
      ...selectedPlan,
      features: [...selectedPlan.features, '']
    });
  };
  
  // Remove feature field
  const removeFeatureField = (index) => {
    const updatedFeatures = [...selectedPlan.features];
    updatedFeatures.splice(index, 1);
    setSelectedPlan({
      ...selectedPlan,
      features: updatedFeatures
    });
  };
  
  // Handle form submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    // In a real application, this would be an API call
    if (formMode === 'create') {
      // Create new plan with a generated ID
      const newPlan = {
        ...selectedPlan,
        id: Date.now() // Use timestamp as a simple ID
      };
      setPricingPlans([...pricingPlans, newPlan]);
    } else {
      // Update existing plan
      setPricingPlans(pricingPlans.map(plan => 
        plan.id === selectedPlan.id ? selectedPlan : plan
      ));
    }
    
    setIsFormModalOpen(false);
    setSelectedPlan(null);
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  return (
    <AdminLayout>
      <div className="pricing-page">
        <header className="page-header">
          <h1>Manage Pricing Plans</h1>
          <button className="btn-primary" onClick={handleCreateClick}>
            <FaPlus />
            <span>Add New Plan</span>
          </button>
        </header>
        
        {error && (
          <div className="error-message">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}
        
        {loading ? (
          <div className="loading-message">Loading pricing plans...</div>
        ) : (
          <div className="pricing-plans-grid">
            {pricingPlans.length === 0 ? (
              <div className="no-plans-message">
                No pricing plans found. Click "Add New Plan" to create one.
              </div>
            ) : (
              pricingPlans.map(plan => (
                <div 
                  key={plan.id} 
                  className={`pricing-plan-card ${plan.isPopular ? 'popular' : ''} ${!plan.isActive ? 'inactive' : ''}`}
                >
                  {plan.isPopular && <div className="popular-badge">Popular</div>}
                  {!plan.isActive && <div className="inactive-badge">Inactive</div>}
                  
                  <div className="plan-header">
                    <h2>{plan.name}</h2>
                    <p className="plan-description">{plan.description}</p>
                  </div>
                  
                  <div className="plan-price">
                    <span className="price">{formatCurrency(plan.price)}</span>
                    <span className="billing-cycle">
                      {plan.billingCycle === 'monthly' ? '/month' : ' one-time'}
                    </span>
                  </div>
                  
                  <div className="plan-features">
                    <h3>Features</h3>
                    <ul>
                      {plan.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="plan-actions">
                    <button 
                      className="btn-edit" 
                      onClick={() => handleEditClick(plan)}
                      title="Edit plan"
                    >
                      <FaEdit />
                      <span>Edit</span>
                    </button>
                    <button 
                      className="btn-delete" 
                      onClick={() => handleDeleteClick(plan)}
                      title="Delete plan"
                    >
                      <FaTrash />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedPlan && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Confirm Deletion</h2>
              <p>Are you sure you want to delete the <strong>{selectedPlan.name}</strong> plan?</p>
              <p>This action cannot be undone.</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
                  Cancel
                </button>
                <button className="btn-danger" onClick={deletePlan}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Plan Form Modal */}
        {isFormModalOpen && selectedPlan && (
          <div className="modal-overlay">
            <div className="modal-content plan-form-modal">
              <h2>{formMode === 'create' ? 'Add New Plan' : 'Edit Plan'}</h2>
              <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label htmlFor="planName">Plan Name</label>
                  <input
                    type="text"
                    id="planName"
                    value={selectedPlan.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="planDescription">Description</label>
                  <textarea
                    id="planDescription"
                    value={selectedPlan.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows="2"
                    required
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="planPrice">Price</label>
                    <div className="price-input">
                      <FaMoneyBillWave />
                      <input
                        type="number"
                        id="planPrice"
                        value={selectedPlan.price}
                        onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="billingCycle">Billing Cycle</label>
                    <select
                      id="billingCycle"
                      value={selectedPlan.billingCycle}
                      onChange={(e) => handleInputChange('billingCycle', e.target.value)}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="one-time">One-time</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Features</label>
                  {selectedPlan.features.map((feature, index) => (
                    <div key={index} className="feature-input">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        placeholder="Enter a feature"
                        required
                      />
                      <button 
                        type="button" 
                        className="btn-remove-feature"
                        onClick={() => removeFeatureField(index)}
                        disabled={selectedPlan.features.length <= 1}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn-add-feature"
                    onClick={addFeatureField}
                  >
                    <FaPlus />
                    <span>Add Feature</span>
                  </button>
                </div>
                
                <div className="form-row checkboxes">
                  <div className="form-group checkbox">
                    <input
                      type="checkbox"
                      id="isPopular"
                      checked={selectedPlan.isPopular}
                      onChange={() => handleInputChange('isPopular', !selectedPlan.isPopular)}
                    />
                    <label htmlFor="isPopular">Mark as Popular</label>
                  </div>
                  
                  <div className="form-group checkbox">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={selectedPlan.isActive}
                      onChange={() => handleInputChange('isActive', !selectedPlan.isActive)}
                    />
                    <label htmlFor="isActive">Active</label>
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsFormModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {formMode === 'create' ? 'Create Plan' : 'Update Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Pricing; 