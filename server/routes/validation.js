const express = require('express');
const router = express.Router();

const BlockchainService = require('../services/blockchainService');
const evidenceStore = require('../services/evidenceStore');
const blockchainService = new BlockchainService();

/**
 * POST /api/validation/validate
 * Validate evidence submission (validators only)
 */
router.post('/validate', async (req, res) => {
  try {
    const { submissionId, approved, isValid, comment, notes, validatorSecret } = req.body;
    const validatorEmail = req.headers['x-user-email'] || '';
    
    // Support both 'approved' and 'isValid' parameters
    const validationApproved = approved !== undefined ? approved : isValid;
    const validationComment = comment || notes || '';

    if (!submissionId || validationApproved === undefined) {
      return res.status(400).json({ error: 'Submission ID and approval status required' });
    }

    if (!validatorSecret) {
      return res.status(401).json({ error: 'Validator authentication required' });
    }

    // Generate validator's pseudonymous ID
    const validatorPseudonymId = blockchainService.generatePseudonymousId(validatorSecret);

    // Update evidence store
    try {
      evidenceStore.validateSubmission(submissionId, validatorEmail || validatorPseudonymId, validationApproved, validationComment);
    } catch (storeError) {
      console.warn('Evidence store validation error:', storeError.message);
    }

    // Try blockchain validation (may fail if contract doesn't exist)
    let txHash = null;
    let blockNumber = null;
    try {
      const tx = await blockchainService.contract.validateEvidence(
        submissionId,
        validationApproved,
        validationComment
      );
      const receipt = await tx.wait();
      txHash = receipt.hash;
      blockNumber = receipt.blockNumber;
    } catch (bcError) {
      console.warn('Blockchain validation failed (using local store):', bcError.message);
    }

    res.json({
      success: true,
      data: {
        submissionId,
        isValid: validationApproved,
        validatorPseudonymId,
        txHash: txHash || 'local-validation',
        blockNumber: blockNumber || 0,
      },
      message: validationApproved ? 'Evidence validated successfully' : 'Evidence rejected'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/validation/:submissionId/history
 * Get validation history for a submission
 */
router.get('/:submissionId/history', async (req, res) => {
  try {
    const { submissionId } = req.params;

    const history = await blockchainService.getValidationHistory(submissionId);

    res.json({
      success: true,
      submissionId,
      validationCount: history.length,
      validations: history
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get validation history',
      message: error.message
    });
  }
});

/**
 * GET /api/validation/pending
 * Get pending submissions awaiting validation
 */
router.get('/pending', async (req, res) => {
  try {
    const totalSubmissions = await blockchainService.contract.getTotalSubmissions();
    const pending = [];

    // Iterate through submissions to find pending ones
    // In production, use events or indexing for better performance
    for (let i = 1; i <= Number(totalSubmissions); i++) {
      try {
        const submission = await blockchainService.getSubmission(i);
        if (submission.status === 'Pending' || submission.status === 'UnderReview') {
          pending.push(submission);
        }
      } catch (e) {
        // Skip invalid submissions
      }
    }

    res.json({
      success: true,
      count: pending.length,
      submissions: pending
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to get pending submissions',
      message: error.message
    });
  }
});

/**
 * GET /api/validation/queue
 * Get validation queue for frontend - returns all pending submissions
 */
router.get('/queue', async (req, res) => {
  try {
    // First, get from evidence store (includes all recent submissions)
    const storeSubmissions = evidenceStore.getAllSubmissions();
    const queue = storeSubmissions.map(submission => ({
      id: submission.id,
      title: submission.title || submission.fileName || 'Untitled',
      brief: submission.brief || '',
      fileName: submission.fileName || 'unknown',
      submittedAt: submission.submittedAt || submission.createdAt || new Date().toISOString(),
      fileSize: submission.fileSize || 'Unknown',
      contentHash: submission.contentHash || '',
      currentSignatures: submission.currentSignatures || 0,
      requiredSignatures: submission.requiredSignatures || 3,
      priority: (submission.currentSignatures || 0) === 0 ? 'high' : (submission.currentSignatures || 0) < 2 ? 'medium' : 'low',
      submittedBy: submission.submittedBy || 'anonymous',
      category: submission.category || 'Uncategorized',
      status: submission.status || 'orbiting',
      ipfsCid: submission.ipfsCid || '',
      txHash: submission.txHash || '',
      validators: submission.validators || []
    }));

    // Also try to get from blockchain (if available)
    try {
      const totalSubmissions = await blockchainService.contract.getTotalSubmissions();
      for (let i = 1; i <= Math.min(Number(totalSubmissions), 50); i++) {
        try {
          const submission = await blockchainService.getSubmission(i);
          if (submission.status === 'Pending' || submission.status === 'UnderReview') {
            // Check if already in queue
            const exists = queue.some(q => q.id === submission.submissionId || q.contentHash === submission.contentHash);
            if (!exists) {
              queue.push({
                id: submission.submissionId || `TARS-${i}`,
                title: submission.title || submission.fileName || 'Untitled',
                brief: submission.brief || '',
                fileName: submission.fileName || 'unknown',
                submittedAt: submission.timestamp ? new Date(submission.timestamp * 1000).toISOString() : new Date().toISOString(),
                fileSize: submission.fileSize || 'Unknown',
                contentHash: submission.contentHash || '',
                currentSignatures: submission.validationCount || 0,
                requiredSignatures: 3,
                priority: (submission.validationCount || 0) === 0 ? 'high' : (submission.validationCount || 0) < 2 ? 'medium' : 'low',
                submittedBy: submission.pseudonymousId || 'anonymous',
                category: submission.category || 'Uncategorized',
                status: submission.status || 'orbiting',
                ipfsCid: submission.ipfsCid || '',
                validators: []
              });
            }
          }
        } catch (e) {
          // Skip invalid submissions
        }
      }
    } catch (bcError) {
      console.warn('Blockchain query failed, using store only:', bcError.message);
    }

    res.json({
      success: true,
      data: queue
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get validation queue',
      message: error.message,
      data: []
    });
  }
});

/**
 * POST /api/validation/authorize-viewer
 * Authorize a party to view evidence (selective disclosure)
 */
router.post('/authorize-viewer', async (req, res) => {
  try {
    const { submissionId, authorizedAddress, ownerSecret } = req.body;

    if (!submissionId || !authorizedAddress) {
      return res.status(400).json({ error: 'Submission ID and authorized address required' });
    }

    // Verify owner
    const ownerPseudonymousId = blockchainService.generatePseudonymousId(ownerSecret);
    const submission = await blockchainService.getSubmission(submissionId);

    if (submission.pseudonymousId.toLowerCase() !== ownerPseudonymousId.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to grant access' });
    }

    const tx = await blockchainService.contract.authorizeViewer(submissionId, authorizedAddress);
    const receipt = await tx.wait();

    res.json({
      success: true,
      transactionHash: receipt.hash,
      message: `Access granted to ${authorizedAddress}`
    });

  } catch (error) {
    res.status(500).json({
      error: 'Authorization failed',
      message: error.message
    });
  }
});

/**
 * POST /api/validation/release
 * Make validated evidence public
 */
router.post('/release', async (req, res) => {
  try {
    const { submissionId, ownerSecret } = req.body;

    if (!submissionId) {
      return res.status(400).json({ error: 'Submission ID required' });
    }

    // Verify owner
    const ownerPseudonymousId = blockchainService.generatePseudonymousId(ownerSecret);
    const submission = await blockchainService.getSubmission(submissionId);

    if (submission.pseudonymousId.toLowerCase() !== ownerPseudonymousId.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to release evidence' });
    }

    if (submission.status !== 'Validated') {
      return res.status(400).json({ error: 'Evidence must be validated before release' });
    }

    const tx = await blockchainService.contract.releaseEvidence(submissionId);
    const receipt = await tx.wait();

    res.json({
      success: true,
      transactionHash: receipt.hash,
      message: 'Evidence released to public'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Release failed',
      message: error.message
    });
  }
});

module.exports = router;
