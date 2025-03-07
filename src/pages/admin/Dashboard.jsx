import React, { useState, useEffect } from 'react';
import { 
  FaRobot, 
  FaUsers, 
  FaShoppingCart, 
  FaChartLine,
  FaExclamationTriangle
} from 'react-icons/fa';
import AdminLayout from '../../components/admin/AdminLayout';
import './Dashboard.css';

/**
 * Admin Dashboard page with overview statistics
 */
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAgents: 0,
    featuredAgents: 0,
    totalUsers: 0,
    totalSales: 0,
    recentActivity: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch dashboard stats on component mount
  useEffect(() => {
    fetchDashboardStats();
  }, []);
  
  // Function to fetch dashboard statistics
  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // In a real application, this would be an API call
      // For now, we'll simulate with a timeout and mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockStats = {
        totalAgents: 42,
        featuredAgents: 8,
        totalUsers: 156,
        totalSales: 1250,
        recentActivity: [
          { id: 1, type: 'agent_created', message: 'New agent "AI Writing Assistant" created', timestamp: '2023-06-15T10:30:00Z' },
          { id: 2, type: 'user_registered', message: 'New user registered: john.doe@example.com', timestamp: '2023-06-15T09:45:00Z' },
          { id: 3, type: 'sale', message: 'New purchase: "Design Assistant Pro" - $25.00', timestamp: '2023-06-15T08:20:00Z' },
          { id: 4, type: 'agent_updated', message: 'Agent "3D Modeling Helper" updated', timestamp: '2023-06-14T16:15:00Z' },
          { id: 5, type: 'sale', message: 'New purchase: "Music Production AI" - $49.99', timestamp: '2023-06-14T14:30:00Z' }
        ]
      };
      
      setStats(mockStats);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <AdminLayout>
      <div className="admin-dashboard">
        <header className="dashboard-header">
          <h1>Admin Dashboard</h1>
        </header>
        
        {error && (
          <div className="dashboard-error">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}
        
        {loading ? (
          <div className="dashboard-loading">Loading dashboard data...</div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon agents">
                  <FaRobot />
                </div>
                <div className="stat-content">
                  <h3>Total Agents</h3>
                  <div className="stat-value">{stats.totalAgents}</div>
                  <div className="stat-label">{stats.featuredAgents} featured</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon users">
                  <FaUsers />
                </div>
                <div className="stat-content">
                  <h3>Total Users</h3>
                  <div className="stat-value">{stats.totalUsers}</div>
                  <div className="stat-label">Active accounts</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon sales">
                  <FaShoppingCart />
                </div>
                <div className="stat-content">
                  <h3>Total Sales</h3>
                  <div className="stat-value">${stats.totalSales.toLocaleString()}</div>
                  <div className="stat-label">Lifetime revenue</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon activity">
                  <FaChartLine />
                </div>
                <div className="stat-content">
                  <h3>Activity</h3>
                  <div className="stat-value">
                    {stats.recentActivity.length}
                  </div>
                  <div className="stat-label">Recent events</div>
                </div>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="activity-section">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                {stats.recentActivity.length === 0 ? (
                  <div className="no-activity">No recent activity</div>
                ) : (
                  <ul>
                    {stats.recentActivity.map(activity => (
                      <li key={activity.id} className={`activity-item ${activity.type}`}>
                        <div className="activity-time">
                          {formatDate(activity.timestamp)}
                        </div>
                        <div className="activity-message">
                          {activity.message}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="quick-actions">
              <h2>Quick Actions</h2>
              <div className="action-buttons">
                <a href="/admin/agents" className="action-button">
                  <FaRobot />
                  <span>Manage Agents</span>
                </a>
                <a href="/admin/users" className="action-button">
                  <FaUsers />
                  <span>Manage Users</span>
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default Dashboard; 