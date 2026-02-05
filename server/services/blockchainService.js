const { ethers } = require('ethers');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// ABI for TARSSimple contract (inline - no build artifacts needed)
const TARS_ABI = [
  "function submitEvidence(bytes32 _contentHash, string _ipfsHash, string _category, address _pseudonymousId) returns (uint256)",
  "function validateEvidence(uint256 _submissionId, bool _approved, string _comment)",
  "function authorizeViewer(uint256 _submissionId, address _authorizedParty)",
  "function releaseEvidence(uint256 _submissionId)",
  "function logEvidenceAccess(uint256 _submissionId, string _action)",
  "function verifyProofOfExistence(bytes32 _contentHash) view returns (bool exists, uint256 submissionId, uint256 timestamp)",
  "function getSubmissionBasic(uint256 _submissionId) view returns (bytes32 contentHash, string ipfsHash, uint256 timestamp, uint256 blockNumber, uint8 status, bool isPublic)",
  "function getSubmissionDetails(uint256 _submissionId) view returns (address pseudonymousId, uint256 validationCount, uint256 rejectionCount, string category)",
  "function getValidationCount(uint256 _submissionId) view returns (uint256)",
  "function getValidation(uint256 _submissionId, uint256 _index) view returns (address validator, uint256 timestamp, bool approved, string comment)",
  "function getAccessLogCount(uint256 _submissionId) view returns (uint256)",
  "function getAccessLog(uint256 _submissionId, uint256 _index) view returns (address accessor, uint256 timestamp, string action)",
  "function getReputation(address _pseudonymousId) view returns (uint256 total, uint256 validated, uint256 score)",
  "function getTotalSubmissions() view returns (uint256)",
  "event SubmissionCreated(uint256 indexed id, bytes32 indexed contentHash, string ipfsHash, uint256 timestamp, string category)"
];

/**
 * Blockchain Service - Handles all Ethereum/Sepolia interactions
 */
class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'
    );
    
    this.contract = null;
    this.serverWallet = null;
    
    if (process.env.TARS_CONTRACT_ADDRESS) {
      this.contract = new ethers.Contract(
        process.env.TARS_CONTRACT_ADDRESS,
        TARS_ABI,
        this.provider
      );
    }
    
    // Server wallet for signing transactions (for hackathon demo)
    // In production, each user would sign their own transactions
    if (process.env.SERVER_PRIVATE_KEY) {
      this.serverWallet = new ethers.Wallet(process.env.SERVER_PRIVATE_KEY, this.provider);
    }
  }

  /**
   * Generate a pseudonymous ID for the whistleblower
   */
  generatePseudonymousId(secret) {
    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    const privateKey = '0x' + hash;
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  }

  /**
   * Get a signer for transactions
   */
  getSigner(secret) {
    const hash = crypto.createHash('sha256').update(secret).digest('hex');
    const privateKey = '0x' + hash;
    return new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Submit evidence to blockchain
   */
  async submitEvidence(evidenceData, signerSecret) {
    const { contentHash, ipfsHash, category, pseudonymousId } = evidenceData;

    try {
      // Use server wallet if no secret provided, or derive wallet from secret
      let signer;
      if (signerSecret) {
        signer = this.getSigner(signerSecret);
      } else if (this.serverWallet) {
        signer = this.serverWallet;
      } else {
        throw new Error('No wallet available for signing. Set SERVER_PRIVATE_KEY in .env');
      }
      
      const contractWithSigner = this.contract.connect(signer);
      const contentHashBytes = '0x' + contentHash;

      const tx = await contractWithSigner.submitEvidence(
        contentHashBytes,
        ipfsHash,
        category || 'general',
        pseudonymousId
      );

      const receipt = await tx.wait();

      let submissionId;
      for (const log of receipt.logs) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          if (parsed && parsed.name === 'SubmissionCreated') {
            submissionId = parsed.args.id.toString();
            break;
          }
        } catch (e) {}
      }

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        submissionId,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Blockchain submission error:', error);
      throw new Error(`Blockchain submission failed: ${error.message}`);
    }
  }

  /**
   * Verify proof of existence
   */
  async verifyProofOfExistence(contentHash) {
    try {
      const contentHashBytes = '0x' + contentHash;
      const result = await this.contract.verifyProofOfExistence(contentHashBytes);
      return {
        exists: result.exists,
        submissionId: result.submissionId.toString(),
        timestamp: result.timestamp.toString(),
        verified: result.exists
      };
    } catch (error) {
      throw new Error(`Verification failed: ${error.message}`);
    }
  }

  /**
   * Get submission details
   */
  async getSubmission(submissionId) {
    try {
      const basic = await this.contract.getSubmissionBasic(submissionId);
      const details = await this.contract.getSubmissionDetails(submissionId);
      const statuses = ['Pending', 'UnderReview', 'Validated', 'Rejected', 'Released'];

      return {
        id: submissionId.toString(),
        contentHash: basic.contentHash,
        ipfsHash: basic.ipfsHash,
        timestamp: new Date(Number(basic.timestamp) * 1000).toISOString(),
        blockNumber: basic.blockNumber.toString(),
        status: statuses[basic.status] || 'Unknown',
        isPublic: basic.isPublic,
        pseudonymousId: details.pseudonymousId,
        validationCount: details.validationCount.toString(),
        rejectionCount: details.rejectionCount.toString(),
        category: details.category
      };
    } catch (error) {
      throw new Error(`Get submission failed: ${error.message}`);
    }
  }

  /**
   * Get validation history
   */
  async getValidationHistory(submissionId) {
    try {
      const count = await this.contract.getValidationCount(submissionId);
      const history = [];
      for (let i = 0; i < Number(count); i++) {
        const v = await this.contract.getValidation(submissionId, i);
        history.push({
          validator: v.validator,
          timestamp: new Date(Number(v.timestamp) * 1000).toISOString(),
          approved: v.approved,
          comment: v.comment
        });
      }
      return history;
    } catch (error) {
      throw new Error(`Get validation history failed: ${error.message}`);
    }
  }

  /**
   * Get access logs
   */
  async getAccessLogs(submissionId) {
    try {
      const count = await this.contract.getAccessLogCount(submissionId);
      const logs = [];
      for (let i = 0; i < Number(count); i++) {
        const a = await this.contract.getAccessLog(submissionId, i);
        logs.push({
          accessor: a.accessor,
          timestamp: new Date(Number(a.timestamp) * 1000).toISOString(),
          action: a.action
        });
      }
      return logs;
    } catch (error) {
      throw new Error(`Get access logs failed: ${error.message}`);
    }
  }

  /**
   * Get reputation
   */
  async getReputation(pseudonymousId) {
    try {
      const rep = await this.contract.getReputation(pseudonymousId);
      return {
        totalSubmissions: rep.total.toString(),
        validatedSubmissions: rep.validated.toString(),
        trustScore: rep.score.toString()
      };
    } catch (error) {
      throw new Error(`Get reputation failed: ${error.message}`);
    }
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(submissionId) {
    try {
      const submission = await this.getSubmission(submissionId);
      const validations = await this.getValidationHistory(submissionId);
      const accesses = await this.getAccessLogs(submissionId);
      const reputation = await this.getReputation(submission.pseudonymousId);
      return { submission, validations, accesses, reputation, generatedAt: new Date().toISOString() };
    } catch (error) {
      throw new Error(`Generate audit report failed: ${error.message}`);
    }
  }

  async logAccess(submissionId, action) {
    return { success: true, note: 'Read-only mode' };
  }

  getStatusString(status) {
    const statuses = ['Pending', 'UnderReview', 'Validated', 'Rejected', 'Released'];
    return statuses[status] || 'Unknown';
  }

  async getCurrentBlock() {
    return await this.provider.getBlockNumber();
  }

  async getNetworkInfo() {
    const network = await this.provider.getNetwork();
    return { name: network.name, chainId: network.chainId.toString() };
  }
}

module.exports = BlockchainService;