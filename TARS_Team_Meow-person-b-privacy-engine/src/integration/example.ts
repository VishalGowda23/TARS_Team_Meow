import { forwardEvidence, ForwardingPayload, WebhookConfig } from '../integration';
import { EvidenceHash } from '../types';

export async function handleSubmissionComplete(
  submissionId: string,
  evidenceHash: EvidenceHash,
  stageId: string,
  mimeType: string,
  sanitizedSize: number,
  submittedAt: Date,
  strippedFields: string[]
) {
  const payload: ForwardingPayload = {
    submissionId,
    evidenceHash,
    stageId,
    mimeType,
    sanitizedSize,
    submittedAt,
    strippedFields
  };

  const config: WebhookConfig = {
    storageUrl: process.env.PERSON_D_STORAGE_URL,
    blockchainUrl: process.env.PERSON_C_BLOCKCHAIN_URL,
    authToken: process.env.SERVICE_AUTH_KEY
  };

  const results = await forwardEvidence(payload, config);

  return {
    submissionId,
    storage: results.storage,
    blockchain: results.blockchain
  };
}
