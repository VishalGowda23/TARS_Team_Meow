// TARS Blockchain API (Person C)
// Handles evidence registration, voting, and custody tracking

import { API_CONFIG } from './config';
import { post, get, ApiResponse } from './client';

const BASE_URL = API_CONFIG.BLOCKCHAIN.BASE_URL;
const ENDPOINTS = API_CONFIG.BLOCKCHAIN.ENDPOINTS;

// Types
export interface EvidenceRegistration {
  evidenceId: string;
  transactionHash: string;
  blockNumber: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  registeredAt: string;
}

export interface EvidenceStatus {
  evidenceId: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  transactionHash: string;
  blockNumber: number;
  registeredAt: string;
  votes: {
    approvals: number;
    rejections: number;
    voters: string[];
  };
  ipfsCid: string;
}

export interface VoteResult {
  success: boolean;
  evidenceId: string;
  newStatus: string;
  votes: {
    approvals: number;
    rejections: number;
  };
  transactionHash?: string;
}

export interface CustodyEvent {
  evidenceId: string;
  action: string;
  actor: string;
  timestamp: string;
  transactionHash: string;
  blockNumber: number;
}

export interface CustodyTimeline {
  evidenceId: string;
  events: CustodyEvent[];
}

// API Functions

/**
 * Register evidence hash on blockchain
 * Called after evidence is stored on IPFS/Arweave
 */
export async function registerEvidence(params: {
  evidenceHash: string;
  ipfsCid: string;
  arweaveId?: string;
  stageId?: string;
  encryptionApplied?: boolean;
}): Promise<ApiResponse<EvidenceRegistration>> {
  return post<EvidenceRegistration>(`${BASE_URL}${ENDPOINTS.REGISTER}`, {
    ...params,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get evidence status from blockchain
 */
export async function getEvidenceStatus(
  evidenceId: string
): Promise<ApiResponse<EvidenceStatus>> {
  return get<EvidenceStatus>(`${BASE_URL}${ENDPOINTS.STATUS}/${evidenceId}`);
}

/**
 * Submit validator vote for evidence
 */
export async function submitVote(params: {
  evidenceId: string;
  validatorAddress: string;
  approve: boolean;
  reason?: string;
  signature?: string;
}): Promise<ApiResponse<VoteResult>> {
  return post<VoteResult>(`${BASE_URL}${ENDPOINTS.VOTE}/${params.evidenceId}`, {
    validatorAddress: params.validatorAddress,
    approve: params.approve,
    reason: params.reason,
    signature: params.signature,
  });
}

/**
 * Get custody timeline for evidence
 */
export async function getCustodyTimeline(
  evidenceId: string
): Promise<ApiResponse<CustodyTimeline>> {
  return get<CustodyTimeline>(`${BASE_URL}${ENDPOINTS.CUSTODY}/${evidenceId}`);
}

/**
 * Submit evidence directly to blockchain backend
 * (Alternative path that handles full flow)
 */
export async function submitEvidenceToBlockchain(params: {
  file: File;
  submitterRole?: string;
  category?: string;
  description?: string;
  urgent?: boolean;
}): Promise<ApiResponse<{
  evidenceId: string;
  hashes: {
    original: string;
    sanitized: string;
    encrypted: string;
  };
  storage: {
    ipfsCid: string;
    arweaveId?: string;
  };
  blockchain: {
    transactionHash: string;
    blockNumber: number;
  };
  receipt: {
    submittedAt: string;
    expiresAt: string;
  };
}>> {
  const formData = new FormData();
  formData.append('evidenceFile', params.file);
  
  if (params.submitterRole) {
    formData.append('submitterRole', params.submitterRole);
  }
  if (params.category) {
    formData.append('category', params.category);
  }
  if (params.description) {
    formData.append('description', params.description);
  }
  if (params.urgent !== undefined) {
    formData.append('urgent', String(params.urgent));
  }

  const response = await fetch(`${BASE_URL}${ENDPOINTS.SUBMIT}`, {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

/**
 * Check blockchain service health
 */
export async function checkHealth(): Promise<ApiResponse<{ status: string; blockchain: string }>> {
  return get(`${BASE_URL}${ENDPOINTS.HEALTH}`);
}
