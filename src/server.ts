import 'dotenv/config';
import app from './app';
import { connectDB } from './config/db';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '5000', 10);

const start = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`🚀 ZesDel API running on port ${PORT} [${process.env.NODE_ENV}]`);
    logger.info(`   Health: http://localhost:${PORT}/health`);
    logger.info(`   API:    http://localhost:${PORT}/api/v1`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason);
    shutdown('unhandledRejection');
  });
};

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
