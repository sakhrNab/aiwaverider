import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaUsers, 
  FaRobot, 
  FaChartBar, 
  FaCog, 
  FaSignOutAlt, 
  FaDollarSign,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import './AdminLayout.css';

/**
 * Admin Layout component for admin pages
 * @param {Object} props Component props
 * @param {React.ReactNode} props.children Content to render inside layout
 * @returns {JSX.Element} Admin layout with sidebar and content area
 */
const AdminLayout = ({ children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  
  const navItems = [
    { path: '/admin', icon: <FaHome />, label: 'Dashboard' },
    { path: '/admin/agents', icon: <FaRobot />, label: 'Manage Agents' },
    { path: '/admin/users', icon: <FaUsers />, label: 'Manage Users' },
    { path: '/admin/analytics', icon: <FaChartBar />, label: 'Analytics' },
    { path: '/admin/pricing', icon: <FaDollarSign />, label: 'Pricing' },
    { path: '/admin/settings', icon: <FaCog />, label: 'Settings' },
  ];
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <div className="admin-layout">
      {/* Mobile menu button */}
      <button 
        className="mobile-menu-button"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
      >
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>
      
      {/* Sidebar */}
      <div className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>Admin Panel</h1>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={location.pathname === item.path ? 'active' : ''}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <Link to="/signout" className="signout-button">
            <FaSignOutAlt />
            <span>Sign Out</span>
          </Link>
        </div>
      </div>
      
      {/* Main content */}
      <div className="admin-content">
        {children}
      </div>
      
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout; 