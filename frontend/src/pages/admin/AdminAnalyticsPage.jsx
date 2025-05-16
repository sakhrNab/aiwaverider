import React, { useState, useEffect } from 'react';
import { 
  FaChartLine, 
  FaChartBar, 
  FaChartPie, 
  FaCalendarAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import AdminLayout from '../../components/layout/AdminLayout';
import './AdminAnalyticsPage.css';

/**
 * Admin Analytics page with charts and metrics
 */
const Analytics = () => {
  const [timeRange, setTimeRange] = useState('week');
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    totalUsers: 0,
    newUsers: 0,
    activeAgents: 0,
    salesData: [],
    userGrowthData: [],
    topAgents: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch analytics data on component mount and when timeRange changes
  useEffect(() => {
    fetchAnalyticsData(timeRange);
  }, [timeRange]);
  
  // Function to fetch analytics data
  const fetchAnalyticsData = async (range) => {
    setLoading(true);
    try {
      // In a real application, this would be an API call
      // For now, we'll simulate with a timeout and mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock data based on the selected time range
      const mockData = generateMockData(range);
      setMetrics(mockData);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate mock data based on the selected time range
  const generateMockData = (range) => {
    // Different data for different time ranges
    let salesData = [];
    let userGrowthData = [];
    let totalSales = 0;
    let totalUsers = 0;
    let newUsers = 0;
    
    // Generate data points based on the selected range
    const dataPoints = range === 'week' ? 7 : range === 'month' ? 30 : 12;
    const labels = generateLabels(range, dataPoints);
    
    for (let i = 0; i < dataPoints; i++) {
      // Generate random sales data
      const sales = Math.floor(Math.random() * 1000) + 500;
      salesData.push({ label: labels[i], value: sales });
      totalSales += sales;
      
      // Generate random user growth data
      const users = Math.floor(Math.random() * 20) + 5;
      userGrowthData.push({ label: labels[i], value: users });
      newUsers += users;
    }
    
    totalUsers = 150 + newUsers;
    
    // Generate top agents data
    const topAgents = [
      { id: 1, name: 'AI Writing Assistant', sales: 2450, growth: 15 },
      { id: 2, name: 'Design Helper Pro', sales: 1980, growth: 8 },
      { id: 3, name: 'Code Reviewer', sales: 1540, growth: 12 },
      { id: 4, name: 'Data Analyzer', sales: 1350, growth: -3 },
      { id: 5, name: 'Language Translator', sales: 1120, growth: 5 }
    ];
    
    return {
      totalSales,
      totalUsers,
      newUsers,
      activeAgents: 42,
      salesData,
      userGrowthData,
      topAgents
    };
  };
  
  // Generate labels for the charts based on the selected time range
  const generateLabels = (range, count) => {
    const labels = [];
    const today = new Date();
    
    if (range === 'week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 0; i < count; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        labels.unshift(days[date.getDay()]);
      }
    } else if (range === 'month') {
      for (let i = 0; i < count; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        labels.unshift(`${date.getMonth() + 1}/${date.getDate()}`);
      }
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 0; i < count; i++) {
        labels.unshift(months[i]);
      }
    }
    
    return labels;
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Calculate the maximum value for the chart
  const getMaxValue = (data) => {
    return Math.max(...data.map(item => item.value)) * 1.2;
  };
  
  return (
    <AdminLayout>
      <div className="analytics-page">
        <header className="page-header">
          <h1>Analytics Dashboard</h1>
          <div className="time-range-selector">
            <button 
              className={timeRange === 'week' ? 'active' : ''} 
              onClick={() => setTimeRange('week')}
            >
              Week
            </button>
            <button 
              className={timeRange === 'month' ? 'active' : ''} 
              onClick={() => setTimeRange('month')}
            >
              Month
            </button>
            <button 
              className={timeRange === 'year' ? 'active' : ''} 
              onClick={() => setTimeRange('year')}
            >
              Year
            </button>
          </div>
        </header>
        
        {error && (
          <div className="error-message">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}
        
        {loading ? (
          <div className="loading-message">Loading analytics data...</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon sales">
                  <FaChartLine />
                </div>
                <div className="metric-content">
                  <h3>Total Sales</h3>
                  <div className="metric-value">{formatCurrency(metrics.totalSales)}</div>
                  <div className="metric-label">Last {timeRange}</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon users">
                  <FaChartBar />
                </div>
                <div className="metric-content">
                  <h3>Total Users</h3>
                  <div className="metric-value">{metrics.totalUsers}</div>
                  <div className="metric-label">{metrics.newUsers} new users</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon agents">
                  <FaChartPie />
                </div>
                <div className="metric-content">
                  <h3>Active Agents</h3>
                  <div className="metric-value">{metrics.activeAgents}</div>
                  <div className="metric-label">Generating revenue</div>
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon date">
                  <FaCalendarAlt />
                </div>
                <div className="metric-content">
                  <h3>Time Period</h3>
                  <div className="metric-value">{timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}</div>
                  <div className="metric-label">Current view</div>
                </div>
              </div>
            </div>
            
            {/* Charts Section */}
            <div className="charts-section">
              <div className="chart-container">
                <h2>Sales Trend</h2>
                <div className="chart">
                  <div className="chart-bars">
                    {metrics.salesData.map((item, index) => (
                      <div 
                        key={index} 
                        className="chart-bar"
                        style={{ 
                          height: `${(item.value / getMaxValue(metrics.salesData)) * 100}%` 
                        }}
                      >
                        <div className="tooltip">{formatCurrency(item.value)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="chart-labels">
                    {metrics.salesData.map((item, index) => (
                      <div key={index} className="chart-label">{item.label}</div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="chart-container">
                <h2>User Growth</h2>
                <div className="chart">
                  <div className="chart-bars">
                    {metrics.userGrowthData.map((item, index) => (
                      <div 
                        key={index} 
                        className="chart-bar user-growth"
                        style={{ 
                          height: `${(item.value / getMaxValue(metrics.userGrowthData)) * 100}%` 
                        }}
                      >
                        <div className="tooltip">{item.value} users</div>
                      </div>
                    ))}
                  </div>
                  <div className="chart-labels">
                    {metrics.userGrowthData.map((item, index) => (
                      <div key={index} className="chart-label">{item.label}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Top Agents Table */}
            <div className="top-agents-section">
              <h2>Top Performing Agents</h2>
              <table className="top-agents-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Agent Name</th>
                    <th>Total Sales</th>
                    <th>Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topAgents.map((agent, index) => (
                    <tr key={agent.id}>
                      <td>{index + 1}</td>
                      <td>{agent.name}</td>
                      <td>{formatCurrency(agent.sales)}</td>
                      <td>
                        <span className={`growth-indicator ${agent.growth >= 0 ? 'positive' : 'negative'}`}>
                          {agent.growth >= 0 ? '+' : ''}{agent.growth}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default Analytics; 