import './prestart.js';
import express from 'express';
import cors from 'cors';
import path from 'path';

// Import secure clinical routers
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import documentRoutes from './routes/document.routes.js';
import timelineRoutes from './routes/timeline.routes.js';
import insightRoutes from './routes/insight.routes.js';
import qaRoutes from './routes/qa.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';

const app = express();

// Configure CORS for production domains and local development
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser or same-origin requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // Explicit allowed origin or wildcard match
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow development localhost
    if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }

    // Default: allow with CORS headers (production frontend domain)
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Body parsers for JSON and urlencoded payloads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static uploaded medical records (local dev fallback)
const uploadsPath = path.resolve('uploads');
app.use('/uploads', express.static(uploadsPath));

// Telemetry & Health Checks
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MedAI Clinical Engine is running smoothly.',
    environment: process.env.NODE_ENV || 'production',
    runtime: process.env.AWS_EXECUTION_ENV ? 'AWS Lambda' : 'Node.js Standalone',
    timestamp: new Date()
  });
});

// Register API resource routers
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/ask', qaRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Fallback for unregistered paths (404)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.originalUrl}`
  });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('[Global Error Middleware] Caught exception:', err.stack || err.message);
  
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An internal clinical engine error occurred.'
  });
});

export default app;
export { app };
