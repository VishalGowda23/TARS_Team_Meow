const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Contract configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// TARS Contract ABI (simplified - key functions only)
const TARS_ABI = [
  // Read functions
  "function superAdmin() view returns (address)",
  "function minApprovals() view returns (uint256)",
  "function evidenceCounter() view returns (uint256)",
  "function isEmployee(address) view returns (bool)",
  "function isValidator(address) view returns (bool)",
  "function evidences(uint256) view returns (uint256 id, address submitter, bytes32 fileHash, string ipfsCID, uint256 approvalCount, uint256 rejectionCount, uint8 status, uint256 timestamp)",
  "function hasVoted(uint256, address) view returns (bool)",
  "function validatorReputation(address) view returns (uint256)",
  
  // Write functions
  "function addEmployee(address employee)",
  "function addValidator(address validator)",
  "function removeEmployee(address employee)",
  "function removeValidator(address validator)",
  "function submitEvidence(bytes32 fileHash, string ipfsCID) returns (uint256)",
  "function voteOnEvidence(uint256 evidenceId, bool approve)",
  "function updateMinApprovals(uint256 newMinApprovals)",
  
  // Events
  "event EvidenceSubmitted(uint256 indexed id, address indexed submitter, bytes32 fileHash, string ipfsCID, uint256 timestamp)",
  "event EvidenceApproved(uint256 indexed id, uint256 approvalCount)",
  "event EvidenceRejected(uint256 indexed id, uint256 rejectionCount)",
  "event VoteCast(uint256 indexed evidenceId, address indexed validator, bool approve)"
];

// Status enum mapping
const StatusEnum = {
  0: 'PENDING',
  1: 'VERIFIED',
  2: 'REJECTED'
};

let provider = null;
let signer = null;
let contract = null;
let isInitialized = false;

/**
 * Initialize the contract connection
 */
async function initializeContract() {
  if (isInitialized) return true;
  
  if (!CONTRACT_ADDRESS || !SEPOLIA_RPC_URL || !PRIVATE_KEY) {
    console.warn('⚠️ Contract not configured. Missing CONTRACT_ADDRESS, SEPOLIA_RPC_URL, or PRIVATE_KEY');
    console.log('  CONTRACT_ADDRESS:', CONTRACT_ADDRESS ? '✓' : '✗');
    console.log('  SEPOLIA_RPC_URL:', SEPOLIA_RPC_URL ? '✓' : '✗');
    console.log('  PRIVATE_KEY:', PRIVATE_KEY ? '✓' : '✗');
    return false;
  }

  try {
    provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    signer = new ethers.Wallet(PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, TARS_ABI, signer);
    
    // Verify connection
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name, '(chainId:', network.chainId.toString(), ')');
    console.log('📍 Contract address:', CONTRACT_ADDRESS);
    console.log('🔑 Signer address:', signer.address);
    
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize contract:', error.message);
    return false;
  }
}

/**
 * Get contract status and stats
 */
async function getContractStats() {
  if (!await initializeContract()) {
    return { error: 'Contract not initialized' };
  }
  
  try {
    const [superAdmin, minApprovals, evidenceCounter] = await Promise.all([
      contract.superAdmin(),
      contract.minApprovals(),
      contract.evidenceCounter()
    ]);
    
    return {
      superAdmin,
      minApprovals: minApprovals.toString(),
      evidenceCounter: evidenceCounter.toString(),
      contractAddress: CONTRACT_ADDRESS,
      signerAddress: signer.address
    };
  } catch (error) {
    console.error('❌ Error getting contract stats:', error.message);
    return { error: error.message };
  }
}

/**
 * Submit evidence to the blockchain
 * @param {string} fileHash - SHA-256 hash of the file (as bytes32)
 * @param {string} ipfsCID - IPFS Content Identifier
 */
async function submitEvidence(fileHash, ipfsCID) {
  if (!await initializeContract()) {
    return { success: false, error: 'Contract not initialized' };
  }
  
  try {
    // Ensure hash is properly formatted as bytes32
    const hashBytes32 = fileHash.startsWith('0x') ? fileHash : `0x${fileHash}`;
    
    console.log('📝 Submitting evidence to blockchain...');
    console.log('  File Hash:', hashBytes32);
    console.log('  IPFS CID:', ipfsCID);
    
    const tx = await contract.submitEvidence(hashBytes32, ipfsCID);
    console.log('  Transaction hash:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('✅ Evidence submitted! Block:', receipt.blockNumber);
    
    // Parse the event to get evidence ID
    const event = receipt.logs.find(log => {
      try {
        return contract.interface.parseLog(log)?.name === 'EvidenceSubmitted';
      } catch { return false; }
    });
    
    let evidenceId = null;
    if (event) {
      const parsed = contract.interface.parseLog(event);
      evidenceId = parsed.args.id.toString();
    }
    
    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      evidenceId,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    console.error('❌ Error submitting evidence:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Vote on evidence
 * @param {number} evidenceId - Evidence ID
 * @param {boolean} approve - true to approve, false to reject
 */
async function voteOnEvidence(evidenceId, approve) {
  if (!await initializeContract()) {
    return { success: false, error: 'Contract not initialized' };
  }
  
  try {
    console.log(`🗳️ Voting on evidence #${evidenceId}: ${approve ? 'APPROVE' : 'REJECT'}`);
    
    const tx = await contract.voteOnEvidence(evidenceId, approve);
    console.log('  Transaction hash:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('✅ Vote recorded! Block:', receipt.blockNumber);
    
    // Get updated evidence status
    const evidence = await contract.evidences(evidenceId);
    
    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      evidenceId: evidenceId.toString(),
      newStatus: StatusEnum[evidence.status],
      approvals: evidence.approvalCount.toString(),
      rejections: evidence.rejectionCount.toString(),
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    console.error('❌ Error voting on evidence:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get evidence details by ID
 * @param {number} evidenceId - Evidence ID
 */
async function getEvidence(evidenceId) {
  if (!await initializeContract()) {
    return { success: false, error: 'Contract not initialized' };
  }
  
  try {
    const evidence = await contract.evidences(evidenceId);
    
    return {
      success: true,
      evidence: {
        id: evidence.id.toString(),
        submitter: evidence.submitter,
        fileHash: evidence.fileHash,
        ipfsCID: evidence.ipfsCID,
        approvalCount: evidence.approvalCount.toString(),
        rejectionCount: evidence.rejectionCount.toString(),
        status: StatusEnum[evidence.status],
        timestamp: new Date(Number(evidence.timestamp) * 1000).toISOString()
      }
    };
  } catch (error) {
    console.error('❌ Error getting evidence:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check if address is a validator
 */
async function checkIsValidator(address) {
  if (!await initializeContract()) {
    return false;
  }
  
  try {
    return await contract.isValidator(address);
  } catch (error) {
    console.error('❌ Error checking validator:', error.message);
    return false;
  }
}

/**
 * Check if address is an employee
 */
async function checkIsEmployee(address) {
  if (!await initializeContract()) {
    return false;
  }
  
  try {
    return await contract.isEmployee(address);
  } catch (error) {
    console.error('❌ Error checking employee:', error.message);
    return false;
  }
}

/**
 * Add an employee (admin only)
 */
async function addEmployee(address) {
  if (!await initializeContract()) {
    return { success: false, error: 'Contract not initialized' };
  }
  
  try {
    const tx = await contract.addEmployee(address);
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Add a validator (admin only)
 */
async function addValidator(address) {
  if (!await initializeContract()) {
    return { success: false, error: 'Contract not initialized' };
  }
  
  try {
    const tx = await contract.addValidator(address);
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeContract,
  getContractStats,
  submitEvidence,
  voteOnEvidence,
  getEvidence,
  checkIsValidator,
  checkIsEmployee,
  addEmployee,
  addValidator,
  StatusEnum
};
