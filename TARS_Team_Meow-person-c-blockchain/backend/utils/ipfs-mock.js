// Mock IPFS utilities for Node.js 18 compatibility and demo purposes
// In production, replace with real IPFS implementation
const fs = require('fs');
const crypto = require('crypto');

/**
 * Mock IPFS client for demonstration and testing
 * This provides the same interface as real IPFS but stores files locally
 */

// Mock storage directory for IPFS files
const mockIPFSDir = require('path').join(__dirname, '../mock-ipfs');

/**
 * Initialize mock IPFS storage
 */
function initializeMockIPFS() {
  if (!fs.existsSync(mockIPFSDir)) {
    fs.mkdirSync(mockIPFSDir, { recursive: true });
    console.log(`🌐 Mock IPFS storage initialized at ${mockIPFSDir}`);
  }
}

/**
 * Generate a mock IPFS CID (Content Identifier)
 * In real IPFS, this would be based on file content hash
 * @param {Buffer} fileBuffer - File content buffer
 * @returns {string} - Mock IPFS CID
 */
function generateMockCID(fileBuffer) {
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  // Format as IPFS v1 CID (base32) - make it valid for our validator
  return `bafybeih${hash.substring(0, 50)}`;
}

/**
 * Upload file to mock IPFS network
 * @param {string} filePath - Path to file to upload
 * @returns {Promise<Object>} - Upload result with CID and size
 */
async function uploadToIPFS(filePath) {
  try {
    initializeMockIPFS();
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const cid = generateMockCID(fileBuffer);
    const size = fileBuffer.length;
    
    // Store file in mock IPFS directory with CID as filename
    const mockStoragePath = require('path').join(mockIPFSDir, cid);
    fs.writeFileSync(mockStoragePath, fileBuffer);
    
    console.log(`🌐 Mock IPFS: File uploaded with CID ${cid}`);
    
    return {
      cid,
      size,
      path: mockStoragePath
    };

  } catch (error) {
    console.error('❌ Mock IPFS upload error:', error.message);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}

/**
 * Download file from mock IPFS network
 * @param {string} cid - IPFS Content Identifier
 * @param {string} outputPath - Where to save the downloaded file
 * @returns {Promise<Object>} - Download result
 */
async function downloadFromIPFS(cid, outputPath) {
  try {
    initializeMockIPFS();
    
    const mockStoragePath = require('path').join(mockIPFSDir, cid);
    
    if (!fs.existsSync(mockStoragePath)) {
      throw new Error(`File with CID ${cid} not found in mock IPFS`);
    }

    const fileBuffer = fs.readFileSync(mockStoragePath);
    fs.writeFileSync(outputPath, fileBuffer);
    
    console.log(`🌐 Mock IPFS: File downloaded from ${cid} to ${outputPath}`);
    
    return {
      cid,
      size: fileBuffer.length,
      downloadPath: outputPath
    };

  } catch (error) {
    console.error('❌ Mock IPFS download error:', error.message);
    throw new Error(`IPFS download failed: ${error.message}`);
  }
}

/**
 * Pin file to mock IPFS (mark as permanent)
 * @param {string} cid - IPFS Content Identifier
 * @returns {Promise<Object>} - Pin result
 */
async function pinFile(cid) {
  try {
    initializeMockIPFS();
    
    const mockStoragePath = require('path').join(mockIPFSDir, cid);
    
    if (!fs.existsSync(mockStoragePath)) {
      throw new Error(`File with CID ${cid} not found in mock IPFS`);
    }

    // Create a pin marker file
    const pinMarkerPath = `${mockStoragePath}.pin`;
    fs.writeFileSync(pinMarkerPath, JSON.stringify({
      cid,
      pinnedAt: new Date().toISOString(),
      mock: true
    }));
    
    console.log(`📌 Mock IPFS: File ${cid} pinned`);
    
    return {
      cid,
      pinned: true,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Mock IPFS pin error:', error.message);
    throw new Error(`IPFS pin failed: ${error.message}`);
  }
}

/**
 * Unpin file from mock IPFS
 * @param {string} cid - IPFS Content Identifier
 * @returns {Promise<Object>} - Unpin result
 */
async function unpinFile(cid) {
  try {
    initializeMockIPFS();
    
    const pinMarkerPath = require('path').join(mockIPFSDir, `${cid}.pin`);
    
    if (fs.existsSync(pinMarkerPath)) {
      fs.unlinkSync(pinMarkerPath);
      console.log(`📌 Mock IPFS: File ${cid} unpinned`);
    }
    
    return {
      cid,
      unpinned: true,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Mock IPFS unpin error:', error.message);
    throw new Error(`IPFS unpin failed: ${error.message}`);
  }
}

/**
 * Validate IPFS CID format
 * @param {string} cid - Content Identifier to validate
 * @returns {boolean} - True if valid CID format
 */
function validateCID(cid) {
  if (!cid || typeof cid !== 'string') {
    return false;
  }

  // Basic CID validation for our mock implementation
  // Accept both v0 (Qm...) and v1 (bafy...) formats
  const cidPattern = /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[a-z0-9]{50,})$/;
  return cidPattern.test(cid);
}

/**
 * Get mock IPFS client info
 * @returns {Object} - Mock client information
 */
function getClientInfo() {
  return {
    type: 'mock',
    version: '1.0.0',
    storage: mockIPFSDir,
    node: 'localhost:5001 (simulated)',
    connected: true,
    note: 'This is a mock IPFS implementation for demo purposes'
  };
}

/**
 * List all files in mock IPFS storage
 * @returns {Array} - List of stored files with metadata
 */
function listStoredFiles() {
  try {
    initializeMockIPFS();
    
    const files = fs.readdirSync(mockIPFSDir);
    const fileList = [];
    
    files.forEach(filename => {
      if (!filename.endsWith('.pin')) {
        const filePath = require('path').join(mockIPFSDir, filename);
        const stats = fs.statSync(filePath);
        const isPinned = fs.existsSync(`${filePath}.pin`);
        
        fileList.push({
          cid: filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          pinned: isPinned
        });
      }
    });
    
    return fileList;

  } catch (error) {
    console.error('❌ Error listing mock IPFS files:', error.message);
    return [];
  }
}

/**
 * Clean up mock IPFS storage (for testing)
 * @returns {Object} - Cleanup result
 */
function cleanupMockStorage() {
  try {
    if (fs.existsSync(mockIPFSDir)) {
      const files = fs.readdirSync(mockIPFSDir);
      files.forEach(filename => {
        const filePath = require('path').join(mockIPFSDir, filename);
        fs.unlinkSync(filePath);
      });
      fs.rmdirSync(mockIPFSDir);
      console.log(`🧹 Mock IPFS storage cleaned up`);
    }
    
    return {
      success: true,
      message: 'Mock IPFS storage cleaned up successfully'
    };

  } catch (error) {
    console.error('❌ Mock IPFS cleanup error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  uploadToIPFS,
  downloadFromIPFS,
  pinFile,
  unpinFile,
  validateCID,
  getClientInfo,
  listStoredFiles,
  cleanupMockStorage,
  generateMockCID
};