const cacheControl = (duration) => (req, res, next) => {
  // Skip caching for authenticated routes
  if (req.headers.authorization) {
    res.setHeader('Cache-Control', 'no-store');
    return next();
  }

  // Cache public routes
  res.setHeader('Cache-Control', `public, max-age=${duration}`);
  next();
};

module.exports = cacheControl;
