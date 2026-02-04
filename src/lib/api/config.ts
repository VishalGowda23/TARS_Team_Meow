// TARS API Configuration
// Connects Frontend (Person A) to Backend Services (Person B, C, D)

export const API_CONFIG = {
  // Person B - Privacy Engine (Metadata stripping, hashing, anonymous submission)
  PRIVACY_ENGINE: {
    BASE_URL: process.env.NEXT_PUBLIC_PRIVACY_ENGINE_URL || 'http://localhost:3001',
    ENDPOINTS: {
      SUBMIT: '/api/submit',
      VERIFY: '/api/verify',
      STATUS: '/api/status',
      HEALTH: '/',
    },
  },

  // Person C - Blockchain Service (Evidence registration, voting, custody)
  BLOCKCHAIN: {
    BASE_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_URL || 'http://localhost:3002',
    ENDPOINTS: {
      REGISTER: '/api/evidence/register',
      STATUS: '/api/evidence/status',
      VOTE: '/api/evidence/vote',
      CUSTODY: '/api/evidence/custody',
      SUBMIT: '/api/evidence/submit',
      HEALTH: '/api/health',
    },
  },

  // Person D - Backend Service (Storage, validators, disclosure, audit)
  BACKEND: {
    BASE_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
    ENDPOINTS: {
      // Authentication
      AUTH_CHALLENGE: '/auth/challenge',
      AUTH_VERIFY: '/auth/verify',
      
      // Evidence submission
      SUBMIT: '/evidence/submit',
      
      // Validator operations
      VALIDATOR_EVIDENCE: '/validator/evidence',
      VALIDATOR_VOTE: '/validator/vote',
      VALIDATOR_DOWNLOAD: '/validator/download',
      
      // Disclosure
      DISCLOSURE_CREATE: '/disclosure/create',
      DISCLOSURE_ACCESS: '/disclosure/access',
      
      // Audit
      AUDIT_REPORT: '/audit/report',
      AUDIT_CUSTODY: '/audit/custody',
      
      // Workflow
      WORKFLOW_STATUS: '/workflow/status',
      
      // Health
      HEALTH: '/ping',
    },
  },
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
};
