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
const paymentsRoutes = require('./payments');
const recommendationsRoutes = require('./recommendations');
const aiToolsRoutes = require('./ai-tools');
const adminRoutes = require('./admin');
const adminEmailRoutes = require('./admin/email');
const chatRoutes = require('./chatRoutes');
const emailRoutes = require('./api/email');

// Mount routes - these will all be under /api in the main app
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/posts', postsRoutes);
router.use('/profile', profileRoutes);
router.use('/agents', agentsRoutes);
router.use('/agent', agentRoutes);
router.use('/wishlists', wishlistsRoutes);
router.use('/agent-prices', pricesRoutes);
router.use('/test', testRoutes);
router.use('/payments', paymentsRoutes);
router.use('/recommendations', recommendationsRoutes);
router.use('/ai-tools', aiToolsRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/email', adminEmailRoutes);
// Note: /api/chat is mounted separately in the main app file
router.use('/email', emailRoutes);

// Add redirect for product routes to the agents routes
// This handles legacy or alternative product URLs
router.get('/product/:productId', (req, res) => {
  console.log(`Redirecting /product/${req.params.productId} to /agents/${req.params.productId}`);
  res.redirect(`/agents/${req.params.productId}`);
});

// Add API endpoint for product/:id that forwards to agents/:id
router.get('/product/:productId', (req, res) => {
  const productId = req.params.productId;
  console.log(`Forwarding API request from /product/${productId} to /agents/${productId}`);
  
  // Forward the request to the agents API endpoint
  req.url = `/agents/${productId}`;
  router.handle(req, res);
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

module.exports = router; 