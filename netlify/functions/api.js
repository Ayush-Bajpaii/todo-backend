// Netlify Function entry point – wraps the Express app.
const serverless = require('serverless-http');
const app = require('../../src/app');

module.exports.handler = serverless(app);
