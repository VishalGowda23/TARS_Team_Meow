const express = require('express');
const multer = require('multer');
const router = express.Router();

const IPFSService = require('../services/ipfsService');
const ipfsService = new IPFSService();

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

/**
 * POST /api/ipfs/upload
 * Upload file directly to IPFS (without blockchain registration)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const result = await ipfsService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.body.metadata ? JSON.parse(req.body.metadata) : {}
    );

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    res.status(500).json({
      error: 'IPFS upload failed',
      message: error.message
    });
  }
});

/**
 * POST /api/ipfs/upload-json
 * Upload JSON data to IPFS
 */
router.post('/upload-json', async (req, res) => {
  try {
    const { data, name } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'JSON data required' });
    }

    const result = await ipfsService.uploadJSON(data, name);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    res.status(500).json({
      error: 'IPFS JSON upload failed',
      message: error.message
    });
  }
});

/**
 * GET /api/ipfs/:hash
 * Retrieve file from IPFS
 */
router.get('/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const { format } = req.query;

    const content = await ipfsService.getFile(hash);

    if (format === 'json') {
      res.json(JSON.parse(content.toString()));
    } else if (format === 'base64') {
      res.json({
        success: true,
        content: content.toString('base64')
      });
    } else {
      res.set('Content-Type', 'application/octet-stream');
      res.send(content);
    }

  } catch (error) {
    res.status(500).json({
      error: 'IPFS retrieval failed',
      message: error.message
    });
  }
});

/**
 * GET /api/ipfs/:hash/status
 * Check pin status for an IPFS hash
 */
router.get('/:hash/status', async (req, res) => {
  try {
    const { hash } = req.params;

    const status = await ipfsService.checkPinStatus(hash);

    res.json({
      success: true,
      hash,
      ...status
    });

  } catch (error) {
    res.status(500).json({
      error: 'Status check failed',
      message: error.message
    });
  }
});

/**
 * GET /api/ipfs/list/pinned
 * List all pinned files
 */
router.get('/list/pinned', async (req, res) => {
  try {
    const { limit, offset } = req.query;

    const pins = await ipfsService.listPinnedFiles({
      pageLimit: limit || 10,
      pageOffset: offset || 0
    });

    res.json({
      success: true,
      count: pins.length,
      pins
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to list pins',
      message: error.message
    });
  }
});

/**
 * GET /api/ipfs/test
 * Test IPFS/Pinata connection
 */
router.get('/test/connection', async (req, res) => {
  try {
    const result = await ipfsService.testConnection();

    res.json({
      success: result.connected,
      ...result
    });

  } catch (error) {
    res.status(500).json({
      error: 'Connection test failed',
      message: error.message
    });
  }
});

module.exports = router;
