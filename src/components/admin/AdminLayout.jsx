import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaRobot, 
  FaUsers, 
  FaMoneyBillWave, 
  FaChartLine, 
  FaCog,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import './AdminLayout.css';

/**
 * Layout component for the admin panel
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components to render in the main content area
 */
const AdminLayout = ({ children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Toggle sidebar visibility (for mobile)
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Navigation items for the sidebar
  const navItems = [
    { path: '/admin/dashboard', icon: <FaHome />, label: 'Dashboard' },
    { path: '/admin/agents', icon: <FaRobot />, label: 'Manage Agents' },
    { path: '/admin/users', icon: <FaUsers />, label: 'Manage Users' },
    { path: '/admin/pricing', icon: <FaMoneyBillWave />, label: 'Pricing' },
    { path: '/admin/analytics', icon: <FaChartLine />, label: 'Analytics' },
    { path: '/admin/settings', icon: <FaCog />, label: 'Settings' }
  ];
  
  return (
    <div className="admin-layout">
      {/* Mobile toggle button */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>
      
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="admin-logo">
          <h2>Admin Panel</h2>
        </div>
        
        <nav className="admin-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link 
                  to={item.path} 
                  className={location.pathname === item.path ? 'active' : ''}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="admin-sidebar-footer">
          <p>Logged in as: <strong>Admin</strong></p>
          <Link to="/logout" className="logout-btn">Logout</Link>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="admin-main">
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout; 