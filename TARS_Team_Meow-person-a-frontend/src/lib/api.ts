// API Service for TARS Backend Integration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Types
export interface EvidenceSubmission {
    id: string;
    title: string;
    category: string;
    brief: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    status: 'orbiting' | 'verified' | 'transmitted';
    submittedAt: string;
    submittedBy: string;
    ipfsCid?: string;
    txHash?: string;
    contentHash?: string;
    validatorSignatures?: number;
    requiredSignatures: number;
}

export interface SubmitEvidenceResponse {
    success: boolean;
    data: {
        submissionId: string;
        pseudonymousId: string;
        ipfsCid: string;
        contentHash: string;
        txHash: string;
        proofOfExistence: {
            hash: string;
            timestamp: number;
            blockNumber: number;
        };
        encryptionKeyId: string;
    };
    submissions?: Array<{
        originalFilename: string;
        sanitizedFilename: string;
        strippedFields?: string[];
    }>;
}

export interface ValidationResponse {
    success: boolean;
    data: {
        submissionId: string;
        isValid: boolean;
        validatorPseudonymId: string;
        totalValidations: number;
        txHash: string;
    };
}

export interface VerifyProofResponse {
    success: boolean;
    data: {
        isValid: boolean;
        contentHash: string;
        storedHash: string;
        timestamp: number;
        submitter: string;
    };
}

export interface ReputationResponse {
    success: boolean;
    data: {
        pseudonymousId: string;
        reputationScore: number;
        totalSubmissions: number;
        validSubmissions: number;
        totalValidations: number;
        accurateValidations: number;
    };
}

// API Error class
export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

// Helper to get current user email
function getCurrentUserEmail(): string {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('tars-user-email') || '';
    }
    return '';
}

// Fetch wrapper with error handling
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const userEmail = getCurrentUserEmail();
    
    try {
        // Build headers - don't set Content-Type for FormData (browser will set it with boundary)
        const headers: Record<string, string> = {
            'X-User-Email': userEmail,
        };
        
        // Add Content-Type for JSON body (but not for FormData)
        const isFormData = options?.body instanceof FormData;
        if (!isFormData && options?.body) {
            headers['Content-Type'] = 'application/json';
        }
        
        // Only add existing headers that aren't in our base headers
        if (options?.headers) {
            const existingHeaders = options.headers as Record<string, string>;
            Object.keys(existingHeaders).forEach(key => {
                headers[key] = existingHeaders[key];
            });
        }
        
        const response = await fetch(url, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new ApiError(response.status, data.error || 'An error occurred');
        }

        return data;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError(500, error instanceof Error ? error.message : 'Network error');
    }
}

// Evidence API
export const evidenceApi = {
    /**
     * Submit new evidence to the TARS platform
     * Files are uploaded to IPFS, metadata is stripped, and proof is recorded on blockchain
     */
    async submit(
        file: File,
        category: string,
        title: string,
        brief: string,
        secret: string
    ): Promise<SubmitEvidenceResponse> {
        const formData = new FormData();
        formData.append('files', file);
        formData.append('category', category);
        formData.append('title', title);
        formData.append('brief', brief);
        formData.append('secret', secret);

        return fetchApi<SubmitEvidenceResponse>('/evidence/submit', {
            method: 'POST',
            body: formData,
        });
    },

    /**
     * Get evidence details by submission ID
     */
    async getById(submissionId: string): Promise<{ success: boolean; data: EvidenceSubmission }> {
        return fetchApi(`/evidence/${submissionId}`);
    },

    /**
     * Verify proof of existence for a file
     */
    async verifyProof(submissionId: string, fileHash: string): Promise<VerifyProofResponse> {
        return fetchApi('/evidence/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissionId, fileHash }),
        });
    },

    /**
     * Download decrypted evidence
     */
    async download(submissionId: string, secret: string): Promise<Blob> {
        const response = await fetch(`${API_BASE_URL}/evidence/${submissionId}/download?secret=${encodeURIComponent(secret)}`);
        if (!response.ok) {
            const error = await response.json();
            throw new ApiError(response.status, error.error || 'Download failed');
        }
        return response.blob();
    },
};

// Validation API
export const validationApi = {
    /**
     * Get pending evidence for validation
     */
    async getPendingQueue(): Promise<{ success: boolean; data: EvidenceSubmission[] }> {
        return fetchApi('/validation/queue');
    },

    /**
     * Validate an evidence submission
     */
    async validate(
        submissionId: string,
        isValid: boolean,
        validatorSecret: string,
        notes?: string
    ): Promise<ValidationResponse> {
        return fetchApi('/validation/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                submissionId,
                isValid,
                validatorSecret,
                notes,
            }),
        });
    },

    /**
     * Get validation history for a submission
     */
    async getHistory(submissionId: string): Promise<{ success: boolean; data: unknown[] }> {
        return fetchApi(`/validation/history/${submissionId}`);
    },

    /**
     * Authorize a party to view evidence (selective disclosure)
     */
    async authorizeViewer(
        submissionId: string,
        authorizedAddress: string,
        ownerSecret: string
    ): Promise<{ success: boolean; transactionHash: string; message: string }> {
        return fetchApi('/validation/authorize-viewer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                submissionId,
                authorizedAddress,
                ownerSecret,
            }),
        });
    },

    /**
     * Release validated evidence to public
     */
    async releaseEvidence(
        submissionId: string,
        ownerSecret: string
    ): Promise<{ success: boolean; transactionHash: string; message: string }> {
        return fetchApi('/validation/release', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                submissionId,
                ownerSecret,
            }),
        });
    },
};

// IPFS API
export const ipfsApi = {
    /**
     * Get IPFS content by CID
     */
    async getContent(cid: string): Promise<Blob> {
        const response = await fetch(`${API_BASE_URL}/ipfs/${cid}`);
        if (!response.ok) {
            throw new ApiError(response.status, 'Failed to fetch IPFS content');
        }
        return response.blob();
    },

    /**
     * Check if CID exists on IPFS
     */
    async verify(cid: string): Promise<{ success: boolean; exists: boolean }> {
        return fetchApi(`/ipfs/verify/${cid}`);
    },
};

// Reputation API
export const reputationApi = {
    /**
     * Get reputation for a pseudonymous ID
     */
    async getReputation(pseudonymousId: string): Promise<ReputationResponse> {
        return fetchApi(`/reputation/${pseudonymousId}`);
    },

    /**
     * Lookup reputation by secret phrase
     */
    async lookup(secret: string): Promise<{ 
        success: boolean; 
        pseudonymousId: string; 
        reputation: {
            totalSubmissions: number;
            validatedSubmissions: number;
            trustScore: number;
            validationRate: string;
            credibilityLevel: { level: string; badge: string };
        };
    }> {
        return fetchApi('/reputation/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret }),
        });
    },

    /**
     * Get leaderboard of top contributors
     */
    async getLeaderboard(): Promise<{ success: boolean; data: unknown[] }> {
        return fetchApi('/reputation/leaderboard');
    },
};

// Audit API
export const auditApi = {
    /**
     * Get access logs for a submission
     */
    async getAccessLogs(submissionId: string): Promise<{ success: boolean; data: unknown[] }> {
        return fetchApi(`/audit/access/${submissionId}`);
    },

    /**
     * Get full audit trail
     */
    async getAuditTrail(submissionId: string): Promise<{ success: boolean; data: unknown[] }> {
        return fetchApi(`/audit/trail/${submissionId}`);
    },

    /**
     * Get comprehensive audit report
     */
    async getAuditReport(submissionId: string): Promise<{ success: boolean; auditReport: AuditReport }> {
        return fetchApi(`/audit/${submissionId}`);
    },

    /**
     * Get chain of custody details
     */
    async getChainOfCustody(submissionId: string): Promise<{ success: boolean; chainOfCustody: ChainOfCustody }> {
        return fetchApi(`/audit/${submissionId}/chain-of-custody`);
    },

    /**
     * Get legal report for courts/regulators
     */
    async getLegalReport(submissionId: string, jurisdiction?: string): Promise<{ success: boolean; legalReport: LegalReport }> {
        const query = jurisdiction ? `?jurisdiction=${jurisdiction}` : '';
        return fetchApi(`/audit/${submissionId}/legal-report${query}`);
    },

    /**
     * Get download URL for audit report
     */
    getDownloadUrl(submissionId: string, format: 'json' | 'text' = 'text'): string {
        return `${API_BASE_URL}/audit/${submissionId}/export${format === 'json' ? '?format=json' : ''}`;
    },

    /**
     * Store audit report permanently on IPFS
     */
    async storeOnIPFS(submissionId: string): Promise<{ success: boolean; ipfsHash: string; ipfsUrl: string }> {
        return fetchApi(`/audit/${submissionId}/store`, { method: 'POST' });
    },

    /**
     * Get comprehensive legal export package (court-admissible)
     */
    async getLegalExport(submissionId: string, options?: { caseNumber?: string; jurisdiction?: string }): Promise<LegalExportResponse> {
        const params = new URLSearchParams();
        if (options?.caseNumber) params.append('caseNumber', options.caseNumber);
        if (options?.jurisdiction) params.append('jurisdiction', options.jurisdiction);
        const query = params.toString() ? `?${params.toString()}` : '';
        return fetchApi(`/audit/${submissionId}/legal-export${query}`);
    },

    /**
     * Download legal export as PDF file
     */
    getLegalExportDownloadUrl(submissionId: string, options?: { caseNumber?: string; jurisdiction?: string }): string {
        const params = new URLSearchParams({ format: 'pdf' });
        if (options?.caseNumber) params.append('caseNumber', options.caseNumber);
        if (options?.jurisdiction) params.append('jurisdiction', options.jurisdiction);
        return `${API_BASE_URL}/audit/${submissionId}/legal-export?${params.toString()}`;
    },
};

// Legal Export Response type
export interface LegalExportResponse {
    success: boolean;
    packageId: string;
    generatedAt: string;
    documentIntegrity: string;
    legalPackage: {
        packageInfo: {
            id: string;
            version: string;
            generatedAt: string;
            jurisdiction: string;
            caseNumber: string | null;
            documentIntegrity: string;
        };
        coverPage: {
            title: string;
            subtitle: string;
            packageId: string;
            evidenceId: string;
            classification: string;
        };
        tableOfContents: Array<{ section: number; title: string; page: number }>;
        sections: Record<string, unknown>;
    };
}

// Types for audit API
export interface AuditReport {
    submission: {
        id: string;
        contentHash: string;
        ipfsHash: string;
        timestamp: string;
        blockNumber: number;
        status: string;
        category: string;
        pseudonymousId: string;
    };
    validations: Array<{
        validator: string;
        timestamp: string;
        approved: boolean;
        comment: string;
    }>;
    accesses: Array<{
        accessor: string;
        timestamp: string;
        action: string;
    }>;
    reputation: {
        totalSubmissions: number;
        validatedSubmissions: number;
        trustScore: number;
    };
    generatedAt: string;
}

export interface ChainOfCustody {
    created: {
        timestamp: string;
        blockNumber: number;
    };
    accessHistory: Array<{
        accessor: string;
        timestamp: string;
        action: string;
    }>;
    totalAccesses: number;
    integrity: string;
}

export interface LegalReport {
    reportType: string;
    jurisdiction: string;
    generatedAt: string;
    evidenceSummary: {
        submissionId: string;
        contentHash: string;
        storageLocation: string;
        category: string;
        status: string;
    };
    proofOfExistence: {
        blockchainNetwork: string;
        chainId: number;
        blockNumber: number;
        timestamp: string;
        verificationMethod: string;
        tamperEvidence: string;
    };
    chainOfCustody: {
        totalEvents: number;
        events: Array<{
            eventNumber: number;
            action: string;
            timestamp: string;
            actor: string;
            verification: string;
        }>;
    };
    validationHistory: {
        totalValidations: number;
        validations: Array<{
            validator: string;
            decision: string;
            timestamp: string;
            comment: string;
        }>;
        consensusReached: boolean;
    };
    whistleblowerReputation: {
        pseudonymousId: string;
        trustScore: number;
        historicalSubmissions: number;
        validatedSubmissions: number;
    };
    technicalDetails: {
        hashAlgorithm: string;
        storageProtocol: string;
        blockchainProtocol: string;
        smartContractStandard: string;
        metadataStripping: string;
    };
    legalDisclaimer: string;
    verificationInstructions: {
        step1: string;
        step2: string;
        step3: string;
        step4: string;
        step5: string;
    };
}

// Helper to generate a user secret (for demo purposes)
export function generateUserSecret(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Store/retrieve user secret from localStorage
export const userSecretStorage = {
    KEY: 'tars-user-secret',
    
    get(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(this.KEY);
    },
    
    set(secret: string): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(this.KEY, secret);
    },
    
    getOrCreate(): string {
        let secret = this.get();
        if (!secret) {
            secret = generateUserSecret();
            this.set(secret);
        }
        return secret;
    },
};

// Comment types
export interface Comment {
    id: string;
    evidenceId: string;
    author: string;
    authorEmail: string | null;
    pseudonymousId: string | null;
    content: string;
    timestamp: string;
    edited: boolean;
    editedAt?: string;
}

export interface CommentsResponse {
    success: boolean;
    evidenceId: string;
    count: number;
    comments: Comment[];
}

export interface AddCommentResponse {
    success: boolean;
    comment: Comment;
}

// Comments API
export const commentsApi = {
    // Get all comments for an evidence submission
    async getComments(evidenceId: string): Promise<CommentsResponse> {
        return fetchApi<CommentsResponse>(`/comments/${evidenceId}`);
    },

    // Add a comment to an evidence submission
    async addComment(evidenceId: string, content: string): Promise<AddCommentResponse> {
        const author = localStorage.getItem('tars-user-email')?.split('@')[0] || 'Anonymous';
        const authorEmail = localStorage.getItem('tars-user-email') || null;
        const pseudonymousId = localStorage.getItem('tars-pseudonymous-id') || null;

        return fetchApi<AddCommentResponse>(`/comments/${evidenceId}`, {
            method: 'POST',
            body: JSON.stringify({
                content,
                author,
                authorEmail,
                pseudonymousId
            })
        });
    },

    // Delete a comment (only by author)
    async deleteComment(evidenceId: string, commentId: string): Promise<{ success: boolean }> {
        const authorEmail = localStorage.getItem('tars-user-email');
        return fetchApi<{ success: boolean }>(`/comments/${evidenceId}/${commentId}`, {
            method: 'DELETE',
            body: JSON.stringify({ authorEmail })
        });
    },

    // Edit a comment (only by author)
    async editComment(evidenceId: string, commentId: string, content: string): Promise<AddCommentResponse> {
        const authorEmail = localStorage.getItem('tars-user-email');
        return fetchApi<AddCommentResponse>(`/comments/${evidenceId}/${commentId}`, {
            method: 'PUT',
            body: JSON.stringify({ content, authorEmail })
        });
    },

    // Get recent comments across all evidence
    async getRecentComments(limit: number = 10): Promise<{ success: boolean; comments: Comment[] }> {
        return fetchApi<{ success: boolean; comments: Comment[] }>(`/comments?limit=${limit}`);
    }
};

// Redaction API
export interface DetectedPII {
    emails: string[];
    phoneNumbers: string[];
    names: string[];
    addresses: string[];
    dates: string[];
    idNumbers: string[];
}

export interface RedactionPreview {
    totalOccurrences: number;
    byWord: Record<string, number>;
    contextSamples: Array<{
        word: string;
        context: string;
        willBecome: string;
    }>;
}

export const redactionApi = {
    // Extract text from PDF
    async extractText(file: File): Promise<{ success: boolean; text: string; numPages: number; fileName: string }> {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE_URL}/redaction/extract-text`, {
            method: 'POST',
            body: formData
        });
        
        return response.json();
    },

    // Auto-detect PII in PDF
    async detectPII(file: File): Promise<{
        success: boolean;
        detectedPII: DetectedPII;
        totalPIIFound: number;
        recommendation: string;
        textPreview: string;
        fileName: string;
    }> {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE_URL}/redaction/detect-pii`, {
            method: 'POST',
            body: formData
        });
        
        return response.json();
    },

    // Preview redactions
    async previewRedactions(file: File, wordsToRedact: string[]): Promise<{
        success: boolean;
        preview: RedactionPreview;
        numPages: number;
        fileName: string;
    }> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('words', JSON.stringify(wordsToRedact));
        
        const response = await fetch(`${API_BASE_URL}/redaction/preview`, {
            method: 'POST',
            body: formData
        });
        
        return response.json();
    },

    // Apply redactions and get base64 result
    async applyRedactions(file: File, wordsToRedact: string[]): Promise<{
        success: boolean;
        redactedFile: string; // base64
        redactionsApplied: number;
        redactedWords?: string[];
        message: string;
        originalName: string;
        mimeType: string;
    }> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('words', JSON.stringify(wordsToRedact));
        
        const response = await fetch(`${API_BASE_URL}/redaction/apply-and-upload`, {
            method: 'POST',
            body: formData
        });
        
        return response.json();
    },

    // Download redacted PDF directly
    getRedactedPDFUrl(file: File, wordsToRedact: string[]): string {
        // This returns the endpoint - actual download needs form submission
        return `${API_BASE_URL}/redaction/apply`;
    }
};
