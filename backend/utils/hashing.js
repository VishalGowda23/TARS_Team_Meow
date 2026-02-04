const crypto = require('crypto');
const fs = require('fs');

/**
 * File hashing utilities for integrity verification
 */

/**
 * Calculate SHA-256 hash of data
 * @param {Buffer|string} data - Data to hash
 * @returns {string} - SHA-256 hash in hex format
 */
function calculateSHA256(data) {
  try {
    const hash = crypto.createHash('sha256');
    
    if (Buffer.isBuffer(data)) {
      hash.update(data);
    } else {
      hash.update(data, 'utf8');
    }
    
    return hash.digest('hex');
    
  } catch (error) {
    console.error('SHA-256 calculation error:', error);
    throw new Error('Failed to calculate SHA-256 hash');
  }
}

/**
 * Calculate hash of a file from file path
 * @param {string} filePath - Path to file to hash
 * @returns {string} - SHA-256 hash in hex format with prefix
 */
function hashFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    const hash = calculateSHA256(fileBuffer);
    
    // Return hash with SHA-256 prefix for consistency
    return `sha256:${hash}`;
    
  } catch (error) {
    console.error('File hashing error:', error);
    throw new Error('Failed to hash file');
  }
}

/**
 * Verify file integrity by comparing hashes
 * @param {Buffer} fileBuffer - File buffer to verify
 * @param {string} expectedHash - Expected SHA-256 hash
 * @returns {Object} - Verification result
 */
function verifyFileHash(fileBuffer, expectedHash) {
  try {
    const calculatedHash = calculateSHA256(fileBuffer);
    
    const isValid = calculatedHash === expectedHash;
    
    return {
      isValid: isValid,
      expectedHash: expectedHash,
      calculatedHash: calculatedHash,
      fileSize: fileBuffer.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Hash verification error:', error);
    throw new Error('Failed to verify file hash');
  }
}

/**
 * Calculate multiple hash algorithms for redundancy
 * @param {Buffer} data - Data to hash
 * @returns {Object} - Multiple hashes
 */
function calculateMultipleHashes(data) {
  try {
    const startTime = Date.now();
    
    const hashes = {
      sha256: crypto.createHash('sha256').update(data).digest('hex'),
      sha512: crypto.createHash('sha512').update(data).digest('hex'),
      md5: crypto.createHash('md5').update(data).digest('hex')
    };
    
    const endTime = Date.now();
    
    return {
      ...hashes,
      fileSize: data.length,
      hashTime: endTime - startTime,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Multiple hash calculation error:', error);
    throw new Error('Failed to calculate multiple hashes');
  }
}

/**
 * Create hash chain for integrity tracking through processing pipeline
 * @param {Array} hashes - Array of hashes from each processing step
 * @returns {string} - Chain hash
 */
function createHashChain(hashes) {
  try {
    // Concatenate all hashes and create a new hash
    const combinedHashes = hashes.join('');
    return calculateSHA256(combinedHashes);
    
  } catch (error) {
    console.error('Hash chain creation error:', error);
    throw new Error('Failed to create hash chain');
  }
}

/**
 * Generate Ethereum-compatible hash (used for smart contract)
 * @param {Buffer} data - Data to hash
 * @returns {string} - Hash with 0x prefix (Ethereum format)
 */
function generateEthereumHash(data) {
  try {
    const hash = calculateSHA256(data);
    return '0x' + hash;
    
  } catch (error) {
    console.error('Ethereum hash generation error:', error);
    throw new Error('Failed to generate Ethereum-compatible hash');
  }
}

/**
 * Validate hash format
 * @param {string} hash - Hash to validate
 * @param {string} algorithm - Hash algorithm ('sha256', 'sha512', 'md5')
 * @returns {boolean} - True if valid format
 */
function validateHashFormat(hash, algorithm = 'sha256') {
  try {
    const patterns = {
      sha256: /^[0-9a-fA-F]{64}$/,
      sha512: /^[0-9a-fA-F]{128}$/,
      md5: /^[0-9a-fA-F]{32}$/
    };
    
    const pattern = patterns[algorithm];
    if (!pattern) {
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
    }
    
    return pattern.test(hash);
    
  } catch (error) {
    console.error('Hash validation error:', error);
    return false;
  }
}

/**
 * Compare two hashes safely (timing-attack resistant)
 * @param {string} hash1 - First hash
 * @param {string} hash2 - Second hash
 * @returns {boolean} - True if hashes match
 */
function compareHashesSafe(hash1, hash2) {
  try {
    // Ensure hashes are strings and same length
    if (typeof hash1 !== 'string' || typeof hash2 !== 'string' || hash1.length !== hash2.length) {
      return false;
    }
    
    // Use crypto.timingSafeEqual for timing-attack resistance
    const buffer1 = Buffer.from(hash1, 'hex');
    const buffer2 = Buffer.from(hash2, 'hex');
    
    return crypto.timingSafeEqual(buffer1, buffer2);
    
  } catch (error) {
    console.error('Safe hash comparison error:', error);
    return false;
  }
}

/**
 * Generate file fingerprint (combination of hash and file metadata)
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} mimetype - File MIME type
 * @returns {Object} - File fingerprint
 */
function generateFileFingerprint(fileBuffer, filename, mimetype) {
  try {
    const hash = hashFile(fileBuffer);
    
    // Create metadata hash
    const metadata = JSON.stringify({
      filename: filename,
      mimetype: mimetype,
      size: fileBuffer.length
    });
    
    const metadataHash = calculateSHA256(metadata);
    
    return {
      contentHash: hash.hash,
      metadataHash: metadataHash,
      combinedHash: calculateSHA256(hash.hash + metadataHash),
      filename: filename,
      mimetype: mimetype,
      fileSize: fileBuffer.length,
      timestamp: hash.timestamp
    };
    
  } catch (error) {
    console.error('File fingerprint generation error:', error);
    throw new Error('Failed to generate file fingerprint');
  }
}

module.exports = {
  calculateSHA256,
  hashFile,
  verifyFileHash,
  calculateMultipleHashes,
  createHashChain,
  generateEthereumHash,
  validateHashFormat,
  compareHashesSafe,
  generateFileFingerprint
};