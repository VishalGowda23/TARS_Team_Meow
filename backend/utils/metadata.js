const sharp = require('sharp');
const ExifParser = require('exif-parser');
const fs = require('fs');
const path = require('path');

/**
 * Removes metadata from file at given path
 * @param {string} filePath - Path to file to process
 * @returns {string} - Path to processed file with metadata removed
 */
async function stripMetadata(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // Determine MIME type from extension
    let mimetype;
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        mimetype = 'image/jpeg';
        break;
      case '.png':
        mimetype = 'image/png';
        break;
      case '.gif':
        mimetype = 'image/gif';
        break;
      case '.webp':
        mimetype = 'image/webp';
        break;
      case '.pdf':
        mimetype = 'application/pdf';
        break;
      default:
        // For non-image/PDF files, just return original path
        console.log(`⏭️ Metadata stripping not applicable for file type: ${ext}`);
        return filePath;
    }
    
    // Process the file to remove metadata
    const processedBuffer = await stripMetadataFromBuffer(buffer, mimetype);
    
    // Save processed file with new name
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, ext);
    const processedPath = path.join(dir, `${baseName}_processed${ext}`);
    
    fs.writeFileSync(processedPath, processedBuffer);
    
    console.log(`🧹 Metadata stripped from ${path.basename(filePath)}`);
    return processedPath;
    
  } catch (error) {
    console.error('Metadata stripping error:', error);
    throw new Error('Failed to strip metadata from file');
  }
}

/**
 * Removes metadata from buffer based on MIME type
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File MIME type
 * @returns {Buffer} - File buffer with metadata removed
 */
async function stripMetadataFromBuffer(buffer, mimetype) {
  try {
    // Handle image files
    if (mimetype.startsWith('image/')) {
      return await stripImageMetadata(buffer, mimetype);
    }
    
    // Handle PDF files
    if (mimetype === 'application/pdf') {
      return await stripPdfMetadata(buffer);
    }
    
    // Handle Office documents
    if (isOfficeDocument(mimetype)) {
      return await stripOfficeMetadata(buffer);
    }
    
    // For other file types, return as-is with warning
    console.warn(`Metadata stripping not implemented for ${mimetype}, returning original file`);
    return buffer;
    
  } catch (error) {
    console.error('Error stripping metadata:', error);
    throw new Error('Failed to strip metadata from file');
  }
}

/**
 * Removes EXIF and other metadata from images
 * @param {Buffer} buffer - Image buffer
 * @param {string} mimetype - Image MIME type
 * @returns {Buffer} - Image buffer without metadata
 */
async function stripImageMetadata(buffer, mimetype) {
  try {
    // Use Sharp to remove all metadata and re-encode
    const format = getImageFormat(mimetype);
    
    let sharpInstance = sharp(buffer)
      .rotate() // Auto-rotate based on EXIF orientation, then remove EXIF
      .withMetadata(false); // Remove all metadata
    
    // Apply format-specific processing
    switch (format) {
      case 'jpeg':
        return await sharpInstance.jpeg({ quality: 95, progressive: true }).toBuffer();
      case 'png':
        return await sharpInstance.png({ compressionLevel: 6, progressive: true }).toBuffer();
      case 'gif':
        // Sharp has limited GIF support, try to maintain format
        return await sharpInstance.gif().toBuffer();
      case 'webp':
        return await sharpInstance.webp({ quality: 95 }).toBuffer();
      default:
        // Default to JPEG for unknown formats
        return await sharpInstance.jpeg({ quality: 95 }).toBuffer();
    }
    
  } catch (error) {
    console.error('Error stripping image metadata:', error);
    throw new Error('Failed to strip metadata from image');
  }
}

/**
 * Basic PDF metadata removal (simplified implementation)
 * Note: Complete PDF metadata removal requires specialized libraries
 * @param {Buffer} buffer - PDF buffer
 * @returns {Buffer} - PDF buffer (basic processing)
 */
async function stripPdfMetadata(buffer) {
  try {
    // Basic PDF metadata stripping
    // This is a simplified implementation - production would use pdf-lib or similar
    let pdfString = buffer.toString('binary');
    
    // Remove common metadata fields
    const metadataPatterns = [
      /\/Author\s*\([^)]*\)/gi,
      /\/Creator\s*\([^)]*\)/gi,
      /\/Producer\s*\([^)]*\)/gi,
      /\/Subject\s*\([^)]*\)/gi,
      /\/Title\s*\([^)]*\)/gi,
      /\/Keywords\s*\([^)]*\)/gi,
      /\/CreationDate\s*\([^)]*\)/gi,
      /\/ModDate\s*\([^)]*\)/gi
    ];
    
    metadataPatterns.forEach(pattern => {
      pdfString = pdfString.replace(pattern, '');
    });
    
    return Buffer.from(pdfString, 'binary');
    
  } catch (error) {
    console.error('Error stripping PDF metadata:', error);
    // Return original if processing fails
    return buffer;
  }
}

/**
 * Basic Office document metadata removal
 * Note: Complete implementation would require specialized libraries
 * @param {Buffer} buffer - Document buffer
 * @returns {Buffer} - Document buffer
 */
async function stripOfficeMetadata(buffer) {
  try {
    // Basic Office document processing
    // Production implementation would use libraries like officegen, docx, etc.
    console.warn('Office document metadata stripping not fully implemented');
    return buffer;
    
  } catch (error) {
    console.error('Error stripping Office metadata:', error);
    return buffer;
  }
}

/**
 * Check if file is an Office document
 * @param {string} mimetype - File MIME type
 * @returns {boolean} - True if Office document
 */
function isOfficeDocument(mimetype) {
  const officeTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  
  return officeTypes.includes(mimetype);
}

/**
 * Get image format from MIME type
 * @param {string} mimetype - Image MIME type
 * @returns {string} - Image format for Sharp
 */
function getImageFormat(mimetype) {
  const formatMap = {
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpeg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/tiff': 'tiff',
    'image/svg+xml': 'svg'
  };
  
  return formatMap[mimetype] || 'jpeg';
}

/**
 * Analyze file for metadata (for testing/validation)
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File MIME type
 * @returns {Object} - Metadata analysis results
 */
async function analyzeMetadata(buffer, mimetype) {
  const analysis = {
    hasMetadata: false,
    metadataTypes: [],
    fileSize: buffer.length,
    mimetype: mimetype
  };
  
  if (mimetype.startsWith('image/')) {
    try {
      // Check for EXIF data
      const exifParser = ExifParser.create(buffer);
      const result = exifParser.parse();
      
      if (result && Object.keys(result.tags).length > 0) {
        analysis.hasMetadata = true;
        analysis.metadataTypes.push('EXIF');
        analysis.exifTags = Object.keys(result.tags);
      }
      
    } catch (error) {
      // No EXIF data found or parse error
      console.log('No EXIF data found or parse error:', error.message);
    }
  }
  
  return analysis;
}

module.exports = {
  stripMetadata,
  stripMetadataFromBuffer,
  stripImageMetadata,
  analyzeMetadata
};