import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { logger, logSystemEvent } from './utils/logger';
import submissionRoutes from './api/submissionRoutes';
import { torRouting } from './services/torRouting';
import { encryptedStaging } from './services/encryptedStaging';

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'http://localhost:*'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGIN 
    : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: false,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '1mb' }));
app.disable('x-powered-by');

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', false);
}

app.use((req, res, next) => {
  const logData = {
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  };
  logger.debug('Request received', logData);
  next();
});

app.use('/api', submissionRoutes);

app.get('/', (req, res) => {
  res.json({ service: 'TARS Privacy Engine', version: '1.0.0', status: 'operational' });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', { 
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred'
    },
    timestamp: new Date()
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    },
    timestamp: new Date()
  });
});

async function startServer() {
  try {
    if (process.env.ENABLE_TOR === 'true') {
      const torConnected = await torRouting.connect();
      if (torConnected) {
        logSystemEvent('TOR_CONNECTED');
      } else {
        logger.warn('Tor connection failed - running without Tor routing');
      }
    }

    app.listen(PORT, () => {
      console.log(`[TARS] Server running on port ${PORT}`);
      logSystemEvent('SERVER_STARTED', { port: PORT });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down...`);
  encryptedStaging.cleanup();
  torRouting.disconnect();
  logSystemEvent('SERVER_SHUTDOWN', { signal });
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', { reason });
});

startServer();

export default app;
