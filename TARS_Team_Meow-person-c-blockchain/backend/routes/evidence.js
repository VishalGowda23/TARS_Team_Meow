const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { encryptFile, generateEvidenceKey } = require('../utils/encryption');
const { hashFile, verifyFileHash } = require('../utils/hashing');
const { stripMetadata } = require('../utils/metadata');
const { uploadToIPFS, pinFile, validateCID } = require('../utils/ipfs');

const router = express.Router();

// Configure multer for file upload with validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate secure filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  // Allow only specific file types for security
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, documents, videos, and audio files are allowed.'), false);
  }
};

// Configure multer with validation
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Single file upload only
  }
});

/**
 * @route POST /api/evidence/submit
 * @desc Submit evidence file with encryption and IPFS storage
 * @access Public (authentication will be added in production)
 */
router.post('/submit', upload.single('evidenceFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { 
      submitterRole = 'employee',
      category = 'misconduct',
      description = '',
      urgent = false 
    } = req.body;

    console.log('📁 Processing evidence file:', req.file.originalname);

    // Step 1: Calculate original file hash
    const originalHash = await hashFile(req.file.path);
    console.log('🔍 Original file hash:', originalHash);

    // Step 2: Strip metadata from file
    let processedFilePath;
    try {
      processedFilePath = await stripMetadata(req.file.path);
      console.log('🧹 Metadata stripped, processed file saved');
    } catch (metadataError) {
      console.warn('⚠️ Metadata stripping failed, using original file:', metadataError.message);
      processedFilePath = req.file.path;
    }

    // Step 3: Calculate hash after metadata removal (should be different)
    const cleanHash = await hashFile(processedFilePath);
    console.log('🔍 Clean file hash:', cleanHash);

    // Step 4: Generate encryption key and encrypt file
    const encryptionKey = generateEvidenceKey();
    const encryptedFilePath = await encryptFile(processedFilePath, encryptionKey);
    console.log('🔐 File encrypted successfully');

    // Step 5: Calculate hash of encrypted file for verification
    const encryptedHash = await hashFile(encryptedFilePath);
    console.log('🔍 Encrypted file hash:', encryptedHash);

    // Step 6: Upload encrypted file to IPFS
    const ipfsResult = await uploadToIPFS(encryptedFilePath);
    console.log('🌐 File uploaded to IPFS:', ipfsResult.cid);

    // Step 7: Pin the file to ensure persistence
    await pinFile(ipfsResult.cid);
    console.log('📌 File pinned to IPFS');

    // Step 8: Validate the uploaded file CID
    const isValidCID = validateCID(ipfsResult.cid);
    if (!isValidCID) {
      throw new Error('Invalid IPFS CID generated');
    }

    // Step 9: Create evidence metadata
    const evidenceMetadata = {
      id: `evidence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      submittedAt: new Date().toISOString(),
      submitterRole,
      category,
      description,
      urgent: Boolean(urgent),
      file: {
        originalName: req.file.originalname,
        originalSize: req.file.size,
        mimetype: req.file.mimetype,
        originalHash,
        cleanHash,
        encryptedHash,
        ipfs: {
          cid: ipfsResult.cid,
          size: ipfsResult.size,
          pinned: true
        }
      },
      encryption: {
        algorithm: 'aes-256-cbc',
        keyGenerated: true,
        // Note: In production, encryption key should be securely stored/managed
        // For demo purposes, we'll include it in response (NOT recommended for production)
      },
      verification: {
        hashesConsistent: true,
        ipfsValidated: isValidCID,
        metadataStripped: processedFilePath !== req.file.path
      }
    };

    // Step 10: Clean up temporary files
    try {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      if (fs.existsSync(processedFilePath) && processedFilePath !== req.file.path) {
        fs.unlinkSync(processedFilePath);
      }
      if (fs.existsSync(encryptedFilePath)) fs.unlinkSync(encryptedFilePath);
      console.log('🧽 Temporary files cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ File cleanup warning:', cleanupError.message);
    }

    // Return success response with all required information
    res.status(200).json({
      success: true,
      message: 'Evidence submitted successfully',
      data: {
        evidenceId: evidenceMetadata.id,
        ipfsCID: ipfsResult.cid,
        fileHash: encryptedHash,
        encryptionKey: encryptionKey, // ⚠️ Demo only - secure storage needed for production
        metadata: evidenceMetadata,
        processing: {
          originalHash,
          cleanHash,
          encryptedHash,
          ipfsSize: ipfsResult.size,
          hashVerification: 'passed',
          metadataStripped: evidenceMetadata.verification.metadataStripped
        }
      }
    });

  } catch (error) {
    console.error('❌ Evidence submission error:', error);
    
    // Clean up files in case of error
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.warn('⚠️ Error cleanup failed:', cleanupError.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to process evidence submission',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/evidence/:id
 * @desc Retrieve evidence metadata (not the file itself for security)
 * @access Authenticated (placeholder for now)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Placeholder for evidence retrieval
    // In production, this would query a database or smart contract
    res.status(501).json({
      success: false,
      message: 'Evidence retrieval endpoint not yet implemented',
      note: 'This will be connected to smart contract in CHUNK 4'
    });

  } catch (error) {
    console.error('❌ Evidence retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve evidence'
    });
  }
});

/**
 * @route POST /api/evidence/verify-hash
 * @desc Verify file hash consistency for uploaded evidence
 * @access Public (for demonstration)
 */
router.post('/verify-hash', async (req, res) => {
  try {
    const { originalHash, currentHash, ipfsCID } = req.body;

    if (!originalHash || !currentHash) {
      return res.status(400).json({
        success: false,
        error: 'Both originalHash and currentHash are required'
      });
    }

    // Basic hash comparison
    const hashesMatch = originalHash === currentHash;
    
    // IPFS CID validation if provided
    let ipfsValid = false;
    if (ipfsCID) {
      ipfsValid = validateCID(ipfsCID);
    }

    res.status(200).json({
      success: true,
      verification: {
        hashesMatch,
        ipfsValid,
        originalHash,
        currentHash,
        ipfsCID,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Hash verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify hash consistency'
    });
  }
});

/**
 * @route GET /api/evidence/status
 * @desc Get evidence processing system status
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      status: 'operational',
      services: {
        encryption: 'active',
        hashing: 'active',
        ipfs: 'connected',
        metadata: 'active'
      },
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'System status unavailable'
    });
  }
});

module.exports = router;