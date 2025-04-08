/**
 * Swagger Configuration
 * 
 * This file configures the OpenAPI documentation for the API.
 */
const expressJSDocSwagger = require('express-jsdoc-swagger');

const options = {
  info: {
    version: '1.0.0',
    title: 'AI Wave Rider API',
    description: 'API documentation for the AI Wave Rider platform',
    license: {
      name: 'Private',
    },
  },
  security: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
  baseDir: __dirname + '/..',
  filesPattern: [
    '../routes/**/*.js',
    '../controllers/**/*.js',
  ],
  swaggerUIPath: '/api/docs',
  exposeApiDocs: true,
  apiDocsPath: '/api/api-docs',
  notRequiredAsNullable: false,
  sortEndpoints: 'method',
};

/**
 * Setup Swagger with Express
 * @param {Object} app - Express app instance
 */
const setupSwagger = (app) => {
  const expressJSDocSwaggerInstance = expressJSDocSwagger(app);
  expressJSDocSwaggerInstance(options);
};

module.exports = {
  setupSwagger,
}; 