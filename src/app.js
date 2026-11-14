const express = require('express');
const env = require('./config/env');
const taskRoutes = require('./routes/tasks');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Minimal CORS (only matters for browser clients; the Android app ignores it).
const allowedOrigins = env.corsOrigin.split(',').map((o) => o.trim());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Routes are mounted on both prefixes:
//  - /api                    -> local server and Netlify redirect (/api/* -> function)
//  - /.netlify/functions/api -> direct function URL
const api = express.Router();

// Public health check (no auth) – handy to confirm the deploy works.
api.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

api.use('/tasks', taskRoutes);

app.use(['/api', '/.netlify/functions/api'], api);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
