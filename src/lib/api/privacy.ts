// TARS Privacy Engine API (Person B)
// Handles anonymous submission, metadata stripping, and hashing

import { API_CONFIG } from './config';
import { post, get, ApiResponse } from './client';

const BASE_URL = API_CONFIG.PRIVACY_ENGINE.BASE_URL;
const ENDPOINTS = API_CONFIG.PRIVACY_ENGINE.ENDPOINTS;

// Types
export interface SubmissionReceipt {
  submissionId: string;
  evidenceHash: string;
  submittedAt: string;
  fileType: string;
  sanitizedSize: number;
  metadataRemoved: string[];
}

export interface SubmissionResponse {
  submissionId: string;
  evidenceHash: string;
  timestamp: string;
  stageId: string;
  receipt: SubmissionReceipt;
  storage?: {
    ipfsCid: string;
    arweaveTx?: string;
    evidenceId?: string;
    blockchainTx?: string;
  };
}

export interface VerifyResponse {
  isValid: boolean;
  computedHash: string;
  expectedHash: string;
  algorithm: string;
  verifiedAt: string;
}

export interface HealthResponse {
  service: string;
  version: string;
  status: string;
}

// API Functions

/**
 * Submit evidence through the Privacy Engine
 * - Strips metadata (EXIF, GPS, author info)
 * - Generates SHA-256 hash
 * - Stages encrypted evidence
 * - Forwards to Person D for storage
 */
export async function submitEvidence(
  file: File,
  description?: string,
  caseTags?: string[]
): Promise<ApiResponse<SubmissionResponse>> {
  const formData = new FormData();
  formData.append('evidence', file);
  
  if (description) {
    formData.append('description', description);
  }
  
  if (caseTags && caseTags.length > 0) {
    formData.append('caseTags', caseTags.join(','));
  }

  const response = await fetch(`${BASE_URL}${ENDPOINTS.SUBMIT}`, {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

/**
 * Verify a hash against stored evidence
 */
export async function verifyHash(
  hash: string,
  algorithm: 'sha256' | 'sha512' | 'md5' = 'sha256'
): Promise<ApiResponse<VerifyResponse>> {
  return post<VerifyResponse>(`${BASE_URL}${ENDPOINTS.VERIFY}`, {
    hash,
    algorithm,
  });
}

/**
 * Get submission status by stage ID
 */
export async function getSubmissionStatus(
  stageId: string
): Promise<ApiResponse<{ staged: boolean; accessCount: number; expiresAt: string }>> {
  return get(`${BASE_URL}${ENDPOINTS.STATUS}/${stageId}`);
}

/**
 * Check Privacy Engine health
 */
export async function checkHealth(): Promise<ApiResponse<HealthResponse>> {
  return get<HealthResponse>(`${BASE_URL}${ENDPOINTS.HEALTH}`);
}
