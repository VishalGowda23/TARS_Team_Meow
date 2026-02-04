export interface FileMetadata {
  gps?: GPSData;
  exif?: ExifData;
  author?: string;
  device?: DeviceInfo;
  creationDate?: Date;
  modificationDate?: Date;
  software?: string;
  comments?: string;
  customMetadata?: Record<string, unknown>;
}

export interface GPSData {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  timestamp?: Date;
}

export interface ExifData {
  make?: string;
  model?: string;
  orientation?: number;
  exposureTime?: string;
  fNumber?: number;
  iso?: number;
  dateTimeOriginal?: Date;
  dateTimeDigitized?: Date;
  shutterSpeed?: number;
  aperture?: number;
  brightness?: number;
  flash?: boolean;
  focalLength?: number;
  lensModel?: string;
  serialNumber?: string;
}

export interface DeviceInfo {
  make?: string;
  model?: string;
  serialNumber?: string;
  osVersion?: string;
  appVersion?: string;
}

export interface StrippedFile {
  originalName: string;
  sanitizedName: string;
  cleanBuffer: Buffer;
  originalSize: number;
  cleanSize: number;
  mimeType: string;
  strippedMetadata: FileMetadata;
  strippingReport: MetadataStrippingReport;
}

export interface MetadataStrippingReport {
  fileType: string;
  originalMetadataFields: string[];
  removedFields: string[];
  timestamp: Date;
  processingTimeMs: number;
  warnings?: string[];
}

export interface EvidenceHash {
  sha256: string;
  sha512?: string;
  md5?: string;
  blake3?: string;
  timestamp: Date;
  fileSize: number;
}

export interface HashVerificationResult {
  isValid: boolean;
  computedHash: string;
  expectedHash: string;
  algorithm: HashAlgorithm;
  verifiedAt: Date;
}

export type HashAlgorithm = 'sha256' | 'sha512' | 'md5' | 'blake3';

export interface StagedEvidence {
  stageId: string;
  encryptedBuffer: Buffer;
  iv: string;
  authTag: string;
  evidenceHash: EvidenceHash;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  maxAccess: number;
}

export interface StagingConfig {
  ttlSeconds: number;
  maxAccessCount: number;
  encryptionAlgorithm: string;
  keyDerivationIterations: number;
}

export interface SubmissionRequest {
  file: Express.Multer.File;
  description?: string;
  caseTags?: string[];
  urgency?: 'low' | 'medium' | 'high' | 'critical';
}

export interface SubmissionResponse {
  success: boolean;
  submissionId: string;
  evidenceHash: string;
  timestamp: Date;
  stageId: string;
  receipt: SubmissionReceipt;
}

export interface SubmissionReceipt {
  submissionId: string;
  evidenceHash: string;
  submittedAt: Date;
  fileType: string;
  sanitizedSize: number;
  metadataRemoved: string[];
  verificationUrl?: string;
}

export interface TorConfig {
  socksPort: number;
  controlPort: number;
  hiddenServiceDir?: string;
  circuitBuildTimeout: number;
  maxCircuitDirtiness: number;
}

export interface TorConnectionStatus {
  isConnected: boolean;
  circuitId?: string;
  exitNode?: string;
  latencyMs?: number;
  lastChecked: Date;
}

export interface AnonymousRequest {
  originalIp: string;
  torCircuit?: string;
  timestamp: Date;
  requestId: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  requestId: string;
  timestamp: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export const SUPPORTED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff', 'image/bmp'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  videos: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac'],
  archives: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed']
} as const;

export type SupportedMimeType = 
  | typeof SUPPORTED_FILE_TYPES.images[number]
  | typeof SUPPORTED_FILE_TYPES.documents[number]
  | typeof SUPPORTED_FILE_TYPES.videos[number]
  | typeof SUPPORTED_FILE_TYPES.audio[number]
  | typeof SUPPORTED_FILE_TYPES.archives[number];
