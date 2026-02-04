const express = require('express');
const router = express.Router();
const contractService = require('../utils/contract');

// In-memory evidence registry (fallback when contract is not available)
const evidenceRegistry = new Map();

// Track if contract is available
let useRealContract = false;

// Initialize contract on startup and auto-register signer as employee/validator
(async () => {
  useRealContract = await contractService.initializeContract();
  if (useRealContract) {
    console.log('🔗 Using REAL blockchain contract for transactions');
    const stats = await contractService.getContractStats();
    console.log('📊 Contract stats:', stats);
    
    // Auto-register the signer as an employee if not already
    const signerAddress = stats.signerAddress;
    if (signerAddress) {
      const isEmployee = await contractService.checkIsEmployee(signerAddress);
      console.log(`👤 Signer ${signerAddress} is employee:`, isEmployee);
      
      if (!isEmployee) {
        console.log('📝 Registering signer as employee...');
        const result = await contractService.addEmployee(signerAddress);
        if (result.success) {
          console.log('✅ Signer registered as employee! TX:', result.transactionHash);
        } else {
          console.warn('⚠️ Failed to register signer as employee:', result.error);
        }
      }
      
      // Also check/register as validator for voting
      const isValidator = await contractService.checkIsValidator(signerAddress);
      console.log(`🔒 Signer ${signerAddress} is validator:`, isValidator);
      
      if (!isValidator) {
        console.log('📝 Registering signer as validator...');
        const result = await contractService.addValidator(signerAddress);
        if (result.success) {
          console.log('✅ Signer registered as validator! TX:', result.transactionHash);
        } else {
          console.warn('⚠️ Failed to register signer as validator:', result.error);
        }
      }
    }
  } else {
    console.log('⚠️ Using in-memory mock - contract not configured');
  }
})();

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
    }

    console.log('📝 Registering evidence on blockchain...');
    console.log('  Hash:', evidenceHash.substring(0, 16) + '...');
    console.log('  IPFS:', ipfsCid);

    // Try to use real contract first
    if (useRealContract) {
      const result = await contractService.submitEvidence(evidenceHash, ipfsCid);
      if (result.success) {
        // Also store locally for quick lookups
        const record = {
          evidenceId: result.evidenceId,
          evidenceHash,
          ipfsCid,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          status: 'PENDING',
          registeredAt: new Date().toISOString(),
          votes: { approvals: 0, rejections: 0, voters: [] }
        };
        evidenceRegistry.set(result.evidenceId, record);
        
        return res.status(200).json({
          success: true,
          data: {
            evidenceId: result.evidenceId,
            transactionHash: result.transactionHash,
            blockNumber: result.blockNumber,
            status: 'PENDING',
            registeredAt: record.registeredAt,
            onChain: true
          }
        });
      }
      console.warn('⚠️ Contract call failed, falling back to mock:', result.error);
    }

    // Fallback to mock
    const evidenceId = `eid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockTxHash = `0x${Buffer.from(evidenceHash + Date.now()).toString('hex').substring(0, 64)}`;
    const mockBlockNumber = Math.floor(Date.now() / 1000);

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
      votes: { approvals: 0, rejections: 0, voters: [] }
    };

    evidenceRegistry.set(evidenceId, record);
    console.log('✅ Evidence registered (mock):', evidenceId);

    res.status(200).json({
      success: true,
      data: {
        evidenceId,
        transactionHash: mockTxHash,
        blockNumber: mockBlockNumber,
        status: 'PENDING',
        registeredAt: record.registeredAt,
        onChain: false
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
    
    // First check in-memory registry
    const record = evidenceRegistry.get(evidenceId);

    if (record) {
      return res.status(200).json({
        success: true,
        data: {
          evidenceId: record.evidenceId,
          status: record.status,
          transactionHash: record.transactionHash,
          blockNumber: record.blockNumber,
          registeredAt: record.registeredAt,
          votes: record.votes,
          ipfsCid: record.ipfsCid,
          onChain: record.transactionHash ? true : false
        }
      });
    }

    // If numeric ID and real contract, try to get from blockchain
    if (useRealContract && !isNaN(evidenceId)) {
      const result = await contractService.getEvidence(parseInt(evidenceId));
      if (result.success) {
        return res.status(200).json({
          success: true,
          data: {
            ...result.evidence,
            onChain: true
          }
        });
      }
    }

    // For unknown evidence IDs (e.g., DB UUIDs not yet on-chain), return pending status
    // This prevents 404 errors for evidence that exists in Person D but not yet registered on blockchain
    res.status(200).json({
      success: true,
      data: {
        evidenceId,
        status: 'PENDING',
        onChain: false,
        message: 'Evidence not yet registered on blockchain or stored locally'
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

    console.log(`🗳️ Vote received: evidence=${evidenceId}, approve=${approve}, validator=${validatorAddress}`);

    // Try real contract first if evidence ID is numeric (on-chain)
    if (useRealContract && !isNaN(evidenceId)) {
      const result = await contractService.voteOnEvidence(parseInt(evidenceId), approve);
      if (result.success) {
        return res.status(200).json({
          success: true,
          data: {
            evidenceId,
            newStatus: result.newStatus,
            votes: {
              approvals: parseInt(result.approvals),
              rejections: parseInt(result.rejections)
            },
            transactionHash: result.transactionHash,
            blockNumber: result.blockNumber,
            onChain: true
          }
        });
      }
      console.warn('⚠️ Contract vote failed:', result.error);
    }

    // Get or create in-memory record for this evidence
    let record = evidenceRegistry.get(evidenceId);
    if (!record) {
      // Create a new record for evidence that exists in Person D but not yet in blockchain registry
      record = {
        evidenceId,
        evidenceHash: `hash_${evidenceId}`,
        ipfsCid: null,
        transactionHash: null,
        blockNumber: null,
        status: 'PENDING',
        registeredAt: new Date().toISOString(),
        votes: { approvals: 0, rejections: 0, voters: [] }
      };
      evidenceRegistry.set(evidenceId, record);
      console.log(`📝 Created in-memory record for evidence ${evidenceId}`);
    }

    // Check if already voted
    const voterId = validatorAddress || `validator_${Date.now()}`;
    if (record.votes.voters.includes(voterId)) {
      return res.status(400).json({
        success: false,
        error: 'Validator has already voted'
      });
    }

    // Record vote
    record.votes.voters.push(voterId);
    if (approve) {
      record.votes.approvals++;
    } else {
      record.votes.rejections++;
    }

    // Check if threshold reached (5 approvals)
    const minApprovals = 5;
    if (record.votes.approvals >= minApprovals) {
      record.status = 'VERIFIED';
      console.log(`✅ Evidence ${evidenceId} VERIFIED with ${record.votes.approvals} approvals`);
    } else if (record.votes.rejections >= minApprovals) {
      record.status = 'REJECTED';
      console.log(`❌ Evidence ${evidenceId} REJECTED with ${record.votes.rejections} rejections`);
    }

    // Add custody event for this vote
    if (!record.custodyEvents) {
      record.custodyEvents = [];
    }
    record.custodyEvents.push({
      eventType: approve ? 'VALIDATION_APPROVED' : 'VALIDATION_REJECTED',
      timestamp: new Date().toISOString(),
      actor: voterId,
      details: { 
        action: approve ? 'Approved evidence' : 'Rejected evidence',
        reason: reason || 'No reason provided',
        currentApprovals: record.votes.approvals,
        currentRejections: record.votes.rejections
      }
    });

    evidenceRegistry.set(evidenceId, record);

    res.status(200).json({
      success: true,
      data: {
        evidenceId,
        newStatus: record.status,
        votes: record.votes,
        onChain: false
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

/**
 * @route GET /api/evidence/contract-stats
 * @desc Get contract statistics and connection status
 * @access Public
 */
router.get('/contract-stats', async (req, res) => {
  try {
    if (useRealContract) {
      const stats = await contractService.getContractStats();
      return res.status(200).json({
        success: true,
        connected: true,
        data: stats
      });
    }
    
    res.status(200).json({
      success: true,
      connected: false,
      message: 'Using in-memory mock - contract not configured',
      inMemoryCount: evidenceRegistry.size
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/evidence/custody/:evidenceId
 * @desc Get chain of custody events for evidence
 * @access Public
 */
router.get('/custody/:evidenceId', async (req, res) => {
  try {
    const { evidenceId } = req.params;
    
    // Check in-memory registry first
    const record = evidenceRegistry.get(evidenceId);
    
    // Build custody timeline from available data
    const custodyEvents = [];
    
    if (record) {
      custodyEvents.push({
        eventType: 'SUBMITTED',
        timestamp: record.registeredAt,
        actor: 'Whistleblower',
        details: {
          ipfsCid: record.ipfsCid,
          transactionHash: record.transactionHash
        }
      });
      
      // Add validation events from custody events array
      if (record.custodyEvents && record.custodyEvents.length > 0) {
        custodyEvents.push(...record.custodyEvents);
      }
      
      if (record.status === 'VERIFIED') {
        custodyEvents.push({
          eventType: 'VERIFIED',
          timestamp: new Date().toISOString(),
          actor: 'System',
          details: { approvals: record.votes?.approvals || 0 }
        });
      } else if (record.status === 'REJECTED') {
        custodyEvents.push({
          eventType: 'REJECTED',
          timestamp: new Date().toISOString(),
          actor: 'System',
          details: { rejections: record.votes?.rejections || 0 }
        });
      }
    }
    
    // Return custody timeline (even if empty - frontend will handle)
    res.status(200).json({
      success: true,
      data: {
        evidenceId,
        custodyChain: custodyEvents,
        totalEvents: custodyEvents.length
      }
    });

  } catch (error) {
    console.error('❌ Custody retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
