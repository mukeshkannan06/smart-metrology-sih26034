import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';

const app = createApp();

let server: http.Server | null = null;
let serverPromise: Promise<http.Server> | null = null;
let isStarting = false;

// Graceful Shutdown Handler
const handleShutdown = async (signal: string) => {
  console.log(`\n[${signal}] Received shutdown signal. Closing HTTP server and database cleanly...`);

  if (server) {
    // Immediately terminate open HTTP keep-alive connections so port 5000 is released instantly
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    server.close(async () => {
      console.log('[SHUTDOWN] HTTP server closed cleanly.');
      await disconnectDatabase();
      console.log('[SHUTDOWN] Process exiting.');
      process.exit(0);
    });
  } else {
    await disconnectDatabase();
    console.log('[SHUTDOWN] Process exiting.');
    process.exit(0);
  }

  // Force close after 10s if hanging
  setTimeout(() => {
    console.error('[SHUTDOWN] Forcing server exit after timeout.');
    process.exit(1);
  }, 10000);
};

// Register process signal handlers once
process.once('SIGTERM', () => handleShutdown('SIGTERM'));
process.once('SIGINT', () => handleShutdown('SIGINT'));

/**
 * Initializes database connection and starts listening on configured port.
 * Protected by a singleton guard to guarantee exactly one listener instance.
 */
const startServer = async (): Promise<http.Server> => {
  // Singleton guard: prevent starting server more than once in the same process
  if (server) {
    return server;
  }
  if (isStarting && serverPromise) {
    return serverPromise;
  }
  isStarting = true;

  // 1. Initialize MongoDB Atlas connection
  await connectDatabase();

  // 2. Start HTTP server
  server = app.listen(config.port, () => {
    console.log('====================================================');
    console.log('  SMART METROLOGY — SIH26034 API BACKEND');
    console.log('  Phase 4: MongoDB Atlas & Database Foundation Active');
    console.log('====================================================');
    console.log(`  Status:       Ready & Listening`);
    console.log(`  Environment:  ${config.env}`);
    console.log(`  Port:         ${config.port}`);
    console.log(`  CORS Origin:  ${Array.isArray(config.corsOrigin) ? config.corsOrigin.join(', ') : config.corsOrigin}`);
    console.log(`  Health Check: http://localhost:${config.port}/api/health`);
    console.log('====================================================');
  });

  // Attach error handler to catch port collisions gracefully
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ [SERVER] Port ${config.port} is already in use (EADDRINUSE).`);
      console.error(`👉 [SERVER] Another process is already running on port ${config.port}.`);
      console.error(`👉 [SERVER] If another terminal window is running 'npm run dev' or 'npm run dev:backend', port 5000 is occupied by that process.\n`);
    } else {
      console.error('❌ [SERVER] Unhandled server error:', err);
    }
    process.exit(1);
  });

  return server;
};

// Start server on module initialization
serverPromise = startServer();

export { app, server, startServer, serverPromise };
export default serverPromise;
