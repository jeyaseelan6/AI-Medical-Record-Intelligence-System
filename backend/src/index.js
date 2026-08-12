import app from './app.js';

const PORT = process.env.PORT || 5000;

// Start standalone HTTP listener for local development / container execution
const server = app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`  MedAI Clinical Engine successfully started on Port ${PORT}  `);
  console.log(`  Local Endpoint: http://localhost:${PORT}                      `);
  console.log(`=============================================================`);
});

// Graceful shutdown handling
const gracefulShutdown = () => {
  console.log('\n[Server] Shutting down gracefully...');
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
