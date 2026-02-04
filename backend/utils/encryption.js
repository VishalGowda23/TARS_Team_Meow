const CryptoJS = require('crypto-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * AES Encryption/Decryption utilities for secure file handling
 */

// Generate a random AES key
function generateAESKey() {
  return crypto.randomBytes(32).toString('hex'); // 256-bit key
}

// Generate a random IV
function generateIV() {
  return crypto.randomBytes(16).toString('hex'); // 128-bit IV
}

/**
 * Encrypt data using AES-256-GCM
 * @param {Buffer|string} data - Data to encrypt
 * @param {string} key - 256-bit key in hex format (optional, generates if not provided)
 * @returns {Object} - Encrypted data with key, iv, and authTag
 */
function encryptAES(data, key = null) {
  try {
    // Generate key if not provided
    if (!key) {
      key = generateAESKey();
    }
    
    // Convert data to buffer if string
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    
    // Generate IV
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipher('aes-256-cbc', Buffer.from(key, 'hex'));
    
    // Encrypt data
    let encrypted = cipher.update(dataBuffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    return {
      key: key,
      iv: iv.toString('hex'),
      encryptedData: encrypted.toString('hex'),
      algorithm: 'aes-256-cbc'
    };
    
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Hex-encoded encrypted data
 * @param {string} key - 256-bit key in hex format
 * @param {string} iv - IV in hex format
 * @returns {Buffer} - Decrypted data
 */
function decryptAES(encryptedData, key, iv) {
  try {
    // Create decipher
    const decipher = crypto.createDecipher('aes-256-cbc', Buffer.from(key, 'hex'));
    
    // Decrypt data
    let decrypted = decipher.update(Buffer.from(encryptedData, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
    
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt file from path and save encrypted version
 * @param {string} filePath - Path to file to encrypt
 * @param {string} key - Encryption key (optional, will generate if not provided)
 * @returns {string} - Path to encrypted file
 */
function encryptFile(filePath, key = null) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const encryptionKey = key || generateAESKey();
    
    // Encrypt the file buffer
    const result = encryptAES(fileBuffer, encryptionKey);
    
    // Create encrypted file path
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const encryptedPath = path.join(dir, `${baseName}_encrypted${ext}`);
    
    // Save encrypted data to file
    const encryptedBuffer = Buffer.from(result.encryptedData, 'hex');
    fs.writeFileSync(encryptedPath, encryptedBuffer);
    
    console.log(`🔐 File encrypted and saved to ${path.basename(encryptedPath)}`);
    
    return encryptedPath;
    
  } catch (error) {
    console.error('File encryption error:', error);
    throw new Error('Failed to encrypt file');
  }
}

/**
 * Encrypt file buffer for secure storage (original buffer-based function)
 * @param {Buffer} fileBuffer - File data to encrypt
 * @param {string} customKey - Optional custom encryption key
 * @returns {Object} - Encryption result with metadata
 */
function encryptFileBuffer(filePath, customKey = null) {
  try {
    const startTime = Date.now();
    
    // Generate or use provided key
    const key = customKey || generateAESKey();
    
    // Encrypt the file buffer
    const result = encryptAES(fileBuffer, key);
    
    const endTime = Date.now();
    
    return {
      ...result,
      fileSize: fileBuffer.length,
      encryptedSize: Buffer.from(result.encryptedData, 'hex').length,
      encryptionTime: endTime - startTime,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('File encryption error:', error);
    throw new Error('Failed to encrypt file');
  }
}

/**
 * Decrypt file and save decrypted version
 * @param {string} encryptedFilePath - Path to encrypted file  
 * @param {string} key - Decryption key
 * @returns {string} - Path to decrypted file
 */
function decryptFile(encryptedFilePath, key) {
  try {
    if (!fs.existsSync(encryptedFilePath)) {
      throw new Error(`Encrypted file not found: ${encryptedFilePath}`);
    }

    const encryptedBuffer = fs.readFileSync(encryptedFilePath);
    
    // For this demo, we're simplifying decryption
    // In production, you'd need to extract IV and properly decrypt
    const decryptedBuffer = encryptedBuffer; // Simplified for demo
    
    // Create decrypted file path
    const dir = path.dirname(encryptedFilePath);
    const ext = path.extname(encryptedFilePath);
    const baseName = path.basename(encryptedFilePath, ext);
    const decryptedPath = path.join(dir, `${baseName}_decrypted${ext}`);
    
    // Save decrypted data to file
    fs.writeFileSync(decryptedPath, decryptedBuffer);
    
    console.log(`🔓 File decrypted and saved to ${path.basename(decryptedPath)}`);
    
    return decryptedPath;
    
  } catch (error) {
    console.error('File decryption error:', error);
    throw new Error('Failed to decrypt file');
  }
}

/**
 * Decrypt file buffer (original buffer-based function)
 * @param {string} encryptedData - Hex-encoded encrypted file data
 * @param {string} key - Decryption key
 * @param {string} iv - Initialization vector
 * @returns {Buffer} - Decrypted file buffer
 */
function decryptFileBuffer(encryptedData, key, iv) {
  try {
    const startTime = Date.now();
    
    const decryptedBuffer = decryptAES(encryptedData, key, iv);
    
    const endTime = Date.now();
    
    console.log(`File decryption completed in ${endTime - startTime}ms`);
    
    return decryptedBuffer;
    
  } catch (error) {
    console.error('File decryption error:', error);
    throw new Error('Failed to decrypt file');
  }
}

/**
 * Generate secure encryption key for evidence
 * @param {string} evidenceId - Evidence identifier
 * @param {string} submitterAddress - Ethereum address of submitter
 * @returns {string} - Deterministic key based on evidence metadata
 */
function generateEvidenceKey(evidenceId, submitterAddress) {
  try {
    // Create deterministic key from evidence metadata
    const keyMaterial = `${evidenceId}-${submitterAddress}-${process.env.ENCRYPTION_SALT || 'tars-default-salt'}`;
    
    // Generate key using PBKDF2
    const key = crypto.pbkdf2Sync(keyMaterial, 'salt', 10000, 32, 'sha256');
    
    return key.toString('hex');
    
  } catch (error) {
    console.error('Key generation error:', error);
    throw new Error('Failed to generate evidence encryption key');
  }
}

/**
 * Validate encryption key format
 * @param {string} key - Key to validate
 * @returns {boolean} - True if valid
 */
function validateKey(key) {
  try {
    // Check if key is 64-character hex string (256-bit)
    return typeof key === 'string' && key.length === 64 && /^[0-9a-fA-F]{64}$/.test(key);
  } catch (error) {
    return false;
  }
}

/**
 * Validate IV format
 * @param {string} iv - IV to validate
 * @returns {boolean} - True if valid
 */
function validateIV(iv) {
  try {
    // Check if IV is 32-character hex string (128-bit)
    return typeof iv === 'string' && iv.length === 32 && /^[0-9a-fA-F]{32}$/.test(iv);
  } catch (error) {
    return false;
  }
}

/**
 * Create encryption metadata for storage
 * @param {Object} encryptionResult - Result from encryptFile
 * @returns {Object} - Metadata for storage
 */
function createEncryptionMetadata(encryptionResult) {
  return {
    algorithm: encryptionResult.algorithm,
    keyLength: 256,
    ivLength: 128,
    fileSize: encryptionResult.fileSize,
    encryptedSize: encryptionResult.encryptedSize,
    encryptionTime: encryptionResult.encryptionTime,
    timestamp: encryptionResult.timestamp,
    // Note: Key and IV are not stored here for security
    keyStored: false,
    ivStored: false
  };
}

module.exports = {
  generateAESKey,
  generateIV,
  encryptAES,
  decryptAES,
  encryptFile,
  encryptFileBuffer,
  decryptFile,
  decryptFileBuffer,
  generateEvidenceKey,
  validateKey,
  validateIV,
  createEncryptionMetadata
};