const express = require('express');
const router = express.Router();

// Import all API routes
const authRoutes = require('./api/auth');
const usersRoutes = require('./api/users');
const postsRoutes = require('./posts');
const profileRoutes = require('./profile');
const agentsRoutes = require('./agents');
const agentRoutes = require('./agent'); 
const wishlistsRoutes = require('./wishlists');
const pricesRoutes = require('./prices');
const testRoutes = require('./test');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/posts', postsRoutes);
router.use('/profile', profileRoutes);
router.use('/agents', agentsRoutes);
router.use('/agent', agentRoutes);
router.use('/wishlists', wishlistsRoutes);
router.use('/agent-prices', pricesRoutes);
router.use('/test', testRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'development'
  });
});

module.exports = router; 