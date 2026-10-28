import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { db } from './database/repository.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Basic middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server: 'Website Maintenance & Upgrade Reporting API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

// Serve static frontend build if present (for single-process Cloudways deployment)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`[Server] Serving production client build from ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error: 'An unexpected server error occurred.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

async function startServer() {
  try {
    await db.initialize();
    await db.ensureAdminUser();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`  Website Maintenance & Upgrade Reporting Tool API  `);
      console.log(`  Listening on: http://localhost:${PORT}             `);
      console.log(`  Environment:  ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

startServer();
