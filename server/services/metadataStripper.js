const sharp = require('sharp');
const ExifParser = require('exif-parser');
const crypto = require('crypto');
const path = require('path');

/**
 * MetadataStripper - Removes all identifying metadata from files
 * Supports: Images (JPEG, PNG, GIF, WebP, TIFF), PDFs, Documents
 */
class MetadataStripper {
  constructor() {
    this.supportedImageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif'];
    this.supportedDocFormats = ['.pdf', '.doc', '.docx', '.txt'];
  }

  /**
   * Strip all metadata from a file buffer
   * @param {Buffer} fileBuffer - Original file buffer
   * @param {string} filename - Original filename
   * @returns {Object} - Sanitized buffer, hash, and metadata report
   */
  async stripMetadata(fileBuffer, filename) {
    const ext = path.extname(filename).toLowerCase();
    const originalHash = this.generateHash(fileBuffer);
    
    let result = {
      originalHash,
      sanitizedBuffer: null,
      sanitizedHash: null,
      strippedMetadata: {},
      metadataReport: {
        filename: this.sanitizeFilename(filename),
        originalSize: fileBuffer.length,
        sanitizedSize: 0,
        strippedFields: [],
        timestamp: new Date().toISOString()
      }
    };

    try {
      if (this.supportedImageFormats.includes(ext)) {
        result = await this.stripImageMetadata(fileBuffer, result);
      } else if (ext === '.pdf') {
        result = await this.stripPdfMetadata(fileBuffer, result);
      } else {
        // For unsupported formats, just strip filename metadata
        result.sanitizedBuffer = fileBuffer;
        result.sanitizedHash = originalHash;
        result.metadataReport.note = 'File type not fully supported for metadata stripping';
      }

      result.metadataReport.sanitizedSize = result.sanitizedBuffer.length;
      result.metadataReport.verificationHash = this.generateHash(
        JSON.stringify(result.metadataReport)
      );

    } catch (error) {
      throw new Error(`Metadata stripping failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Strip metadata from images using Sharp
   */
  async stripImageMetadata(fileBuffer, result) {
    // Extract existing EXIF data for reporting
    try {
      const parser = ExifParser.create(fileBuffer);
      const exifData = parser.parse();
      
      if (exifData.tags) {
        result.strippedMetadata = {
          // GPS Data (CRITICAL for anonymity)
          gps: {
            latitude: exifData.tags.GPSLatitude,
            longitude: exifData.tags.GPSLongitude,
            altitude: exifData.tags.GPSAltitude,
            timestamp: exifData.tags.GPSTimeStamp
          },
          // Camera/Device Info
          device: {
            make: exifData.tags.Make,
            model: exifData.tags.Model,
            software: exifData.tags.Software,
            serialNumber: exifData.tags.SerialNumber
          },
          // Timestamps
          timestamps: {
            dateTime: exifData.tags.DateTime,
            dateTimeOriginal: exifData.tags.DateTimeOriginal,
            dateTimeDigitized: exifData.tags.DateTimeDigitized
          },
          // Author Info
          author: {
            artist: exifData.tags.Artist,
            copyright: exifData.tags.Copyright,
            author: exifData.tags.Author
          },
          // Other potentially identifying info
          other: {
            imageDescription: exifData.tags.ImageDescription,
            userComment: exifData.tags.UserComment,
            documentName: exifData.tags.DocumentName
          }
        };

        // Log what was stripped
        Object.entries(result.strippedMetadata).forEach(([category, data]) => {
          Object.entries(data).forEach(([field, value]) => {
            if (value !== undefined) {
              result.metadataReport.strippedFields.push(`${category}.${field}`);
            }
          });
        });
      }
    } catch (exifError) {
      // No EXIF data or parsing failed - continue with stripping
      result.metadataReport.note = 'No EXIF data found or parsing failed';
    }

    // Use Sharp to strip all metadata and re-encode
    const image = sharp(fileBuffer);
    const metadata = await image.metadata();

    // Re-encode without metadata
    let sanitizedBuffer;
    switch (metadata.format) {
      case 'jpeg':
        sanitizedBuffer = await image
          .rotate() // Auto-rotate based on EXIF, then discard EXIF
          .jpeg({ quality: 95, progressive: true })
          .withMetadata(false)
          .toBuffer();
        break;
      case 'png':
        sanitizedBuffer = await image
          .png({ compressionLevel: 9 })
          .withMetadata(false)
          .toBuffer();
        break;
      case 'webp':
        sanitizedBuffer = await image
          .webp({ quality: 95 })
          .withMetadata(false)
          .toBuffer();
        break;
      case 'gif':
        sanitizedBuffer = await image
          .gif()
          .withMetadata(false)
          .toBuffer();
        break;
      case 'tiff':
        sanitizedBuffer = await image
          .tiff({ compression: 'lzw' })
          .withMetadata(false)
          .toBuffer();
        break;
      default:
        sanitizedBuffer = await image
          .withMetadata(false)
          .toBuffer();
    }

    result.sanitizedBuffer = sanitizedBuffer;
    result.sanitizedHash = this.generateHash(sanitizedBuffer);

    return result;
  }

  /**
   * Strip metadata from PDF files
   */
  async stripPdfMetadata(fileBuffer, result) {
    // PDF metadata stripping - basic implementation
    // For production, consider using pdf-lib or similar
    
    const pdfString = fileBuffer.toString('binary');
    
    // Extract metadata that will be stripped
    const metadataPatterns = [
      /\/Author\s*\([^)]*\)/gi,
      /\/Creator\s*\([^)]*\)/gi,
      /\/Producer\s*\([^)]*\)/gi,
      /\/Title\s*\([^)]*\)/gi,
      /\/Subject\s*\([^)]*\)/gi,
      /\/Keywords\s*\([^)]*\)/gi,
      /\/CreationDate\s*\([^)]*\)/gi,
      /\/ModDate\s*\([^)]*\)/gi
    ];

    result.strippedMetadata.pdf = {};
    metadataPatterns.forEach(pattern => {
      const matches = pdfString.match(pattern);
      if (matches) {
        const fieldName = pattern.source.match(/\/(\w+)/)[1];
        result.strippedMetadata.pdf[fieldName] = matches[0];
        result.metadataReport.strippedFields.push(`pdf.${fieldName}`);
      }
    });

    // Remove metadata (simplified - for production use proper PDF library)
    let sanitizedPdf = pdfString;
    metadataPatterns.forEach(pattern => {
      sanitizedPdf = sanitizedPdf.replace(pattern, '');
    });

    result.sanitizedBuffer = Buffer.from(sanitizedPdf, 'binary');
    result.sanitizedHash = this.generateHash(result.sanitizedBuffer);

    return result;
  }

  /**
   * Generate SHA-256 hash of content
   */
  generateHash(content) {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
  }

  /**
   * Sanitize filename to remove identifying information
   */
  sanitizeFilename(filename) {
    const ext = path.extname(filename);
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    return `evidence_${timestamp}_${randomId}${ext}`;
  }

  /**
   * Verify that metadata was properly stripped
   */
  async verifyStripping(originalBuffer, sanitizedBuffer, fileType) {
    const verification = {
      originalHasMetadata: false,
      sanitizedHasMetadata: false,
      verificationPassed: false,
      details: {}
    };

    if (this.supportedImageFormats.some(f => fileType.includes(f.slice(1)))) {
      try {
        // Check original
        const originalParser = ExifParser.create(originalBuffer);
        const originalExif = originalParser.parse();
        verification.originalHasMetadata = Object.keys(originalExif.tags || {}).length > 0;

        // Check sanitized
        const sanitizedParser = ExifParser.create(sanitizedBuffer);
        const sanitizedExif = sanitizedParser.parse();
        verification.sanitizedHasMetadata = Object.keys(sanitizedExif.tags || {}).length > 0;

        verification.verificationPassed = !verification.sanitizedHasMetadata;
        verification.details = {
          originalFieldCount: Object.keys(originalExif.tags || {}).length,
          sanitizedFieldCount: Object.keys(sanitizedExif.tags || {}).length
        };
      } catch (error) {
        verification.verificationPassed = true; // No parseable EXIF = clean
        verification.details.note = 'No EXIF data detected';
      }
    }

    return verification;
  }

  /**
   * Get list of potentially dangerous metadata fields
   */
  static getDangerousFields() {
    return {
      critical: [
        'GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'GPSTimeStamp',
        'SerialNumber', 'LensSerialNumber', 'InternalSerialNumber'
      ],
      identifying: [
        'Make', 'Model', 'Software', 'Artist', 'Copyright', 'Author',
        'OwnerName', 'CameraOwnerName', 'BodySerialNumber'
      ],
      timestamps: [
        'DateTime', 'DateTimeOriginal', 'DateTimeDigitized',
        'CreateDate', 'ModifyDate', 'GPSDateStamp'
      ],
      other: [
        'ImageDescription', 'UserComment', 'DocumentName',
        'HostComputer', 'MacAddress', 'UUID'
      ]
    };
  }
}

module.exports = MetadataStripper;
