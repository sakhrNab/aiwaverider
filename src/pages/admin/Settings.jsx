import React, { useState } from 'react';
import { FaSave, FaExclamationTriangle } from 'react-icons/fa';
import AdminLayout from '../../components/admin/AdminLayout';
import './Settings.css';

/**
 * Admin Settings page
 */
const Settings = () => {
  const [settings, setSettings] = useState({
    general: {
      siteName: 'AI Wave Rider',
      siteDescription: 'Marketplace for AI Agents',
      contactEmail: 'admin@example.com',
      enableRegistration: true
    },
    appearance: {
      theme: 'light',
      primaryColor: '#1890ff',
      secondaryColor: '#52c41a',
      logoUrl: '/logo.png'
    },
    notifications: {
      enableEmailNotifications: true,
      notifyOnNewUser: true,
      notifyOnNewSale: true,
      notifyOnNewAgent: true
    },
    security: {
      requireEmailVerification: true,
      twoFactorAuth: false,
      sessionTimeout: 60,
      passwordMinLength: 8
    }
  });
  
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Handle input change
  const handleInputChange = (section, field, value) => {
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [field]: value
      }
    });
  };
  
  // Handle checkbox change
  const handleCheckboxChange = (section, field) => {
    setSettings({
      ...settings,
      [section]: {
        ...settings[section],
        [field]: !settings[section][field]
      }
    });
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      // In a real application, this would be an API call
      // For now, we'll simulate with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate success
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again later.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <AdminLayout>
      <div className="settings-page">
        <header className="page-header">
          <h1>Admin Settings</h1>
        </header>
        
        {error && (
          <div className="error-message">
            <FaExclamationTriangle />
            <span>{error}</span>
          </div>
        )}
        
        {saveSuccess && (
          <div className="success-message">
            Settings saved successfully!
          </div>
        )}
        
        <div className="settings-container">
          <div className="settings-tabs">
            <button 
              className={activeTab === 'general' ? 'active' : ''} 
              onClick={() => setActiveTab('general')}
            >
              General
            </button>
            <button 
              className={activeTab === 'appearance' ? 'active' : ''} 
              onClick={() => setActiveTab('appearance')}
            >
              Appearance
            </button>
            <button 
              className={activeTab === 'notifications' ? 'active' : ''} 
              onClick={() => setActiveTab('notifications')}
            >
              Notifications
            </button>
            <button 
              className={activeTab === 'security' ? 'active' : ''} 
              onClick={() => setActiveTab('security')}
            >
              Security
            </button>
          </div>
          
          <div className="settings-content">
            <form onSubmit={handleSubmit}>
              {/* General Settings */}
              <div className={`tab-content ${activeTab === 'general' ? 'active' : ''}`}>
                <h2>General Settings</h2>
                
                <div className="form-group">
                  <label htmlFor="siteName">Site Name</label>
                  <input
                    type="text"
                    id="siteName"
                    value={settings.general.siteName}
                    onChange={(e) => handleInputChange('general', 'siteName', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="siteDescription">Site Description</label>
                  <textarea
                    id="siteDescription"
                    value={settings.general.siteDescription}
                    onChange={(e) => handleInputChange('general', 'siteDescription', e.target.value)}
                    rows="3"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="contactEmail">Contact Email</label>
                  <input
                    type="email"
                    id="contactEmail"
                    value={settings.general.contactEmail}
                    onChange={(e) => handleInputChange('general', 'contactEmail', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    id="enableRegistration"
                    checked={settings.general.enableRegistration}
                    onChange={() => handleCheckboxChange('general', 'enableRegistration')}
                  />
                  <label htmlFor="enableRegistration">Enable User Registration</label>
                </div>
              </div>
              
              {/* Appearance Settings */}
              <div className={`tab-content ${activeTab === 'appearance' ? 'active' : ''}`}>
                <h2>Appearance Settings</h2>
                
                <div className="form-group">
                  <label htmlFor="theme">Theme</label>
                  <select
                    id="theme"
                    value={settings.appearance.theme}
                    onChange={(e) => handleInputChange('appearance', 'theme', e.target.value)}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System Default</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="primaryColor">Primary Color</label>
                  <div className="color-input">
                    <input
                      type="color"
                      id="primaryColor"
                      value={settings.appearance.primaryColor}
                      onChange={(e) => handleInputChange('appearance', 'primaryColor', e.target.value)}
                    />
                    <input
                      type="text"
                      value={settings.appearance.primaryColor}
                      onChange={(e) => handleInputChange('appearance', 'primaryColor', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="secondaryColor">Secondary Color</label>
                  <div className="color-input">
                    <input
                      type="color"
                      id="secondaryColor"
                      value={settings.appearance.secondaryColor}
                      onChange={(e) => handleInputChange('appearance', 'secondaryColor', e.target.value)}
                    />
                    <input
                      type="text"
                      value={settings.appearance.secondaryColor}
                      onChange={(e) => handleInputChange('appearance', 'secondaryColor', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="logoUrl">Logo URL</label>
                  <input
                    type="text"
                    id="logoUrl"
                    value={settings.appearance.logoUrl}
                    onChange={(e) => handleInputChange('appearance', 'logoUrl', e.target.value)}
                  />
                </div>
              </div>
              
              {/* Notifications Settings */}
              <div className={`tab-content ${activeTab === 'notifications' ? 'active' : ''}`}>
                <h2>Notification Settings</h2>
                
                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    id="enableEmailNotifications"
                    checked={settings.notifications.enableEmailNotifications}
                    onChange={() => handleCheckboxChange('notifications', 'enableEmailNotifications')}
                  />
                  <label htmlFor="enableEmailNotifications">Enable Email Notifications</label>
                </div>
                
                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    id="notifyOnNewUser"
                    checked={settings.notifications.notifyOnNewUser}
                    onChange={() => handleCheckboxChange('notifications', 'notifyOnNewUser')}
                  />
                  <label htmlFor="notifyOnNewUser">Notify on New User Registration</label>
                </div>
                
                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    id="notifyOnNewSale"
                    checked={settings.notifications.notifyOnNewSale}
                    onChange={() => handleCheckboxChange('notifications', 'notifyOnNewSale')}
                  />
                  <label htmlFor="notifyOnNewSale">Notify on New Sale</label>
                </div>
                
                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    id="notifyOnNewAgent"
                    checked={settings.notifications.notifyOnNewAgent}
                    onChange={() => handleCheckboxChange('notifications', 'notifyOnNewAgent')}
                  />
                  <label htmlFor="notifyOnNewAgent">Notify on New Agent Creation</label>
                </div>
              </div>
              
              {/* Security Settings */}
              <div className={`tab-content ${activeTab === 'security' ? 'active' : ''}`}>
                <h2>Security Settings</h2>
                
                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    id="requireEmailVerification"
                    checked={settings.security.requireEmailVerification}
                    onChange={() => handleCheckboxChange('security', 'requireEmailVerification')}
                  />
                  <label htmlFor="requireEmailVerification">Require Email Verification</label>
                </div>
                
                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    id="twoFactorAuth"
                    checked={settings.security.twoFactorAuth}
                    onChange={() => handleCheckboxChange('security', 'twoFactorAuth')}
                  />
                  <label htmlFor="twoFactorAuth">Enable Two-Factor Authentication</label>
                </div>
                
                <div className="form-group">
                  <label htmlFor="sessionTimeout">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    id="sessionTimeout"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => handleInputChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    min="5"
                    max="1440"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="passwordMinLength">Minimum Password Length</label>
                  <input
                    type="number"
                    id="passwordMinLength"
                    value={settings.security.passwordMinLength}
                    onChange={(e) => handleInputChange('security', 'passwordMinLength', parseInt(e.target.value))}
                    min="6"
                    max="32"
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : (
                    <>
                      <FaSave />
                      <span>Save Settings</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings; 