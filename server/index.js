const express = require('express');
const cors = require('cors');
const path = require('path');
const paymentRoutes = require('./api/paymentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

// Important: This ensures we handle JSON for regular routes
// but keeps raw body for Stripe webhooks
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/stripe-webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// API Routes
app.use('/api/payments', paymentRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 