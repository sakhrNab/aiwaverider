require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const { initializePassport } = require('./config/passport');
const { db } = require('./config/firebase');

// Initialize express
const app = express();

// Environment variables
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || (isProduction ? 8080 : 4000);

// ------------------ CORS Configuration ------------------
const allowedOrigins = isProduction
  ? (process.env.CORS_ORIGINS || '').split(',').map(origin => origin.trim())
  : ['http://localhost:5173']; // Frontend origin

// Create a CORS middleware function with proper configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, or same origin)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Add security headers
app.use(helmet());

// Session configuration - required for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport and restore authentication state from session
initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

// ------------------ Rate Limiting ------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many requests, please try again in 15 minutes!',
});

// Apply rate limiting only in production or development
if (isProduction || isDevelopment) {
  app.use(limiter);
}

// Add rate limiting specifically for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many login attempts, please try again later.' });
  }
});

// Track login attempts
const loginAttempts = new Map();

// Clear login attempts every 15 minutes
setInterval(() => {
  loginAttempts.clear();
}, 15 * 60 * 1000);

// Import main router
const apiRoutes = require('./routes/index');

// Mount API routes
app.use('/api', apiRoutes);

// Enhanced logging
app.use((req, res, next) => {
  let start = Date.now();
  res.on('finish', () => {
    let duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Check if agents collection exists in development mode
if (!isProduction) {
  // Check if agents collection exists
  const checkAgentsCollection = async () => {
    try {
      console.log('Checking if agents collection exists...');
      const agentsSnapshot = await db.collection('agents').limit(1).get();
      if (agentsSnapshot.empty) {
        console.log('⚠️ Agents collection is empty or does not exist.');
        console.log('You may want to run: npm run check:agents');
        console.log('This will populate the database with mock agents for development.');
      } else {
        console.log('✅ Agents collection exists with data.');
      }
    } catch (error) {
      console.error('Error checking agents collection:', error);
    }
  };
  
  // Run the check
  checkAgentsCollection();
}

// ------------------ Start the Server ------------------
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
