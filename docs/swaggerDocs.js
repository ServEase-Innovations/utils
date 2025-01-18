const swaggerJsdoc = require('swagger-jsdoc');
const { serverUrl } = require('../config/mongoDBConfig');  // Assuming you have a config.js file for environment variables
const { controller } = require('../controllers/mongoDBControllers');
// Swagger Definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'API to interact with MongoDB (DocumentDB)',
  },
  servers: [
    {
      url: serverUrl,
    },
  ],
};

// Swagger Options
const options = {
  swaggerDefinition,
  apis: ['./controllers/mongoDBControllers.js'],  // Path to the Swagger annotations in your code
};

// Generate Swagger Specification
const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };
