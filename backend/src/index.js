import './prestart.js';
import express from 'express';
import cors from 'cors';
import path from 'path';

// Import secure routes
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import documentRoutes from './routes/document.routes.js';
import timelineRoutes from './routes/timeline.routes.js';
import insightRoutes from './routes/insight.routes.js';
import qaRoutes from './routes/qa.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for cross-domain dashboard requests
app.use(cors());

// Body parsers for JSON and urlencoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded medical records securely
const uploadsPath = path.resolve('uploads');
app.use('/uploads', express.static(uploadsPath));

// Telemetry & Health Checks
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MedAI Clinical Engine is running smoothly.',
    timestamp: new Date()
  });
});

// Register api resource routers
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

// Scalable, central error handling middleware
app.use((err, req, res, next) => {
  console.error('[Global Error Middleware] Caught unexpected exception:', err.stack || err.message);
  
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An internal clinical engine error occurred.'
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`  MedAI Clinical Engine successfully started on Port ${PORT}  `);
  console.log(`  Local Endpoint: http://localhost:${PORT}                      `);
  console.log(`=============================================================`);
});
