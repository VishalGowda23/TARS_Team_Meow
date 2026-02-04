import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { metadataStripper } from '../services/metadataStripper';
import { evidenceHasher } from '../services/evidenceHasher';
import { encryptedStaging } from '../services/encryptedStaging';
import { torRouting } from '../services/torRouting';
import { logger, logSubmission, logSecurityEvent } from '../utils/logger';
import { SubmissionResponse, SubmissionReceipt, ApiResponse } from '../types';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, true)
});

const anonymizeRequest = (req: Request, res: Response, next: NextFunction) => {
  (req as any).anonymousId = crypto.randomBytes(16).toString('hex');
  (req as any).ipAccessed = false;
  
  delete req.headers['x-forwarded-for'];
  delete req.headers['x-real-ip'];
  delete req.headers['x-client-ip'];
  delete req.headers['cf-connecting-ip'];
  delete req.headers['true-client-ip'];
  delete req.headers['user-agent'];
  delete req.headers['referer'];
  delete req.headers['origin'];
  delete req.headers['cookie'];
  
  Object.defineProperty(req, 'ip', {
    get: () => {
      logSecurityEvent('IP_ACCESS_ATTEMPTED', { requestId: (req as any).anonymousId });
      return 'REDACTED';
    }
  });
  next();
};

const requireTor = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    if (!torRouting.validateTorOrigin(req)) {
      logSecurityEvent('NON_TOR_REQUEST_BLOCKED');
      return res.status(403).json({ success: false, error: { code: 'TOR_REQUIRED', message: 'Submissions must be made through Tor' }, requestId: (req as any).anonymousId, timestamp: new Date() });
    }
  }
  next();
};

const noCacheHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.set({ 'Cache-Control': 'no-store, no-cache, must-revalidate, private', 'Pragma': 'no-cache', 'Expires': '0', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'X-XSS-Protection': '1; mode=block' });
  next();
};

router.use(anonymizeRequest);
router.use(noCacheHeaders);

router.post('/submit', requireTor, upload.single('evidence'), async (req: Request, res: Response) => {
  const requestId = (req as any).anonymousId;
  const startTime = Date.now();

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'No evidence file provided' }, requestId, timestamp: new Date() });
    }

    const { buffer, originalname, mimetype } = req.file;
    logger.info(`Processing submission: ${requestId}`);

    const strippedFile = await metadataStripper.stripMetadata(buffer, originalname, mimetype);
    const evidenceHash = evidenceHasher.generateHash(strippedFile.cleanBuffer);
    const staged = await encryptedStaging.stageEvidence(strippedFile.cleanBuffer, evidenceHash);
    const submissionId = uuidv4();

    const receipt: SubmissionReceipt = {
      submissionId,
      evidenceHash: evidenceHash.sha256,
      submittedAt: new Date(),
      fileType: mimetype,
      sanitizedSize: strippedFile.cleanSize,
      metadataRemoved: strippedFile.strippingReport.removedFields
    };

    logSubmission(submissionId, mimetype, strippedFile.cleanSize);

    // Forward to Person D for storage
    let storageResult = null;
    const personDUrl = process.env.PERSON_D_STORAGE_ENDPOINT || 'http://localhost:3000/api/store';
    
    try {
      logger.info(`Forwarding to Person D: ${personDUrl}`);
      
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('stageId', staged.stageId);
      form.append('evidenceHash', evidenceHash.sha256);
      form.append('encryptionRequired', 'true');
      form.append('fileType', mimetype);
      form.append('evidenceData', strippedFile.cleanBuffer, {
        filename: 'evidence.bin',
        contentType: 'application/octet-stream'
      });

      const storageResponse = await fetch(personDUrl, {
        method: 'POST',
        body: form as any,
        headers: {
          ...form.getHeaders(),
          'X-Integration-Secret': process.env.INTEGRATION_SECRET || ''
        }
      });

      if (storageResponse.ok) {
        storageResult = await storageResponse.json();
        logger.info(`Storage successful: ${storageResult.cid}`);
      } else {
        logger.warn(`Storage failed: ${storageResponse.status}`);
      }
    } catch (storageError) {
      logger.warn(`Could not reach Person D: ${storageError instanceof Error ? storageError.message : storageError}`);
    }

    const response: SubmissionResponse = { 
      success: true, 
      submissionId, 
      evidenceHash: evidenceHash.sha256, 
      timestamp: new Date(), 
      stageId: staged.stageId, 
      receipt,
      ...(storageResult && { storage: storageResult })
    };
    logger.info(`Submission complete: ${submissionId} in ${Date.now() - startTime}ms`);

    res.status(201).json({ success: true, data: response, requestId, timestamp: new Date() });
  } catch (error) {
    logger.error('Submission failed:', error);
    res.status(500).json({ success: false, error: { code: 'SUBMISSION_FAILED', message: 'Evidence submission failed' }, requestId, timestamp: new Date() });
  }
});

router.post('/verify', async (req: Request, res: Response) => {
  const requestId = (req as any).anonymousId;
  try {
    const { hash, algorithm } = req.body;
    if (!hash) {
      return res.status(400).json({ success: false, error: { code: 'NO_HASH', message: 'Hash required' }, requestId, timestamp: new Date() });
    }
    const isValidFormat = evidenceHasher.isValidHashFormat(hash, algorithm || 'sha256');
    res.json({ success: true, data: { hash, algorithm: algorithm || 'sha256', validFormat: isValidFormat }, requestId, timestamp: new Date() });
  } catch (error) {
    logger.error('Verification failed:', error);
    res.status(500).json({ success: false, error: { code: 'VERIFICATION_FAILED', message: 'Hash verification failed' }, requestId, timestamp: new Date() });
  }
});

router.get('/stage/:stageId', async (req: Request, res: Response) => {
  const requestId = (req as any).anonymousId;
  const { stageId } = req.params;
  try {
    const stagedInfo = encryptedStaging.getStagedInfo(stageId);
    if (!stagedInfo) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Staged evidence not found or expired' }, requestId, timestamp: new Date() });
    }
    res.json({ success: true, data: { stageId: stagedInfo.stageId, evidenceHash: stagedInfo.evidenceHash.sha256, createdAt: stagedInfo.createdAt, expiresAt: stagedInfo.expiresAt, accessCount: stagedInfo.accessCount, maxAccess: stagedInfo.maxAccess }, requestId, timestamp: new Date() });
  } catch (error) {
    logger.error('Stage retrieval failed:', error);
    res.status(500).json({ success: false, error: { code: 'RETRIEVAL_FAILED', message: 'Failed to retrieve staged evidence' }, requestId, timestamp: new Date() });
  }
});

router.get('/staging/:stageId', async (req: Request, res: Response) => {
  const { stageId } = req.params;
  const serviceAuth = req.headers['x-service-auth'];

  if (process.env.NODE_ENV === 'production' && serviceAuth !== process.env.SERVICE_AUTH_KEY) {
    logger.warn(`Unauthorized staging access attempt: ${stageId}`);
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const evidenceBuffer = encryptedStaging.retrieveEvidence(stageId);
    if (!evidenceBuffer) {
      return res.status(404).json({ error: 'Staged evidence not found or expired' });
    }

    res.set('Content-Type', 'application/octet-stream');
    res.send(evidenceBuffer);
    logger.info(`Staging retrieval: ${stageId}`);
  } catch (error) {
    logger.error('Staging retrieval failed:', error);
    res.status(500).json({ error: 'Failed to retrieve staged evidence' });
  }
});

router.get('/supported-types', (req: Request, res: Response) => {
  const requestId = (req as any).anonymousId;
  res.json({ success: true, data: { supportedTypes: metadataStripper.getSupportedTypes(), maxFileSize: '100MB', maxFiles: 1 }, requestId, timestamp: new Date() });
});

router.get('/health', (req: Request, res: Response) => {
  const stagingStats = encryptedStaging.getStats();
  const torStatus = torRouting.getStatus();
  res.json({ success: true, data: { status: 'healthy', torConnected: torStatus.connected, activeStages: stagingStats.activeStages, timestamp: new Date() }, requestId: (req as any).anonymousId, timestamp: new Date() });
});

export default router;
