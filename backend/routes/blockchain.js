const express = require('express');
const router = express.Router();

// In-memory evidence registry (replace with smart contract interaction in production)
const evidenceRegistry = new Map();

/**
 * @route POST /api/evidence/register
 * @desc Register evidence hash on blockchain (called by Person D after storage)
 * @access Internal (Person D only)
 */
router.post('/register', async (req, res) => {
  try {
    const { 
      evidenceHash, 
      ipfsCid, 
      arweaveId,
      stageId,
      timestamp,
      encryptionApplied 
    } = req.body;

    // Validate required fields
    if (!evidenceHash || !ipfsCid) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: evidenceHash and ipfsCid'
      });
    }

    // Validate integration secret
    const authHeader = req.headers['x-integration-secret'] || req.headers['authorization'];
    const expectedSecret = process.env.INTEGRATION_SECRET;
    
    if (expectedSecret && authHeader !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      console.warn('⚠️ Invalid integration secret from:', req.ip);
      // Continue anyway for development - add strict check in production
    }

    console.log('📝 Registering evidence on blockchain...');
    console.log('  Hash:', evidenceHash.substring(0, 16) + '...');
    console.log('  IPFS:', ipfsCid);
    console.log('  Arweave:', arweaveId || 'N/A');

    // Generate evidence ID
    const evidenceId = `eid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock blockchain transaction (replace with actual ethers.js contract call)
    const mockTxHash = `0x${Buffer.from(evidenceHash + Date.now()).toString('hex').substring(0, 64)}`;
    const mockBlockNumber = Math.floor(Date.now() / 1000);

    // Store in registry
    const record = {
      evidenceId,
      evidenceHash,
      ipfsCid,
      arweaveId: arweaveId || null,
      stageId: stageId || null,
      transactionHash: mockTxHash,
      blockNumber: mockBlockNumber,
      status: 'PENDING',
      registeredAt: new Date().toISOString(),
      encryptionApplied: encryptionApplied || false,
      votes: {
        approvals: 0,
        rejections: 0,
        voters: []
      }
    };

    evidenceRegistry.set(evidenceId, record);

    console.log('✅ Evidence registered:', evidenceId);

    res.status(200).json({
      success: true,
      data: {
        evidenceId,
        transactionHash: mockTxHash,
        blockNumber: mockBlockNumber,
        status: 'PENDING',
        registeredAt: record.registeredAt
      }
    });

  } catch (error) {
    console.error('❌ Blockchain registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/evidence/status/:evidenceId
 * @desc Get evidence status from blockchain
 * @access Public
 */
router.get('/status/:evidenceId', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const record = evidenceRegistry.get(evidenceId);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Evidence not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        evidenceId: record.evidenceId,
        status: record.status,
        transactionHash: record.transactionHash,
        blockNumber: record.blockNumber,
        registeredAt: record.registeredAt,
        votes: record.votes,
        ipfsCid: record.ipfsCid
      }
    });

  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/evidence/vote/:evidenceId
 * @desc Submit validator vote for evidence
 * @access Validators only
 */
router.post('/vote/:evidenceId', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    const { validatorAddress, approve, reason } = req.body;

    const record = evidenceRegistry.get(evidenceId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Evidence not found'
      });
    }

    // Check if already voted
    if (record.votes.voters.includes(validatorAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Validator has already voted'
      });
    }

    // Record vote
    record.votes.voters.push(validatorAddress);
    if (approve) {
      record.votes.approvals++;
    } else {
      record.votes.rejections++;
    }

    // Check if threshold reached (3 approvals)
    const minApprovals = 3;
    if (record.votes.approvals >= minApprovals) {
      record.status = 'VERIFIED';
      console.log(`✅ Evidence ${evidenceId} VERIFIED with ${record.votes.approvals} approvals`);
    } else if (record.votes.rejections >= minApprovals) {
      record.status = 'REJECTED';
      console.log(`❌ Evidence ${evidenceId} REJECTED with ${record.votes.rejections} rejections`);
    }

    evidenceRegistry.set(evidenceId, record);

    res.status(200).json({
      success: true,
      data: {
        evidenceId,
        newStatus: record.status,
        votes: record.votes
      }
    });

  } catch (error) {
    console.error('❌ Voting error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/evidence/pending
 * @desc Get all pending evidence for validators
 * @access Validators
 */
router.get('/pending', async (req, res) => {
  try {
    const pending = [];
    for (const [id, record] of evidenceRegistry) {
      if (record.status === 'PENDING') {
        pending.push({
          evidenceId: record.evidenceId,
          evidenceHash: record.evidenceHash,
          ipfsCid: record.ipfsCid,
          registeredAt: record.registeredAt,
          votes: record.votes
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        count: pending.length,
        evidence: pending
      }
    });

  } catch (error) {
    console.error('❌ Pending list error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
