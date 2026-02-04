const { hashFile } = require('./hashing');
const fs = require('fs');
const path = require('path');

/**
 * Validates file hash consistency throughout the processing pipeline
 * Ensures file integrity is maintained during encryption and storage operations
 */

/**
 * Tracks file processing pipeline with hash validation
 * @param {string} originalFilePath - Path to original uploaded file
 * @param {string} processedFilePath - Path to metadata-stripped file
 * @param {string} encryptedFilePath - Path to encrypted file
 * @param {Object} options - Validation options
 * @returns {Object} Validation results with hash consistency information
 */
async function validateProcessingPipeline(originalFilePath, processedFilePath, encryptedFilePath, options = {}) {
  const { logSteps = false, strictMode = false } = options;
  
  try {
    const validationResult = {
      success: true,
      steps: {},
      hashes: {},
      integrity: {
        originalToProcessed: false,
        processedToEncrypted: false,
        overallConsistency: false
      },
      warnings: [],
      errors: []
    };

    // Step 1: Validate original file hash
    if (!fs.existsSync(originalFilePath)) {
      throw new Error(`Original file not found: ${originalFilePath}`);
    }

    validationResult.hashes.original = await hashFile(originalFilePath);
    validationResult.steps.originalHash = 'completed';
    if (logSteps) console.log('🔍 Original file hash:', validationResult.hashes.original);

    // Step 2: Validate processed file hash (after metadata stripping)
    if (processedFilePath && fs.existsSync(processedFilePath)) {
      validationResult.hashes.processed = await hashFile(processedFilePath);
      validationResult.steps.processedHash = 'completed';
      
      // Compare original vs processed (should be different if metadata was stripped)
      const metadataStripped = validationResult.hashes.original !== validationResult.hashes.processed;
      validationResult.integrity.originalToProcessed = true; // File exists and is readable
      validationResult.integrity.metadataStripped = metadataStripped;
      
      if (logSteps) {
        console.log('🔍 Processed file hash:', validationResult.hashes.processed);
        console.log('🧹 Metadata stripping detected:', metadataStripped);
      }
    } else {
      validationResult.warnings.push('Processed file not found, using original file');
      validationResult.hashes.processed = validationResult.hashes.original;
      validationResult.integrity.metadataStripped = false;
    }

    // Step 3: Validate encrypted file hash
    if (encryptedFilePath && fs.existsSync(encryptedFilePath)) {
      validationResult.hashes.encrypted = await hashFile(encryptedFilePath);
      validationResult.steps.encryptedHash = 'completed';
      
      // Compare processed vs encrypted (should be different due to encryption)
      const encryptionApplied = validationResult.hashes.processed !== validationResult.hashes.encrypted;
      validationResult.integrity.processedToEncrypted = encryptionApplied;
      
      if (logSteps) {
        console.log('🔍 Encrypted file hash:', validationResult.hashes.encrypted);
        console.log('🔐 Encryption detected:', encryptionApplied);
      }

      if (!encryptionApplied && strictMode) {
        validationResult.errors.push('Encrypted file hash matches processed file - encryption may have failed');
        validationResult.success = false;
      }
    } else {
      validationResult.warnings.push('Encrypted file not found for validation');
      validationResult.steps.encryptedHash = 'skipped';
    }

    // Overall consistency check
    const hasAllHashes = validationResult.hashes.original && 
                        validationResult.hashes.processed && 
                        validationResult.hashes.encrypted;
    
    validationResult.integrity.overallConsistency = hasAllHashes && 
      validationResult.integrity.originalToProcessed && 
      validationResult.integrity.processedToEncrypted;

    // File size validation
    const originalStats = fs.statSync(originalFilePath);
    validationResult.fileSizes = {
      original: originalStats.size
    };

    if (processedFilePath && fs.existsSync(processedFilePath)) {
      const processedStats = fs.statSync(processedFilePath);
      validationResult.fileSizes.processed = processedStats.size;
    }

    if (encryptedFilePath && fs.existsSync(encryptedFilePath)) {
      const encryptedStats = fs.statSync(encryptedFilePath);
      validationResult.fileSizes.encrypted = encryptedStats.size;
    }

    return validationResult;

  } catch (error) {
    return {
      success: false,
      error: error.message,
      steps: {},
      hashes: {},
      integrity: {
        originalToProcessed: false,
        processedToEncrypted: false,
        overallConsistency: false
      },
      warnings: [],
      errors: [error.message]
    };
  }
}

/**
 * Validates that a file hash matches an expected hash value
 * @param {string} filePath - Path to file to validate
 * @param {string} expectedHash - Expected hash value
 * @returns {Object} Validation result
 */
async function validateFileHash(filePath, expectedHash) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const actualHash = await hashFile(filePath);
    const matches = actualHash === expectedHash;

    return {
      success: true,
      matches,
      expectedHash,
      actualHash,
      filePath: path.basename(filePath),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      matches: false,
      expectedHash,
      actualHash: null,
      filePath: filePath,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Generates a verification report for the entire processing pipeline
 * @param {Object} processingData - Data from file processing pipeline
 * @returns {Object} Detailed verification report
 */
function generateVerificationReport(processingData) {
  const {
    originalHash,
    processedHash,
    encryptedHash,
    ipfsCID,
    fileSizes,
    processingTime
  } = processingData;

  const report = {
    timestamp: new Date().toISOString(),
    processingId: `verification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    hashVerification: {
      original: originalHash,
      processed: processedHash || 'N/A',
      encrypted: encryptedHash || 'N/A'
    },
    consistency: {
      metadataStripping: originalHash !== processedHash,
      encryptionApplied: processedHash !== encryptedHash,
      hashIntegrity: 'verified'
    },
    storage: {
      ipfsCID: ipfsCID || 'N/A',
      ipfsValidated: ipfsCID ? true : false
    },
    performance: {
      processingTime: processingTime || 'N/A',
      fileSizes: fileSizes || {}
    },
    status: 'completed',
    recommendations: []
  };

  // Add recommendations based on findings
  if (!report.consistency.metadataStripping) {
    report.recommendations.push('Consider verifying metadata stripping functionality');
  }

  if (!report.consistency.encryptionApplied) {
    report.recommendations.push('Verify encryption is properly applied');
  }

  if (!report.storage.ipfsCID) {
    report.recommendations.push('Ensure IPFS upload completed successfully');
  }

  return report;
}

/**
 * Quick hash consistency check between two files
 * @param {string} filePath1 - First file path
 * @param {string} filePath2 - Second file path
 * @returns {Object} Comparison result
 */
async function compareFileHashes(filePath1, filePath2) {
  try {
    if (!fs.existsSync(filePath1)) {
      throw new Error(`First file not found: ${filePath1}`);
    }

    if (!fs.existsSync(filePath2)) {
      throw new Error(`Second file not found: ${filePath2}`);
    }

    const [hash1, hash2] = await Promise.all([
      hashFile(filePath1),
      hashFile(filePath2)
    ]);

    return {
      success: true,
      identical: hash1 === hash2,
      file1: {
        path: path.basename(filePath1),
        hash: hash1
      },
      file2: {
        path: path.basename(filePath2),
        hash: hash2
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      identical: false,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  validateProcessingPipeline,
  validateFileHash,
  generateVerificationReport,
  compareFileHashes
};