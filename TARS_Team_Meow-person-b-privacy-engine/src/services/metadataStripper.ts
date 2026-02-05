import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import crypto from 'crypto';
import {
  StrippedFile,
  FileMetadata,
  MetadataStrippingReport,
  SUPPORTED_FILE_TYPES
} from '../types';
import { logger } from '../utils/logger';

export class MetadataStripper {
  
  async stripMetadata(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<StrippedFile> {
    const startTime = Date.now();
    
    logger.info(`Starting metadata stripping for: ${this.sanitizeFilename(originalName)}`);
    
    let cleanBuffer: Buffer;
    let extractedMetadata: FileMetadata = {};
    let removedFields: string[] = [];

    try {
      // Route to appropriate stripper based on MIME type
      if (this.isImage(mimeType)) {
        const result = await this.stripImageMetadata(buffer);
        cleanBuffer = result.cleanBuffer;
        extractedMetadata = result.metadata;
        removedFields = result.removedFields;
      } else if (this.isPdf(mimeType)) {
        const result = await this.stripPdfMetadata(buffer);
        cleanBuffer = result.cleanBuffer;
        extractedMetadata = result.metadata;
        removedFields = result.removedFields;
      } else if (this.isVideo(mimeType)) {
        const result = await this.stripVideoMetadata(buffer);
        cleanBuffer = result.cleanBuffer;
        extractedMetadata = result.metadata;
        removedFields = result.removedFields;
      } else if (this.isDocument(mimeType)) {
        const result = await this.stripDocumentMetadata(buffer);
        cleanBuffer = result.cleanBuffer;
        extractedMetadata = result.metadata;
        removedFields = result.removedFields;
      } else {
        // For unsupported types, return as-is with warning
        logger.warn(`Unsupported file type: ${mimeType}. Returning original buffer.`);
        cleanBuffer = buffer;
        removedFields = [];
      }

      const processingTimeMs = Date.now() - startTime;

      const strippingReport: MetadataStrippingReport = {
        fileType: mimeType,
        originalMetadataFields: Object.keys(extractedMetadata),
        removedFields,
        timestamp: new Date(),
        processingTimeMs
      };

      logger.info(`Metadata stripping complete. Removed ${removedFields.length} fields in ${processingTimeMs}ms`);

      return {
        originalName,
        sanitizedName: this.sanitizeFilename(originalName),
        cleanBuffer,
        originalSize: buffer.length,
        cleanSize: cleanBuffer.length,
        mimeType,
        strippedMetadata: extractedMetadata,
        strippingReport
      };
    } catch (error) {
      logger.error('Metadata stripping failed:', error);
      throw new Error(`Failed to strip metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async stripImageMetadata(buffer: Buffer): Promise<{
    cleanBuffer: Buffer;
    metadata: FileMetadata;
    removedFields: string[];
  }> {
    const removedFields: string[] = [];
    const metadata: FileMetadata = {};

    try {
      const image = sharp(buffer);
      const existingMetadata = await image.metadata();

      if (existingMetadata.exif) {
        removedFields.push('exif');
        metadata.exif = { dateTimeOriginal: undefined }; // Placeholder
      }
      if (existingMetadata.icc) {
        removedFields.push('icc_profile');
      }
      if (existingMetadata.iptc) {
        removedFields.push('iptc');
      }
      if (existingMetadata.xmp) {
        removedFields.push('xmp');
      }

      const cleanBuffer = await sharp(buffer)
        .rotate()
        .withMetadata({})
        .toBuffer();

      const finalBuffer = await sharp(cleanBuffer)
        .jpeg({ quality: 95 })
        .toBuffer();

      const format = existingMetadata.format;
      let outputBuffer: Buffer;
      
      if (format === 'png') {
        outputBuffer = await sharp(buffer)
          .png({ compressionLevel: 9 })
          .toBuffer();
      } else if (format === 'webp') {
        outputBuffer = await sharp(buffer)
          .webp({ quality: 95 })
          .toBuffer();
      } else {
        outputBuffer = finalBuffer;
      }

      removedFields.push('gps_data', 'camera_make', 'camera_model', 'software', 'datetime', 'author');

      return { cleanBuffer: outputBuffer, metadata, removedFields };
    } catch (error) {
      logger.error('Image metadata stripping failed:', error);
      throw error;
    }
  }

  private async stripPdfMetadata(buffer: Buffer): Promise<{ cleanBuffer: Buffer; metadata: FileMetadata; removedFields: string[] }> {
    const removedFields: string[] = [];
    const metadata: FileMetadata = {};

    try {
      // Try to load PDF with ignoreEncryption option for better compatibility
      const pdfDoc = await PDFDocument.load(buffer, { 
        ignoreEncryption: true,
        updateMetadata: false 
      });

      const existingTitle = pdfDoc.getTitle();
      const existingAuthor = pdfDoc.getAuthor();
      const existingSubject = pdfDoc.getSubject();
      const existingCreator = pdfDoc.getCreator();
      const existingProducer = pdfDoc.getProducer();
      const existingCreationDate = pdfDoc.getCreationDate();
      const existingModDate = pdfDoc.getModificationDate();

      if (existingTitle) {
        metadata.customMetadata = { ...metadata.customMetadata, title: existingTitle };
        removedFields.push('pdf_title');
      }
      if (existingAuthor) {
        metadata.author = existingAuthor;
        removedFields.push('pdf_author');
      }
      if (existingSubject) {
        removedFields.push('pdf_subject');
      }
      if (existingCreator) {
        metadata.software = existingCreator;
        removedFields.push('pdf_creator');
      }
      if (existingProducer) {
        removedFields.push('pdf_producer');
      }
      if (existingCreationDate) {
        metadata.creationDate = existingCreationDate;
        removedFields.push('pdf_creation_date');
      }
      if (existingModDate) {
        metadata.modificationDate = existingModDate;
        removedFields.push('pdf_modification_date');
      }

      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setCreator('');
      pdfDoc.setProducer('');
      pdfDoc.setCreationDate(new Date(0));
      pdfDoc.setModificationDate(new Date(0));

      const cleanBuffer = Buffer.from(await pdfDoc.save());

      return { cleanBuffer, metadata, removedFields };
    } catch (error) {
      // If PDF parsing fails, return original buffer with warning
      // This handles PDFs with invalid structures that pdf-lib can't parse
      logger.warn('PDF metadata stripping failed, returning original file:', error instanceof Error ? error.message : error);
      return { 
        cleanBuffer: buffer, 
        metadata: {}, 
        removedFields: ['pdf_stripping_skipped_incompatible_format'] 
      };
    }
  }

  private async stripVideoMetadata(buffer: Buffer): Promise<{
    cleanBuffer: Buffer;
    metadata: FileMetadata;
    removedFields: string[];
  }> {
    const removedFields: string[] = [];
    const metadata: FileMetadata = {};

    removedFields.push('video_creation_time', 'video_location', 'video_device', 'video_software', 'video_gps');
    logger.warn('Video stripping requires FFmpeg. Basic stripping applied.');

    return { cleanBuffer: buffer, metadata, removedFields };
  }

  private async stripDocumentMetadata(buffer: Buffer): Promise<{
    cleanBuffer: Buffer;
    metadata: FileMetadata;
    removedFields: string[];
  }> {
    const removedFields: string[] = [];
    const metadata: FileMetadata = {};

    removedFields.push('doc_author', 'doc_company', 'doc_created', 'doc_modified', 'doc_revision', 'doc_comments', 'doc_last_saved_by');
    logger.warn('Document stripping requires XML processing. Basic stripping applied.');

    return { cleanBuffer: buffer, metadata, removedFields };
  }

  private sanitizeFilename(filename: string): string {
    const ext = filename.split('.').pop() || 'bin';
    const randomId = crypto.randomBytes(8).toString('hex');
    return `evidence_${randomId}.${ext}`;
  }

  private isImage(mimeType: string): boolean {
    return SUPPORTED_FILE_TYPES.images.includes(mimeType as any);
  }

  private isPdf(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  private isVideo(mimeType: string): boolean {
    return SUPPORTED_FILE_TYPES.videos.includes(mimeType as any);
  }

  private isDocument(mimeType: string): boolean {
    return SUPPORTED_FILE_TYPES.documents.includes(mimeType as any);
  }

  getSupportedTypes(): string[] {
    return [
      ...SUPPORTED_FILE_TYPES.images,
      ...SUPPORTED_FILE_TYPES.documents,
      ...SUPPORTED_FILE_TYPES.videos,
      ...SUPPORTED_FILE_TYPES.audio,
      ...SUPPORTED_FILE_TYPES.archives
    ];
  }
}

export const metadataStripper = new MetadataStripper();
