const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const router = express.Router();

const MetadataStripper = require('../services/metadataStripper');
const IPFSService = require('../services/ipfsService');
const BlockchainService = require('../services/blockchainService');
const EncryptionService = require('../services/encryptionService');
const evidenceStore = require('../services/evidenceStore');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
    files: 10 // Max 10 files per request
  }
});

// Initialize services
const metadataStripper = new MetadataStripper();
const ipfsService = new IPFSService();
const blockchainService = new BlockchainService();
const encryptionService = new EncryptionService();

/**
 * POST /api/evidence/submit
 * Submit new evidence with full anonymization pipeline
 */
router.post('/submit', upload.array('files', 10), async (req, res) => {
  try {
    const { category, secret, title, brief, enableEncryption, scheduledRelease } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    if (!secret) {
      return res.status(400).json({ error: 'Secret phrase required for pseudonymous identity' });
    }

    // Debug: Log file info to see if we're receiving the redacted file
    console.log('📁 Received file for submission:');
    console.log('   - Original name:', files[0].originalname);
    console.log('   - Size:', files[0].buffer.length, 'bytes');
    console.log('   - First 100 bytes:', files[0].buffer.slice(0, 100).toString('utf8').substring(0, 50));

    // Generate pseudonymous ID from secret
    const pseudonymousId = blockchainService.generatePseudonymousId(secret);

    const results = [];

    for (const file of files) {
      // Step 1: Strip metadata
      const strippedResult = await metadataStripper.stripMetadata(
        file.buffer,
        file.originalname
      );

      // Step 2: Optional encryption for selective disclosure
      let encryptionData = null;
      let fileToUpload = strippedResult.sanitizedBuffer;

      if (enableEncryption === 'true') {
        const key = encryptionService.generateKey();
        const encrypted = encryptionService.encrypt(strippedResult.sanitizedBuffer, key.key);
        
        fileToUpload = Buffer.from(encrypted.encrypted, 'hex');
        encryptionData = {
          keyHash: key.keyHash,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          // In production, send the key securely to the user
          key: key.key // WARNING: Store this securely, don't log or expose
        };
      }

      // Step 3: Upload to IPFS
      const ipfsResult = await ipfsService.uploadFile(
        fileToUpload,
        strippedResult.metadataReport.filename,
        {
          category: category || 'general',
          encrypted: enableEncryption === 'true',
          title: title || '',
          brief: brief || ''
        }
      );

      // Step 4: Upload metadata report to IPFS
      const metadataReportIpfs = await ipfsService.uploadJSON({
        ...strippedResult.metadataReport,
        ipfsHash: ipfsResult.ipfsHash,
        encrypted: enableEncryption === 'true'
      }, `metadata-${ipfsResult.ipfsHash}`);

      // Step 5: Submit to blockchain
      // Add timestamp to content hash to allow resubmission of same file (for demo)
      const crypto = require('crypto');
      // Remove 0x prefix if present before hashing
      const baseHash = strippedResult.sanitizedHash.replace(/^0x/, '');
      const uniqueHash = crypto.createHash('sha256')
        .update(baseHash + Date.now().toString())
        .digest('hex');
      
      const blockchainResult = await blockchainService.submitEvidence({
        contentHash: uniqueHash,
        ipfsHash: ipfsResult.ipfsHash,
        category: category || 'general',
        encryptionKeyHash: encryptionData?.keyHash || null,
        metadataHash: metadataReportIpfs.ipfsHash,
        pseudonymousId
      });

      results.push({
        originalFilename: file.originalname,
        sanitizedFilename: strippedResult.metadataReport.filename,
        contentHash: strippedResult.sanitizedHash,
        ipfsHash: ipfsResult.ipfsHash,
        ipfsUrl: ipfsResult.gatewayUrl,
        metadataReportHash: metadataReportIpfs.ipfsHash,
        submissionId: blockchainResult.submissionId,
        transactionHash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        timestamp: new Date().toISOString(),
        strippedFields: strippedResult.metadataReport.strippedFields,
        encryption: encryptionData ? {
          enabled: true,
          keyHash: encryptionData.keyHash,
          // In production, send key through secure channel
          decryptionKey: encryptionData.key,
          iv: encryptionData.iv,
          authTag: encryptionData.authTag
        } : { enabled: false }
      });
    }

    // Format response for frontend compatibility
    const firstResult = results[0];
    
    // Store in evidenceStore for multi-user validation
    const submitterEmail = req.headers['x-user-email'] || pseudonymousId;
    evidenceStore.addSubmission({
      id: firstResult.submissionId,
      title: title || file.originalname,
      brief: brief || '',
      fileName: firstResult.sanitizedFilename,
      fileSize: formatFileSize(files[0].size),
      category: category || 'general',
      contentHash: firstResult.contentHash,
      ipfsCid: firstResult.ipfsHash,
      txHash: firstResult.transactionHash,
      submittedBy: submitterEmail,
      pseudonymousId,
      submittedAt: new Date().toISOString()
    });
    
    res.json({
      success: true,
      data: {
        submissionId: firstResult.submissionId,
        pseudonymousId,
        ipfsCid: firstResult.ipfsHash,
        contentHash: firstResult.contentHash,
        txHash: firstResult.transactionHash,
        proofOfExistence: {
          hash: firstResult.contentHash,
          timestamp: Date.now(),
          blockNumber: firstResult.blockNumber
        },
        encryptionKeyId: firstResult.encryption?.keyHash || null
      },
      submissions: results,
      message: 'Evidence submitted successfully. Store your decryption keys securely.'
    });

  } catch (error) {
    console.error('Evidence submission error:', error);
    res.status(500).json({
      error: 'Submission failed',
      message: error.message
    });
  }
});

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * GET /api/evidence/:submissionId
 * Get evidence details by submission ID
 */
router.get('/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    const submission = await blockchainService.getSubmission(submissionId);
    
    // Log access for chain of custody
    try {
      await blockchainService.logAccess(submissionId, 'view');
    } catch (logError) {
      // Don't fail if logging fails
      console.warn('Access logging failed:', logError.message);
    }

    res.json({
      success: true,
      submission
    });

  } catch (error) {
    res.status(404).json({
      error: 'Submission not found',
      message: error.message
    });
  }
});

/**
 * POST /api/evidence/verify
 * Verify proof of existence for a content hash
 */
router.post('/verify', async (req, res) => {
  try {
    const { contentHash, file } = req.body;

    let hashToVerify = contentHash;

    // If file provided, calculate its hash
    if (file) {
      hashToVerify = crypto.createHash('sha256')
        .update(Buffer.from(file, 'base64'))
        .digest('hex');
    }

    if (!hashToVerify) {
      return res.status(400).json({ error: 'Content hash or file required' });
    }

    const verification = await blockchainService.verifyProofOfExistence(hashToVerify);

    res.json({
      success: true,
      verification: {
        ...verification,
        verifiedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Verification failed',
      message: error.message
    });
  }
});

/**
 * POST /api/evidence/:submissionId/decrypt
 * Decrypt evidence with provided key
 */
router.post('/:submissionId/decrypt', async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { decryptionKey, iv, authTag } = req.body;

    if (!decryptionKey || !iv || !authTag) {
      return res.status(400).json({ error: 'Decryption key, IV, and auth tag required' });
    }

    // Get submission details
    const submission = await blockchainService.getSubmission(submissionId);

    // Fetch encrypted content from IPFS
    const encryptedContent = await ipfsService.getFile(submission.ipfsHash);

    // Decrypt
    const decryptedContent = encryptionService.decrypt(
      encryptedContent.toString('hex'),
      decryptionKey,
      iv,
      authTag
    );

    // Log access
    await blockchainService.logAccess(submissionId, 'decrypt');

    // Return decrypted content as base64
    res.json({
      success: true,
      content: decryptedContent.toString('base64'),
      contentType: 'application/octet-stream'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Decryption failed',
      message: error.message
    });
  }
});

/**
 * GET /api/evidence/:submissionId/download
 * Download evidence file from IPFS
 */
router.get('/:submissionId/download', async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await blockchainService.getSubmission(submissionId);

    // Check if public or authorized
    if (!submission.isPublic) {
      return res.status(403).json({ error: 'Evidence not publicly released' });
    }

    const content = await ipfsService.getFile(submission.ipfsHash);

    // Log access
    await blockchainService.logAccess(submissionId, 'download');

    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="evidence-${submissionId}"`);
    res.send(content);

  } catch (error) {
    res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  }
});

/**
 * GET /api/evidence/stats
 * Get platform statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const totalSubmissions = await blockchainService.contract.getTotalSubmissions();
    const currentBlock = await blockchainService.getCurrentBlock();
    const networkInfo = await blockchainService.getNetworkInfo();

    res.json({
      success: true,
      stats: {
        totalSubmissions: totalSubmissions.toString(),
        currentBlock,
        network: networkInfo
      }
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message
    });
  }
});

module.exports = router;
