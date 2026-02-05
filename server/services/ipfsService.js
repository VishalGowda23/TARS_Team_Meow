const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * IPFS Service - Handles decentralized storage via Pinata
 */
class IPFSService {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
    this.pinataJWT = process.env.PINATA_JWT;
    this.pinataBaseUrl = 'https://api.pinata.cloud';
    this.gateway = 'https://gateway.pinata.cloud/ipfs';
  }

  /**
   * Upload file to IPFS via Pinata
   * @param {Buffer} fileBuffer - File content
   * @param {string} filename - Sanitized filename
   * @param {Object} metadata - Additional metadata for pinning
   * @returns {Object} - IPFS hash and details
   */
  async uploadFile(fileBuffer, filename, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: filename,
        contentType: 'application/octet-stream'
      });

      // Sanitize metadata - Pinata only accepts strings and numbers
      const sanitizedMetadata = {};
      if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
          if (typeof value === 'string' || typeof value === 'number') {
            sanitizedMetadata[key] = value;
          } else if (typeof value === 'boolean') {
            sanitizedMetadata[key] = value.toString();
          } else if (value !== null && value !== undefined) {
            sanitizedMetadata[key] = String(value);
          }
        }
      }

      // Add pinata metadata
      const pinataMetadata = JSON.stringify({
        name: filename,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
          contentHash: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
          ...sanitizedMetadata
        }
      });
      formData.append('pinataMetadata', pinataMetadata);

      // Pin options
      const pinataOptions = JSON.stringify({
        cidVersion: 1,
        wrapWithDirectory: false
      });
      formData.append('pinataOptions', pinataOptions);

      const response = await axios.post(
        `${this.pinataBaseUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          maxBodyLength: Infinity,
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${this.pinataJWT}`
          }
        }
      );

      return {
        success: true,
        ipfsHash: response.data.IpfsHash,
        pinSize: response.data.PinSize,
        timestamp: response.data.Timestamp,
        gatewayUrl: `${this.gateway}/${response.data.IpfsHash}`,
        isDuplicate: response.data.isDuplicate || false
      };
    } catch (error) {
      console.error('IPFS upload error:', error.response?.data || error.message);
      throw new Error(`IPFS upload failed: ${error.message}`);
    }
  }

  /**
   * Upload JSON data to IPFS
   * @param {Object} jsonData - JSON object to upload
   * @param {string} name - Name for the pin
   * @returns {Object} - IPFS hash and details
   */
  async uploadJSON(jsonData, name = 'evidence-metadata') {
    try {
      const response = await axios.post(
        `${this.pinataBaseUrl}/pinning/pinJSONToIPFS`,
        {
          pinataContent: jsonData,
          pinataMetadata: {
            name: name,
            keyvalues: {
              uploadedAt: new Date().toISOString(),
              type: 'metadata'
            }
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.pinataJWT}`
          }
        }
      );

      return {
        success: true,
        ipfsHash: response.data.IpfsHash,
        gatewayUrl: `${this.gateway}/${response.data.IpfsHash}`
      };
    } catch (error) {
      console.error('IPFS JSON upload error:', error.response?.data || error.message);
      throw new Error(`IPFS JSON upload failed: ${error.message}`);
    }
  }

  /**
   * Retrieve file from IPFS
   * @param {string} ipfsHash - IPFS CID
   * @returns {Buffer} - File content
   */
  async getFile(ipfsHash) {
    try {
      const response = await axios.get(`${this.gateway}/${ipfsHash}`, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`IPFS retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get JSON data from IPFS
   * @param {string} ipfsHash - IPFS CID
   * @returns {Object} - JSON content
   */
  async getJSON(ipfsHash) {
    try {
      const response = await axios.get(`${this.gateway}/${ipfsHash}`, {
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      throw new Error(`IPFS JSON retrieval failed: ${error.message}`);
    }
  }

  /**
   * Check if a file is pinned
   * @param {string} ipfsHash - IPFS CID to check
   * @returns {Object} - Pin status
   */
  async checkPinStatus(ipfsHash) {
    try {
      const response = await axios.get(
        `${this.pinataBaseUrl}/pinning/pinJobs?ipfs_pin_hash=${ipfsHash}`,
        {
          headers: {
            'Authorization': `Bearer ${this.pinataJWT}`
          }
        }
      );

      return {
        isPinned: response.data.rows.length > 0,
        pinDetails: response.data.rows[0] || null
      };
    } catch (error) {
      throw new Error(`Pin status check failed: ${error.message}`);
    }
  }

  /**
   * Unpin a file (should rarely be used - evidence should be immutable)
   * @param {string} ipfsHash - IPFS CID to unpin
   */
  async unpinFile(ipfsHash) {
    try {
      await axios.delete(
        `${this.pinataBaseUrl}/pinning/unpin/${ipfsHash}`,
        {
          headers: {
            'Authorization': `Bearer ${this.pinataJWT}`
          }
        }
      );

      return { success: true, message: 'File unpinned successfully' };
    } catch (error) {
      throw new Error(`Unpin failed: ${error.message}`);
    }
  }

  /**
   * List all pinned files
   * @param {Object} filters - Filter options
   * @returns {Array} - List of pinned files
   */
  async listPinnedFiles(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.pageLimit) queryParams.append('pageLimit', filters.pageLimit);
      if (filters.pageOffset) queryParams.append('pageOffset', filters.pageOffset);

      const response = await axios.get(
        `${this.pinataBaseUrl}/data/pinList?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.pinataJWT}`
          }
        }
      );

      return response.data.rows.map(pin => ({
        ipfsHash: pin.ipfs_pin_hash,
        size: pin.size,
        datePinned: pin.date_pinned,
        metadata: pin.metadata
      }));
    } catch (error) {
      throw new Error(`List pins failed: ${error.message}`);
    }
  }

  /**
   * Calculate IPFS hash without uploading (for verification)
   * @param {Buffer} content - Content to hash
   * @returns {string} - Expected IPFS hash
   */
  calculateHash(content) {
    // This is a simplified version - actual CID calculation is more complex
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Test Pinata connection
   */
  async testConnection() {
    try {
      const response = await axios.get(
        `${this.pinataBaseUrl}/data/testAuthentication`,
        {
          headers: {
            'Authorization': `Bearer ${this.pinataJWT}`
          }
        }
      );

      return {
        connected: true,
        message: response.data.message
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

module.exports = IPFSService;
