import winston from 'winston';

const secureFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  // Remove any potential IP addresses from message
  const sanitizedMessage = sanitizeLogMessage(String(message));
  
  // Remove sensitive fields from metadata
  const sanitizedMeta = sanitizeMetadata(meta);
  
  const metaStr = Object.keys(sanitizedMeta).length > 0 
    ? ` ${JSON.stringify(sanitizedMeta)}` 
    : '';
    
  return `${timestamp} [${level.toUpperCase()}]: ${sanitizedMessage}${metaStr}`;
});

function sanitizeLogMessage(message: string): string {
  if (typeof message !== 'string') return String(message);
  let sanitized = message.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[REDACTED_IP]');
  sanitized = sanitized.replace(/([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}/g, '[REDACTED_IP]');
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
  sanitized = sanitized.replace(/\/home\/[^\/\s]+/g, '/home/[REDACTED]');
  sanitized = sanitized.replace(/C:\\Users\\[^\\]+/gi, 'C:\\Users\\[REDACTED]');
  return sanitized;
}

function sanitizeMetadata(meta: Record<string, any>): Record<string, any> {
  const sensitiveFields = ['ip', 'ipAddress', 'remoteAddress', 'clientIp', 'userAgent', 'user-agent', 'email', 'username', 'name', 'authorization', 'cookie', 'token', 'password', 'secret', 'key', 'x-forwarded-for', 'x-real-ip'];
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeLogMessage(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    secureFormat
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), secureFormat) }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error', maxsize: 5242880, maxFiles: 5, tailable: true }),
    new winston.transports.File({ filename: 'logs/combined.log', maxsize: 5242880, maxFiles: 5, tailable: true })
  ],
  exitOnError: false
});

export function logSubmission(submissionId: string, fileType: string, sizeBytes: number): void {
  logger.info('Evidence submission', { submissionId, fileType, sizeBytes });
}

export function logSecurityEvent(event: string, details?: Record<string, any>): void {
  logger.warn('Security event', { event, details: details ? sanitizeMetadata(details) : undefined, timestamp: new Date().toISOString() });
}

export function logSystemEvent(event: string, details?: Record<string, any>): void {
  logger.info('System event', { event, details: details ? sanitizeMetadata(details) : undefined });
}
