// TARS API - Unified Export
// Re-exports all API modules for easy importing

export * from './config';
export * from './client';

// Privacy Engine (Person B)
export * as privacy from './privacy';

// Blockchain (Person C)
export * as blockchain from './blockchain';

// Backend (Person D)
export * as backend from './backend';

// Convenience type exports
export type {
  SubmissionReceipt,
  SubmissionResponse,
  VerifyResponse,
} from './privacy';

export type {
  EvidenceRegistration,
  EvidenceStatus,
  VoteResult,
  CustodyTimeline,
} from './blockchain';

export type {
  AuthChallenge,
  AuthToken,
  ValidatorEvidence,
  ValidatorVote,
  DisclosureToken,
  AuditReport,
} from './backend';
