/**
 * TARS Redaction Routes
 * API endpoints for PDF redaction functionality
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfRedactionService = require('../services/pdfRedactionService');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed for redaction'), false);
        }
    }
});

/**
 * POST /api/redaction/extract-text
 * Extract text from PDF for preview
 */
router.post('/extract-text', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file provided'
            });
        }

        const result = await pdfRedactionService.extractText(req.file.buffer);
        
        if (result.success) {
            res.json({
                success: true,
                text: result.text,
                numPages: result.numPages,
                fileName: req.file.originalname
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error extracting text:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/redaction/detect-pii
 * Auto-detect potential PII in the PDF
 */
router.post('/detect-pii', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file provided'
            });
        }

        const result = await pdfRedactionService.detectPII(req.file.buffer);
        
        if (result.success) {
            res.json({
                success: true,
                detectedPII: result.detectedPII,
                totalPIIFound: result.totalPIIFound,
                recommendation: result.recommendation,
                textPreview: result.extractedTextPreview,
                fileName: req.file.originalname
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error detecting PII:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/redaction/preview
 * Preview what will be redacted
 */
router.post('/preview', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file provided'
            });
        }

        const wordsToRedact = req.body.words ? JSON.parse(req.body.words) : [];
        
        if (wordsToRedact.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No words specified for redaction'
            });
        }

        const result = await pdfRedactionService.previewRedactions(req.file.buffer, wordsToRedact);
        
        if (result.success) {
            res.json({
                success: true,
                preview: result.preview,
                numPages: result.numPages,
                fileName: req.file.originalname
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error previewing redactions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/redaction/apply
 * Apply redactions and return the redacted PDF
 */
router.post('/apply', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file provided'
            });
        }

        const wordsToRedact = req.body.words ? JSON.parse(req.body.words) : [];
        
        if (wordsToRedact.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No words specified for redaction'
            });
        }

        const result = await pdfRedactionService.redactPDF(req.file.buffer, wordsToRedact);
        
        if (result.success) {
            // Return the redacted PDF as a downloadable file
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="redacted-${req.file.originalname}"`);
            res.setHeader('X-Redactions-Applied', result.redactionsApplied.toString());
            res.setHeader('X-Redacted-Words', JSON.stringify(result.redactedWords));
            res.send(result.pdfBuffer);
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error applying redactions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/redaction/apply-and-upload
 * Apply redactions and return base64 for further processing
 */
router.post('/apply-and-upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No PDF file provided'
            });
        }

        const wordsToRedact = req.body.words ? JSON.parse(req.body.words) : [];
        
        console.log('🔒 Redaction request received:');
        console.log('   - Original file size:', req.file.buffer.length, 'bytes');
        console.log('   - Words to redact:', wordsToRedact);
        
        // If no words to redact, return original file
        if (wordsToRedact.length === 0) {
            return res.json({
                success: true,
                redactedFile: req.file.buffer.toString('base64'),
                redactionsApplied: 0,
                message: 'No redactions applied',
                originalName: req.file.originalname,
                mimeType: req.file.mimetype
            });
        }

        const result = await pdfRedactionService.redactPDF(req.file.buffer, wordsToRedact);
        
        console.log('🔒 Redaction result:');
        console.log('   - Success:', result.success);
        console.log('   - Redacted file size:', result.pdfBuffer ? result.pdfBuffer.length : 0, 'bytes');
        console.log('   - Redactions applied:', result.redactionsApplied);
        
        if (result.success) {
            res.json({
                success: true,
                redactedFile: result.pdfBuffer.toString('base64'),
                redactionsApplied: result.redactionsApplied,
                redactedWords: result.redactedWords,
                message: result.message,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error applying redactions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
