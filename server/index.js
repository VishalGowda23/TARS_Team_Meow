const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const evidenceRoutes = require('./routes/evidence');
const validationRoutes = require('./routes/validation');
const ipfsRoutes = require('./routes/ipfs');
const auditRoutes = require('./routes/audit');
const reputationRoutes = require('./routes/reputation');
const commentsRoutes = require('./routes/comments');
const redactionRoutes = require('./routes/redaction');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Pseudonymous-ID', 'X-User-Email']
}));

// Rate limiting for DDoS protection
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Logging (anonymized in production)
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400 // Only log errors in production
  }));
} else {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    network: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/evidence', evidenceRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/ipfs', ipfsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/redaction', redactionRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Don't leak error details in production
  const errorResponse = {
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  };

  res.status(err.status || 500).json(errorResponse);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ████████╗ █████╗ ██████╗ ███████╗                       ║
║   ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝                       ║
║      ██║   ███████║██████╔╝███████╗                       ║
║      ██║   ██╔══██║██╔══██╗╚════██║                       ║
║      ██║   ██║  ██║██║  ██║███████║                       ║
║      ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝                       ║
║                                                            ║
║   Trustless Anonymous Reporting System                     ║
║   Server running on port ${PORT}                             ║
║   Environment: ${process.env.NODE_ENV || 'development'}                           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

module.exports = app;
