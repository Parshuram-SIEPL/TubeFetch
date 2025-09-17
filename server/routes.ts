// server/routes.ts
import express from 'express';
import { db } from './db';
import { apiKeys, apiUsage } from '../shared/schema';
import { requireAdmin } from './auth';

// Middleware for API key authentication
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API key missing' });
  }
  // Check if API key exists and is active
  db.select().from(apiKeys).where({ key_id: apiKey, is_active: true }).then(keys => {
    if (keys.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }
    // Attach key info if needed
    req.apiKeyInfo = keys[0];
    next();
  }).catch(() => res.status(500).json({ success: false, error: 'Database error' }));
}

const router = express.Router();

// Protected GET all API keys
router.get('/keys', requireAdmin, async (req, res) => {
  try {
    const keys = await db.select().from(apiKeys);
    res.json({ success: true, keys });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to list API keys' });
  }
});

// Protected POST new API key
router.post('/keys', requireAdmin, async (req, res) => {
  try {
    const newKey = req.body; // adjust to your schema
    await db.insert(apiKeys).values(newKey);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to insert API key' });
  }
});

// Unprotected usage endpoint (can be public, or add admin if needed)
router.get('/usage', async (req, res) => {
  try {
    const usage = await db.select().from(apiUsage);
    res.json({ success: true, usage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch usage' });
  }
});

// Example: Protect /analyze with API key
router.post('/analyze', requireApiKey, async (req, res) => {
  // ... your video analysis logic ...
  res.json({ success: true, data: {} }); // stub
});

export default router;
