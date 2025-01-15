// backend/middleware/auth.js

const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateJWT = (req, res, next) => {
    const token = req.cookies.token;
  
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
  
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      req.user = user;
      next();
    } catch (err) {
      console.error('JWT Verification Error:', err);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
module.exports = authenticateJWT;
