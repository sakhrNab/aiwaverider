import React from 'react';
import { FaDollarSign, FaShoppingCart, FaBox, FaUsers, FaImage } from 'react-icons/fa';
import AdminLayout from '../../components/layout/AdminLayout';
import './AdminDashboardPage.css';

/**
 * Admin Dashboard page with overview statistics
 */
const Dashboard = () => {
  // Product data
  const recentSales = [
    {
      id: 1,
      name: 'Web Development Bootcamp 2023',
      price: 129.99,
      customer: 'Customer-1@example.com',
      image: '/img/products/web-dev.jpg'
    },
    {
      id: 2,
      name: 'Financial Freedom E-Book',
      price: 12.99,
      customer: 'Customer-2@example.com',
      image: '/img/products/financial.jpg'
    },
    {
      id: 3,
      name: 'Ultimate UI Design System',
      price: 79.99,
      customer: 'Customer-3@example.com',
      image: '/img/products/ui-design.jpg'
    },
    {
      id: 4,
      name: 'Productivity Planner Template',
      price: 9.99,
      customer: 'Customer-4@example.com',
      image: '/img/products/planner.jpg'
    },
    {
      id: 5,
      name: 'Mobile App UI Kit',
      price: 59.99,
      customer: 'Customer-5@example.com',
      image: '/img/products/mobile-ui.jpg'
    }
  ];

  const popularProducts = [
    {
      id: 1,
      name: 'Web Development Bootcamp 2023',
      price: 129.99,
      reviews: 342,
      image: '/img/products/web-dev.jpg'
    },
    {
      id: 2,
      name: 'Financial Freedom E-Book',
      price: 12.99,
      reviews: 213,
      image: '/img/products/financial.jpg'
    },
    {
      id: 3,
      name: 'Ultimate UI Design System',
      price: 79.99,
      reviews: 152,
      image: '/img/products/ui-design.jpg'
    },
    {
      id: 4,
      name: 'Productivity Planner Template',
      price: 9.99,
      reviews: 127,
      image: '/img/products/planner.jpg'
    },
    {
      id: 5,
      name: 'Mobile App UI Kit',
      price: 59.99,
      reviews: 118,
      image: '/img/products/mobile-ui.jpg'
    }
  ];

  // Function to render product image with fallback icon
  const ProductImage = ({ src, alt }) => {
    const [hasError, setHasError] = React.useState(false);
    
    return hasError ? (
      <div className="fallback-image">
        <FaImage />
      </div>
    ) : (
      <img 
        src={src} 
        alt={alt} 
        onError={() => setHasError(true)}
      />
    );
  };
  
  return (
    <AdminLayout>
      <div className="admin-dashboard">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <p className="dashboard-subtitle">Welcome to your admin dashboard</p>
        </div>
        
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <h3>Total Revenue</h3>
              <span className="stat-icon">
                <FaDollarSign />
              </span>
            </div>
            <div className="stat-value">$0.00</div>
            <div className="stat-description">Lifetime revenue from all orders</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <h3>Orders</h3>
              <span className="stat-icon">
                <FaShoppingCart />
              </span>
            </div>
            <div className="stat-value">0</div>
            <div className="stat-description">Total orders placed</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <h3>Products</h3>
              <span className="stat-icon">
                <FaBox />
              </span>
            </div>
            <div className="stat-value">10</div>
            <div className="stat-description">Active products in store</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-header">
              <h3>Users</h3>
              <span className="stat-icon">
                <FaUsers />
              </span>
            </div>
            <div className="stat-value">5</div>
            <div className="stat-description">Registered user accounts</div>
          </div>
        </div>
        
        {/* Recent Sales and Popular Products */}
        <div className="dashboard-grid">
          {/* Recent Sales */}
          <div className="dashboard-card">
            <h2 className="card-title">Recent Sales</h2>
            <p className="card-subtitle">Recent customer purchases</p>
            
            <div className="product-list">
              {recentSales.map((sale) => (
                <div key={sale.id} className="product-item">
                  <div className="product-image">
                    <ProductImage src={sale.image} alt={sale.name} />
                  </div>
                  <div className="product-details">
                    <h4 className="product-name">{sale.name}</h4>
                    <p className="product-customer">{sale.customer}</p>
                  </div>
                  <div className="product-price">${sale.price.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Popular Products */}
          <div className="dashboard-card">
            <h2 className="card-title">Popular Products</h2>
            <p className="card-subtitle">Top selling products</p>
            
            <div className="product-list">
              {popularProducts.map((product) => (
                <div key={product.id} className="product-item">
                  <div className="product-image">
                    <ProductImage src={product.image} alt={product.name} />
                  </div>
                  <div className="product-details">
                    <h4 className="product-name">{product.name}</h4>
                    <p className="product-reviews">{product.reviews} reviews</p>
                  </div>
                  <div className="product-price">${product.price.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard; 