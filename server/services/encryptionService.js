const crypto = require('crypto');

/**
 * Encryption Service - Handles selective disclosure encryption
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
  }

  /**
   * Generate a new encryption key
   * @returns {Object} - Key and its hash
   */
  generateKey() {
    const key = crypto.randomBytes(this.keyLength);
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    
    return {
      key: key.toString('hex'),
      keyHash: keyHash
    };
  }

  /**
   * Encrypt data for selective disclosure
   * @param {Buffer|string} data - Data to encrypt
   * @param {string} keyHex - Encryption key in hex
   * @returns {Object} - Encrypted data with IV and auth tag
   */
  encrypt(data, keyHex) {
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(
      typeof data === 'string' ? data : data.toString('binary'),
      'binary',
      'hex'
    );
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: this.algorithm
    };
  }

  /**
   * Decrypt data
   * @param {string} encryptedHex - Encrypted data in hex
   * @param {string} keyHex - Decryption key in hex
   * @param {string} ivHex - IV in hex
   * @param {string} authTagHex - Auth tag in hex
   * @returns {Buffer} - Decrypted data
   */
  decrypt(encryptedHex, keyHex, ivHex, authTagHex) {
    const key = Buffer.from(keyHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'binary');
    decrypted += decipher.final('binary');
    
    return Buffer.from(decrypted, 'binary');
  }

  /**
   * Create granular access keys for selective disclosure
   * Each key can decrypt specific parts of the evidence
   * @param {string} masterKey - Master encryption key
   * @param {number} numParts - Number of parts to split into
   * @returns {Array} - Array of derived keys
   */
  createAccessKeys(masterKey, numParts = 3) {
    const keys = [];
    
    for (let i = 0; i < numParts; i++) {
      const derivedKey = crypto.pbkdf2Sync(
        masterKey,
        `part_${i}_salt`,
        100000,
        this.keyLength,
        'sha512'
      );
      
      keys.push({
        partIndex: i,
        key: derivedKey.toString('hex'),
        keyHash: crypto.createHash('sha256').update(derivedKey).digest('hex')
      });
    }
    
    return keys;
  }

  /**
   * Split data into encrypted parts for staged release
   * @param {Buffer} data - Data to split
   * @param {number} numParts - Number of parts
   * @returns {Object} - Encrypted parts and their keys
   */
  splitAndEncrypt(data, numParts = 3) {
    const partSize = Math.ceil(data.length / numParts);
    const parts = [];
    const masterKey = this.generateKey();
    const accessKeys = this.createAccessKeys(masterKey.key, numParts);
    
    for (let i = 0; i < numParts; i++) {
      const start = i * partSize;
      const end = Math.min(start + partSize, data.length);
      const partData = data.slice(start, end);
      
      const encryptedPart = this.encrypt(partData, accessKeys[i].key);
      
      parts.push({
        partIndex: i,
        encrypted: encryptedPart.encrypted,
        iv: encryptedPart.iv,
        authTag: encryptedPart.authTag,
        size: partData.length
      });
    }
    
    return {
      masterKeyHash: masterKey.keyHash,
      parts,
      accessKeys: accessKeys.map(k => ({
        partIndex: k.partIndex,
        keyHash: k.keyHash
        // Note: actual keys should be distributed securely, not stored
      })),
      totalSize: data.length
    };
  }

  /**
   * Verify key hash matches
   * @param {string} keyHex - Key to verify
   * @param {string} expectedHash - Expected hash
   * @returns {boolean} - Whether key matches
   */
  verifyKey(keyHex, expectedHash) {
    const actualHash = crypto.createHash('sha256')
      .update(Buffer.from(keyHex, 'hex'))
      .digest('hex');
    return actualHash === expectedHash;
  }

  /**
   * Generate time-locked key (for scheduled release)
   * @param {string} key - Key to time-lock
   * @param {Date} releaseDate - When key becomes available
   * @returns {Object} - Time-locked key data
   */
  createTimeLockKey(key, releaseDate) {
    const timestamp = releaseDate.getTime();
    const timeSalt = crypto.createHash('sha256')
      .update(timestamp.toString())
      .digest();
    
    const lockedKey = crypto.pbkdf2Sync(
      key,
      timeSalt,
      100000,
      this.keyLength,
      'sha512'
    );
    
    return {
      lockedKeyHash: crypto.createHash('sha256').update(lockedKey).digest('hex'),
      releaseTimestamp: timestamp,
      releaseDate: releaseDate.toISOString(),
      // The actual unlocking would require a time-lock service
      unlockHint: 'Key will be derivable after release timestamp'
    };
  }
}

module.exports = EncryptionService;
