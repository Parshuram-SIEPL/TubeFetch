// server/routes.ts
import express from 'express';
import { db } from './db';
import { apiKeys, apiUsage } from '../shared/schema';

const router = express.Router();

// GET all API keys
router.get('/api/keys', async (req, res) => {
  try {
    const keys = await db.select().from(apiKeys);
    res.json({ success: true, keys });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to list API keys' });
  }
});

// POST new API key
router.post('/api/keys', async (req, res) => {
  try {
    const newKey = req.body; // adjust to your schema
    await db.insert(apiKeys).values(newKey);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to insert API key' });
  }
});

// GET usage data
router.get('/api/usage', async (req, res) => {
  try {
    const usage = await db.select().from(apiUsage);
    res.json({ success: true, usage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch usage' });
  }
});

export default router;
