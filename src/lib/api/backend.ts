// TARS Backend API (Person D)
// Handles storage, validators, disclosure, and audit reports

import { API_CONFIG } from './config';
import { post, get, ApiResponse, withAuth } from './client';

const BASE_URL = API_CONFIG.BACKEND.BASE_URL;
const ENDPOINTS = API_CONFIG.BACKEND.ENDPOINTS;

// Types
export interface AuthChallenge {
  challenge: string;
  expiresAt: string;
}

export interface AuthToken {
  token: string;
  walletAddress: string;
  expiresAt: string;
}

export interface EvidenceSubmission {
  evidenceId: string;
  ipfsCid: string;
  arweaveTx?: string;
  status: string;
}

export interface ValidatorEvidence {
  id: string;
  originalHash: string;
  encryptedHash: string;
  ipfsCid: string;
  arweaveTx?: string;
  status: string;
  metadata: {
    fileName: string;
    iv: string;
    authTag: string;
  };
  assignments: Array<{
    walletAddress: string;
    assignedAt: string;
  }>;
}

export interface ValidatorVote {
  id: string;
  evidenceId: string;
  walletAddress: string;
  verdict: string;
  signature: string;
  votedAt: string;
}

export interface DisclosureToken {
  id: string;
  token: string;
  evidenceId: string;
  recipientEmail?: string;
  expiresAt: string;
  createdAt: string;
}

export interface AuditReport {
  id: string;
  evidenceId: string;
  generatedAt: string;
  format: string;
  jurisdiction: string;
  content: {
    evidenceHash: string;
    blockchainTx: string;
    storageCid: string;
    custodyTimeline: Array<{
      event: string;
      actor: string;
      timestamp: string;
    }>;
    validatorSignatures: Array<{
      validator: string;
      verdict: string;
      signature: string;
    }>;
  };
}

export interface CustodyEvent {
  id: string;
  evidenceId: string;
  eventType: string;
  actorAddress?: string;
  blockchainTxHash?: string;
  timestamp: string;
}

// Authentication

/**
 * Request authentication challenge for wallet
 */
export async function requestAuthChallenge(
  walletAddress: string
): Promise<ApiResponse<AuthChallenge>> {
  return post<AuthChallenge>(`${BASE_URL}${ENDPOINTS.AUTH_CHALLENGE}`, {
    walletAddress,
  });
}

/**
 * Verify signed challenge and get JWT token
 */
export async function verifyAuth(
  walletAddress: string,
  signature: string,
  challenge: string
): Promise<ApiResponse<AuthToken>> {
  return post<AuthToken>(`${BASE_URL}${ENDPOINTS.AUTH_VERIFY}`, {
    walletAddress,
    signature,
    challenge,
  });
}

// Evidence Submission

/**
 * Submit evidence for processing and storage
 */
export async function submitEvidence(params: {
  content: string; // Base64 encoded file content
  fileName: string;
  recipientPublicKeys: string[];
  validatorAddresses: string[];
}): Promise<ApiResponse<EvidenceSubmission>> {
  return post<EvidenceSubmission>(`${BASE_URL}${ENDPOINTS.SUBMIT}`, params);
}

// Validator Operations

/**
 * Get evidence details for validation (requires auth)
 */
export async function getValidatorEvidence(
  evidenceId: string,
  token: string
): Promise<ApiResponse<ValidatorEvidence>> {
  return get<ValidatorEvidence>(
    `${BASE_URL}${ENDPOINTS.VALIDATOR_EVIDENCE}/${evidenceId}`,
    withAuth(token)
  );
}

/**
 * Submit validator vote (requires auth)
 */
export async function submitValidatorVote(
  params: {
    evidenceId: string;
    verdict: 'VALID' | 'INVALID';
    signature: string;
  },
  token: string
): Promise<ApiResponse<ValidatorVote>> {
  return post<ValidatorVote>(
    `${BASE_URL}${ENDPOINTS.VALIDATOR_VOTE}`,
    params,
    withAuth(token)
  );
}

/**
 * Download evidence for validation (requires auth)
 */
export async function downloadEvidence(
  evidenceId: string,
  token: string
): Promise<ApiResponse<{
  ipfsCid: string;
  arweaveTx?: string;
  wrappedKey: string;
}>> {
  return get(
    `${BASE_URL}${ENDPOINTS.VALIDATOR_DOWNLOAD}/${evidenceId}`,
    withAuth(token)
  );
}

// Selective Disclosure

/**
 * Create disclosure token for sharing evidence
 */
export async function createDisclosureToken(
  params: {
    evidenceId: string;
    recipientEmail?: string;
    expiresIn?: number; // seconds
    partialAccess?: {
      fields: string[];
    };
  },
  token: string
): Promise<ApiResponse<DisclosureToken>> {
  return post<DisclosureToken>(
    `${BASE_URL}${ENDPOINTS.DISCLOSURE_CREATE}`,
    params,
    withAuth(token)
  );
}

/**
 * Access disclosed evidence using token
 */
export async function accessDisclosedEvidence(
  disclosureToken: string
): Promise<ApiResponse<{
  evidenceId: string;
  content: string;
  metadata: Record<string, unknown>;
  accessedAt: string;
}>> {
  return get(`${BASE_URL}${ENDPOINTS.DISCLOSURE_ACCESS}/${disclosureToken}`);
}

// Audit Reports

/**
 * Generate audit report for evidence
 */
export async function generateAuditReport(
  params: {
    evidenceId: string;
    jurisdiction: string;
    format: 'pdf' | 'json';
    includeTimeline?: boolean;
    includeSignatures?: boolean;
  },
  token: string
): Promise<ApiResponse<AuditReport>> {
  return post<AuditReport>(
    `${BASE_URL}${ENDPOINTS.AUDIT_REPORT}`,
    params,
    withAuth(token)
  );
}

/**
 * Get custody timeline for evidence
 */
export async function getCustodyTimeline(
  evidenceId: string,
  token?: string
): Promise<ApiResponse<{ events: CustodyEvent[] }>> {
  const headers = token ? withAuth(token) : undefined;
  return get(`${BASE_URL}${ENDPOINTS.AUDIT_CUSTODY}/${evidenceId}`, headers);
}

// Workflow

/**
 * Get workflow status for evidence
 */
export async function getWorkflowStatus(
  evidenceId: string,
  token: string
): Promise<ApiResponse<{
  evidenceId: string;
  currentStatus: string;
  assignedValidators: string[];
  votes: Array<{
    validator: string;
    verdict: string;
    votedAt: string;
  }>;
  requiredVotes: number;
  completedVotes: number;
}>> {
  return get(
    `${BASE_URL}${ENDPOINTS.WORKFLOW_STATUS}/${evidenceId}`,
    withAuth(token)
  );
}

// Health Check

/**
 * Check backend service health
 */
export async function checkHealth(): Promise<ApiResponse<{ status: string; message: string }>> {
  return get(`${BASE_URL}${ENDPOINTS.HEALTH}`);
}
