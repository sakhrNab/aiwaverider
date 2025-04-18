const express = require('express');
const router = express.Router();
const validateFirebaseToken = require('../middleware/authenticate');
const { isAdmin } = require('../middleware/auth');
const { getSettings, updateSettings, resetSettings } = require('../models/siteSettings');
const { db } = require('../config/firebase');

/**
 * GET /api/admin/settings
 * Get site settings (admin only)
 */
router.get('/settings', validateFirebaseToken, isAdmin, async (req, res) => {
  try {
    const settings = await getSettings(db);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching site settings:', error);
    res.status(500).json({ error: 'Failed to fetch site settings' });
  }
});

/**
 * PUT /api/admin/settings
 * Update site settings (admin only)
 */
router.put('/settings', validateFirebaseToken, isAdmin, async (req, res) => {
  try {
    const updatedSettings = await updateSettings(db, req.body);
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating site settings:', error);
    res.status(500).json({ error: 'Failed to update site settings' });
  }
});

/**
 * POST /api/admin/settings/reset
 * Reset site settings to default values (admin only)
 */
router.post('/settings/reset', validateFirebaseToken, isAdmin, async (req, res) => {
  try {
    const defaultSettings = await resetSettings(db);
    res.json(defaultSettings);
  } catch (error) {
    console.error('Error resetting site settings:', error);
    res.status(500).json({ error: 'Failed to reset site settings' });
  }
});

// Export the router
module.exports = router; 