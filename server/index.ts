// server/index.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';

// Load env variables
dotenv.config();

// Import your routes
import apiRoutes from './routes/index'; // adjust path if your routes folder is named differently

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Mount API routes (all /api/… endpoints)
app.use('/api', apiRoutes);

// -------------------- Serve React frontend -------------------- //
// Serve static files from /public (Vite build output)
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// For any non-API route, send back index.html (SPA routing support)
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});
// -------------------- End frontend serve -------------------- //

// Port for Render or local
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`[express] serving on port ${PORT}`);
});
