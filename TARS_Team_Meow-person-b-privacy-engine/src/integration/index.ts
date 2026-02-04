import { EvidenceHash } from '../types';

export interface BlockchainRegistrationRequest {
  evidenceHash: string;
  timestamp: Date;
  stageId: string;
  hashAlgorithm: 'sha256';
}

export interface BlockchainRegistrationResponse {
  transactionHash: string;
  blockNumber: number;
  contractAddress: string;
  registeredAt: Date;
}

export type RegisterEvidenceOnChain = (request: BlockchainRegistrationRequest) => Promise<BlockchainRegistrationResponse>;

export interface StorageRequest {
  stageId: string;
  evidenceHash: string;
  encryptionRequired: boolean;
}

export interface StorageResponse {
  cid: string;
  arweaveId?: string;
  storageProvider: 'ipfs' | 'arweave' | 'both';
  storedAt: Date;
  sizeBytes: number;
}

export type StoreEvidence = (request: StorageRequest, evidenceBuffer: Buffer) => Promise<StorageResponse>;

export interface ForwardingPayload {
  submissionId: string;
  evidenceHash: EvidenceHash;
  stageId: string;
  mimeType: string;
  sanitizedSize: number;
  submittedAt: Date;
  strippedFields: string[];
}

export interface WebhookConfig {
  blockchainUrl?: string;
  storageUrl?: string;
  authToken?: string;
}

export async function forwardEvidence(payload: ForwardingPayload, config: WebhookConfig): Promise<{ blockchain?: BlockchainRegistrationResponse; storage?: StorageResponse }> {
  const results: { blockchain?: BlockchainRegistrationResponse; storage?: StorageResponse } = {};

  if (config.blockchainUrl) {
    const blockchainRequest: BlockchainRegistrationRequest = {
      evidenceHash: payload.evidenceHash.sha256,
      timestamp: payload.submittedAt,
      stageId: payload.stageId,
      hashAlgorithm: 'sha256'
    };

    try {
      const response = await fetch(config.blockchainUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': config.authToken ? `Bearer ${config.authToken}` : ''
        },
        body: JSON.stringify(blockchainRequest)
      });

      if (response.ok) {
        results.blockchain = await response.json() as BlockchainRegistrationResponse;
      }
    } catch (error) {
      console.error('Blockchain forwarding failed:', error);
    }
  }

  if (config.storageUrl) {
    const storageRequest: StorageRequest = {
      stageId: payload.stageId,
      evidenceHash: payload.evidenceHash.sha256,
      encryptionRequired: true
    };

    try {
      const response = await fetch(config.storageUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Auth': config.authToken || ''
        },
        body: JSON.stringify(storageRequest)
      });

      if (response.ok) {
        const data = await response.json() as any;
        results.storage = {
          cid: data.cid,
          arweaveId: data.arweaveId || undefined,
          storageProvider: data.storageProvider.toLowerCase().includes('ipfs') && data.storageProvider.toLowerCase().includes('arweave') ? 'both' : data.storageProvider.toLowerCase().includes('ipfs') ? 'ipfs' : 'arweave',
          storedAt: new Date(data.storedAt),
          sizeBytes: data.sizeBytes
        };
      }
    } catch (error) {
      console.error('Storage forwarding failed:', error);
    }
  }

  return results;
}

export type EvidenceStatus = 'submitted' | 'sanitized' | 'staged' | 'registered' | 'stored' | 'pending' | 'verified' | 'disclosed';

export interface EvidenceRecord {
  submissionId: string;
  evidenceHash: string;
  status: EvidenceStatus;
  timestamps: { submitted?: Date; sanitized?: Date; staged?: Date; registered?: Date; stored?: Date; verified?: Date; disclosed?: Date; };
  references: { stageId?: string; transactionHash?: string; cid?: string; arweaveId?: string; };
}
