#!/usr/bin/env node

/**
 * Development server that can execute Vercel serverless functions
 * This allows us to test real API integration in development
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: false
}));

app.use(express.json());

// Import serverless functions
async function loadServerlessFunction(functionPath) {
  try {
    const fullPath = `file://${join(process.cwd(), functionPath)}`;
    const module = await import(fullPath);
    return module.default;
  } catch (error) {
    console.error(`Failed to load serverless function: ${functionPath}`, error);
    return null;
  }
}

// Serverless function wrapper
function createFunctionHandler(functionPath) {
  return async (req, res) => {
    try {
      const handler = await loadServerlessFunction(functionPath);
      if (!handler) {
        console.error(`Handler not found for: ${functionPath}`);
        return res.status(500).json({ error: 'Function not found', path: functionPath });
      }
      console.log(`📡 Executing serverless function: ${functionPath}`);
      await handler(req, res);
    } catch (error) {
      console.error('Function execution error:', error);
      res.status(500).json({ error: 'Function execution failed', details: error.message });
    }
  };
}

// API Routes - Mirror Vercel structure
app.get('/api/instantly/campaigns', createFunctionHandler(join(__dirname, 'api/instantly/campaigns.js')));
app.get('/api/instantly/analytics', createFunctionHandler(join(__dirname, 'api/instantly/analytics.js')));
app.post('/api/instantly/leads', createFunctionHandler(join(__dirname, 'api/instantly/leads.js')));
app.get('/api/instantly/analytics-overview', createFunctionHandler(join(__dirname, 'api/instantly/analytics-overview.js')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Development API server running',
    timestamp: new Date().toISOString(),
    environment: 'development'
  });
});

// Proxy to Vite dev server for frontend assets (only non-API routes)
app.use('/', createProxyMiddleware({
  target: 'http://localhost:5174', // Updated port since Vite is on 5174
  changeOrigin: true,
  ws: true,
  // Don't proxy API routes
  filter: (pathname, req) => {
    return !pathname.startsWith('/api/');
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy error' });
    }
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 Proxying ${req.method} ${req.url} to Vite dev server`);
  }
}));

app.listen(PORT, () => {
  console.log(`
🚀 Development server started on http://localhost:${PORT}

📡 API endpoints available:
  - GET  /api/instantly/campaigns
  - GET  /api/instantly/analytics?id=CAMPAIGN_ID
  - POST /api/instantly/leads
  - GET  /api/instantly/analytics-overview?id=CAMPAIGN_ID
  - GET  /api/health

🔄 Frontend proxied from: http://localhost:5173

🎯 This server executes real serverless functions with real Instantly API calls!
  `);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});