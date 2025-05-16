import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { FaSave, FaSync, FaEnvelope, FaBell, FaPalette, FaQuestion, FaCheck } from 'react-icons/fa';
import { HashLoader } from 'react-spinners';
import AdminLayout from '../../components/layout/AdminLayout';
import ColorPicker from '../../components/common/ColorPicker';
import { AuthContext } from '../../contexts/AuthContext';
import './AdminSettingsPage.css';

const Settings = () => {
  const { user } = useContext(AuthContext);
  // Site settings state
  const [settings, setSettings] = useState({
    theme: {
      primaryColor: '#4A66A0',
      secondaryColor: '#7533A8',
      backgroundColor: '#1a0b2e',
      textColor: '#ffffff',
      accentColor: '#00bcd4'
    },
    notifications: {
      enableEmailNotifications: true,
      enableMarketingEmails: true,
      enableNewUserAlerts: true,
      enableNewContentAlerts: true
    },
    advertisement: {
      enableAds: false,
      adFrequency: 'low',
      adPositions: ['sidebar', 'footer']
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('theme');
  
  // Fetch settings on component mount
  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;
    
    const fetchSettings = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          if (isMounted) {
            setError('No authentication token available. Please log in again.');
            setLoading(false);
          }
          return;
        }
        
        const response = await fetch('/api/admin/settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch settings: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        if (isMounted) {
          setSettings(data);
          setLoading(false);
          
          // Clear the timeout since we loaded successfully
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        if (isMounted) {
          setError(error.message || 'Failed to load settings');
          setLoading(false);
          toast.error('Failed to load settings');
        }
      }
    };
    
    // Set a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
        setError('Loading timed out. Please try refreshing the page.');
        toast.error('Loading timed out. Please try refreshing the page.');
      }
    }, 10000);
    
    fetchSettings();
    
    // Clean up function
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []); // Only run on mount
  
  // Handle color change in theme settings
  const handleColorChange = (colorName, color) => {
    setSettings(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        [colorName]: color
      }
    }));
  };
  
  // Handle notification settings change
  const handleNotificationChange = (settingName, checked) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [settingName]: checked
      }
    }));
  };
  
  // Handle ad settings change
  const handleAdSettingChange = (settingName, value) => {
    setSettings(prev => ({
      ...prev,
      advertisement: {
        ...prev.advertisement,
        [settingName]: value
      }
    }));
  };
  
  // Handle ad positions change (multiple selection)
  const handleAdPositionChange = (position) => {
    setSettings(prev => {
      const currentPositions = prev.advertisement.adPositions;
      const updatedPositions = currentPositions.includes(position)
        ? currentPositions.filter(pos => pos !== position)
        : [...currentPositions, position];
        
      return {
        ...prev,
        advertisement: {
          ...prev.advertisement,
          adPositions: updatedPositions
        }
      };
    });
  };
  
  // Save settings
  const handleSave = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token available. Please log in again.');
      }
      
      setSaving(true);
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      toast.success('Settings saved successfully');
      
      // Apply theme changes immediately
      document.documentElement.style.setProperty('--gradient-from', settings.theme.primaryColor);
      document.documentElement.style.setProperty('--gradient-via', settings.theme.secondaryColor);
      document.documentElement.style.setProperty('--background', settings.theme.backgroundColor);
      document.documentElement.style.setProperty('--text', settings.theme.textColor);
      document.documentElement.style.setProperty('--nav-hover', settings.theme.accentColor);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  // Reset settings to default
  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('No authentication token available. Please log in again.');
        }
        
        setSaving(true);
        const response = await fetch('/api/admin/settings/reset', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to reset settings');
        }
        
        const data = await response.json();
        setSettings(data);
        
        toast.success('Settings reset to default');
      } catch (error) {
        console.error('Error resetting settings:', error);
        toast.error('Failed to reset settings');
      } finally {
        setSaving(false);
      }
    }
  };
  
  return (
    <AdminLayout>
      <div className="admin-settings">
        <div className="settings-header">
          <h1>Site Settings</h1>
          <div className="settings-actions">
            <button 
              className="reset-button" 
              onClick={handleReset}
              disabled={loading || saving}
            >
              <FaSync /> Reset to Default
            </button>
            <button 
              className="save-button" 
              onClick={handleSave}
              disabled={loading || saving}
            >
              {saving ? <FaSync className="spin" /> : <FaSave />} Save Changes
            </button>
          </div>
        </div>
        
        <div className="settings-tabs">
          <button 
            className={activeTab === 'theme' ? 'active' : ''} 
            onClick={() => setActiveTab('theme')}
          >
            <FaPalette /> Theme
          </button>
          <button 
            className={activeTab === 'notifications' ? 'active' : ''} 
            onClick={() => setActiveTab('notifications')}
          >
            <FaBell /> Notifications
          </button>
          <button 
            className={activeTab === 'advertisement' ? 'active' : ''} 
            onClick={() => setActiveTab('advertisement')}
          >
            <FaEnvelope /> Advertisements
          </button>
          <button 
            className={activeTab === 'help' ? 'active' : ''} 
            onClick={() => setActiveTab('help')}
          >
            <FaQuestion /> Help
          </button>
        </div>
        
        <div className="settings-content">
          {loading ? (
            <div className="loading-container">
              <div className="mb-4">
                <HashLoader color="#4A66A0" size={60} />
              </div>
              <div className="loading-text">Loading settings...</div>
            </div>
          ) : error ? (
            <div className="error-container">
              <div className="error-message">{error}</div>
              <button 
                className="retry-button" 
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Theme Settings */}
              {activeTab === 'theme' && (
                <div className="theme-settings">
                  <h2>Theme Settings</h2>
                  <p className="settings-description">
                    Customize the look and feel of your website by adjusting the color scheme.
                    Changes will be applied sitewide.
                  </p>
                  
                  <div className="colors-grid">
                    <div className="color-group">
                      <label>Primary Color</label>
                      <ColorPicker 
                        color={settings.theme.primaryColor} 
                        onChange={(color) => handleColorChange('primaryColor', color)} 
                      />
                      <p className="color-description">Used for primary buttons, links and accents</p>
                    </div>
                    
                    <div className="color-group">
                      <label>Secondary Color</label>
                      <ColorPicker 
                        color={settings.theme.secondaryColor} 
                        onChange={(color) => handleColorChange('secondaryColor', color)} 
                      />
                      <p className="color-description">Used for gradients and secondary elements</p>
                    </div>
                    
                    <div className="color-group">
                      <label>Background Color (Dark Mode)</label>
                      <ColorPicker 
                        color={settings.theme.backgroundColor} 
                        onChange={(color) => handleColorChange('backgroundColor', color)} 
                      />
                      <p className="color-description">Site background in dark mode</p>
                    </div>
                    
                    <div className="color-group">
                      <label>Text Color (Dark Mode)</label>
                      <ColorPicker 
                        color={settings.theme.textColor} 
                        onChange={(color) => handleColorChange('textColor', color)} 
                      />
                      <p className="color-description">Main text color in dark mode</p>
                    </div>
                    
                    <div className="color-group">
                      <label>Accent Color</label>
                      <ColorPicker 
                        color={settings.theme.accentColor} 
                        onChange={(color) => handleColorChange('accentColor', color)} 
                      />
                      <p className="color-description">Used for highlights and hover states</p>
                    </div>
                  </div>
                  
                  <div className="theme-preview">
                    <h3>Theme Preview</h3>
                    <div 
                      className="preview-box" 
                      style={{ 
                        background: settings.theme.backgroundColor,
                        color: settings.theme.textColor
                      }}
                    >
                      <div className="preview-header" style={{ 
                        backgroundImage: `linear-gradient(to right, ${settings.theme.primaryColor}, ${settings.theme.secondaryColor})`
                      }}>
                        Header
                      </div>
                      <div className="preview-content">
                        <h4>Content Title</h4>
                        <p>This is how your content will look with the selected color scheme.</p>
                        <button style={{ 
                          backgroundColor: settings.theme.primaryColor,
                          color: '#ffffff'
                        }}>
                          Primary Button
                        </button>
                        <a href="#preview" style={{ color: settings.theme.accentColor }}>
                          This is a link
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Notification Settings */}
              {activeTab === 'notifications' && (
                <div className="notification-settings">
                  <h2>Notification Settings</h2>
                  <p className="settings-description">
                    Configure email and in-app notification settings for the entire site.
                  </p>
                  
                  <div className="settings-group">
                    <h3>Email Notifications</h3>
                    
                    <div className="setting-item">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={settings.notifications.enableEmailNotifications} 
                          onChange={(e) => handleNotificationChange('enableEmailNotifications', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <div className="setting-info">
                        <h4>Enable Email Notifications</h4>
                        <p>Master toggle for all system emails</p>
                      </div>
                    </div>
                    
                    <div className="setting-item">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={settings.notifications.enableMarketingEmails} 
                          onChange={(e) => handleNotificationChange('enableMarketingEmails', e.target.checked)}
                          disabled={!settings.notifications.enableEmailNotifications}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <div className="setting-info">
                        <h4>Marketing Emails</h4>
                        <p>Send promotional and newsletter emails to users</p>
                      </div>
                    </div>
                    
                    <div className="setting-item">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={settings.notifications.enableNewUserAlerts} 
                          onChange={(e) => handleNotificationChange('enableNewUserAlerts', e.target.checked)}
                          disabled={!settings.notifications.enableEmailNotifications}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <div className="setting-info">
                        <h4>New User Alerts</h4>
                        <p>Receive notifications when new users register</p>
                      </div>
                    </div>
                    
                    <div className="setting-item">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={settings.notifications.enableNewContentAlerts} 
                          onChange={(e) => handleNotificationChange('enableNewContentAlerts', e.target.checked)}
                          disabled={!settings.notifications.enableEmailNotifications}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <div className="setting-info">
                        <h4>Content Alerts</h4>
                        <p>Receive notifications for new posts and content</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Advertisement Settings */}
              {activeTab === 'advertisement' && (
                <div className="ad-settings">
                  <h2>Advertisement Settings</h2>
                  <p className="settings-description">
                    Configure how advertisements appear on your website.
                  </p>
                  
                  <div className="settings-group">
                    <div className="setting-item">
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={settings.advertisement.enableAds} 
                          onChange={(e) => handleAdSettingChange('enableAds', e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <div className="setting-info">
                        <h4>Enable Advertisements</h4>
                        <p>Show ads on your website</p>
                      </div>
                    </div>
                    
                    <div className="setting-item">
                      <div className="setting-info full-width">
                        <h4>Ad Frequency</h4>
                        <p>How often ads are displayed to users</p>
                        
                        <div className="radio-group">
                          <label>
                            <input 
                              type="radio" 
                              name="adFrequency" 
                              value="low" 
                              checked={settings.advertisement.adFrequency === 'low'} 
                              onChange={() => handleAdSettingChange('adFrequency', 'low')}
                              disabled={!settings.advertisement.enableAds}
                            />
                            Low
                          </label>
                          <label>
                            <input 
                              type="radio" 
                              name="adFrequency" 
                              value="medium" 
                              checked={settings.advertisement.adFrequency === 'medium'} 
                              onChange={() => handleAdSettingChange('adFrequency', 'medium')}
                              disabled={!settings.advertisement.enableAds}
                            />
                            Medium
                          </label>
                          <label>
                            <input 
                              type="radio" 
                              name="adFrequency" 
                              value="high" 
                              checked={settings.advertisement.adFrequency === 'high'} 
                              onChange={() => handleAdSettingChange('adFrequency', 'high')}
                              disabled={!settings.advertisement.enableAds}
                            />
                            High
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="setting-item">
                      <div className="setting-info full-width">
                        <h4>Ad Positions</h4>
                        <p>Where ads will be displayed on your site</p>
                        
                        <div className="checkbox-group">
                          <label>
                            <input 
                              type="checkbox" 
                              checked={settings.advertisement.adPositions.includes('header')} 
                              onChange={() => handleAdPositionChange('header')}
                              disabled={!settings.advertisement.enableAds}
                            />
                            Header
                          </label>
                          <label>
                            <input 
                              type="checkbox" 
                              checked={settings.advertisement.adPositions.includes('sidebar')} 
                              onChange={() => handleAdPositionChange('sidebar')}
                              disabled={!settings.advertisement.enableAds}
                            />
                            Sidebar
                          </label>
                          <label>
                            <input 
                              type="checkbox" 
                              checked={settings.advertisement.adPositions.includes('content')} 
                              onChange={() => handleAdPositionChange('content')}
                              disabled={!settings.advertisement.enableAds}
                            />
                            Within Content
                          </label>
                          <label>
                            <input 
                              type="checkbox" 
                              checked={settings.advertisement.adPositions.includes('footer')} 
                              onChange={() => handleAdPositionChange('footer')}
                              disabled={!settings.advertisement.enableAds}
                            />
                            Footer
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Help Tab */}
              {activeTab === 'help' && (
                <div className="help-settings">
                  <h2>Settings Help</h2>
                  <p className="settings-description">
                    Learn how to use the settings panel effectively.
                  </p>
                  
                  <div className="help-section">
                    <h3>Theme Settings</h3>
                    <p>
                      The theme settings allow you to customize the look and feel of your website. 
                      Changes to colors will affect the entire site's appearance. To see your changes in real-time,
                      check the theme preview below the color pickers.
                    </p>
                    
                    <h3>Notification Settings</h3>
                    <p>
                      Configure email notifications for both administrators and users.
                      The master toggle "Enable Email Notifications" must be on for any email notifications to be sent.
                    </p>
                    
                    <h3>Advertisement Settings</h3>
                    <p>
                      Control where and how often advertisements appear on your site.
                      Turning off the "Enable Advertisements" toggle will hide all ads regardless of other settings.
                    </p>
                    
                    <h3>Need More Help?</h3>
                    <p>
                      If you need additional assistance, please contact support at <a href="mailto:support@aiwaverider.com">support@aiwaverider.com</a>
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings; 