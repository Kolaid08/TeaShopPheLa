import app from './app';
import { config } from './config/index';
import { seedDatabaseIfEmpty } from './utils/seed';

// Auto-seed database if empty on server boot
seedDatabaseIfEmpty();

const server = app.listen(config.port, () => {
  console.log(`==================================================`);
  console.log(`  Phêla Shop Management API System Running...`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Base Endpoint: http://localhost:${config.port}/api/${config.apiVersion}`);
  console.log(`  Health Endpoint: http://localhost:${config.port}/health`);
  console.log(`==================================================`);
});

// Handle graceful shutdowns
const shutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down local Express server...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
