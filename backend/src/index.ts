import { Server } from 'http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import app from './app';

// Track active connections for graceful shutdown
const connections = new Set<any>();

const server: Server = app.listen(env.port, () => {
  logger.info({
    port: env.port,
    env: process.env.NODE_ENV,
    pid: process.pid,
  }, 'Server started');
});

// Track connections
server.on('connection', (connection) => {
  connections.add(connection);
  connection.on('close', () => {
    connections.delete(connection);
  });
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');
  
  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      logger.error({ error: err }, 'Error closing server');
      process.exit(1);
    }
    
    logger.info('HTTP server closed');
    
    // Close existing connections
    for (const connection of connections) {
      connection.destroy();
    }
    logger.info(`Closed ${connections.size} active connections`);
    
    try {
      // Close database connections
      await prisma.$disconnect();
      logger.info('Database connections closed');
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  });
  
  // Force exit after timeout
  setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 10000); // 10 second timeout
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled rejection');
  process.exit(1);
});
