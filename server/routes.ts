// server/routes.ts
import express from 'express';
import { db } from './db';
import { apiKeys, apiUsage } from '../shared/schema';
import { requireAdmin } from './auth';

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

// Unprotected usage endpoint
router.get('/usage', async (req, res) => {
  try {
    const usage = await db.select().from(apiUsage);
    res.json({ success: true, usage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch usage' });
  }
});

export default router;
