// server/index.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';   // ✅ needed for __dirname in ESM

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import apiRoutes from './routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Mount routes at /api
app.use('/api', apiRoutes);

// Serve static files from /public (Vite build output)
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// For any non-API route, send back index.html (SPA routing support)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`[express] serving on port ${PORT}`);
});
