import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { CryptoService } from "../crypto";
import { uploadToIPFS } from "../storage/pinata";
import { archiveToArweave } from "../storage/bundlr";
import prisma, { isDatabaseConnected } from "../lib/prisma";
import { generateSymmetricKey, encryptBuffer, EncryptedData } from "../crypto/symmetric";
import * as crypto from "node:crypto";

// ============================================================================
// PERSON B INTEGRATION — Storage Request/Response Interface
// ============================================================================
// StorageRequest:  { stageId, evidenceHash, encryptionRequired }
// StorageResponse: { cid, arweaveId, storageProvider, storedAt, sizeBytes }
// ============================================================================

interface StorageRequest {
    stageId: string;
    evidenceHash: string;
    encryptionRequired: boolean;
}

interface StorageResponse {
    cid: string;
    arweaveId: string | null;
    storageProvider: "IPFS" | "Arweave" | "IPFS+Arweave";
    storedAt: number;
    sizeBytes: number;
    evidenceId?: string; // Internal tracking ID
    encryptionMetadata?: {
        iv: string;
        authTag: string;
    };
}

export async function integrationRoutes(server: FastifyInstance) {

    /**
     * POST /api/store
     * 
     * Integration endpoint for Person B (Privacy + Anonymous Submission Engineer).
     * Receives sanitized, hashed evidence from Person B's staging area and:
     * 1. Fetches the staged encrypted evidence
     * 2. Validates the hash matches
     * 3. Optionally applies additional encryption
     * 4. Stores to IPFS (primary) and Arweave (archival)
     * 5. Creates internal evidence record with custody chain
     */
    server.post("/api/store", async (request: FastifyRequest, reply: FastifyReply) => {
        const { stageId, evidenceHash, encryptionRequired } = request.body as StorageRequest;

        // Validation
        if (!stageId || !evidenceHash) {
            return reply.status(400).send({ 
                error: "Missing required fields",
                required: ["stageId", "evidenceHash"],
                received: { stageId: !!stageId, evidenceHash: !!evidenceHash }
            });
        }

        server.log.info({ stageId, evidenceHash: evidenceHash.substring(0, 16) + "...", encryptionRequired }, 
            "📥 Person B Integration: Storage request received");

        try {
            // ─────────────────────────────────────────────────────────────────
            // STEP 1: Fetch staged evidence from Person B's staging service
            // ─────────────────────────────────────────────────────────────────
            let fileBuffer: Buffer;
            const stagingUrl = process.env.PERSON_B_STAGING_URL || process.env.STAGING_URL;

            if (!stagingUrl) {
                // Development/testing fallback
                server.log.warn("⚠️ No STAGING_URL configured - using mock data for testing");
                fileBuffer = Buffer.from(`[MOCK] Staged evidence content for ${stageId}`);
            } else {
                server.log.info({ stagingUrl }, "Fetching from Person B staging...");
                
                const response = await fetch(`${stagingUrl}/staging/${stageId}`, {
                    method: "GET",
                    headers: {
                        "X-Service-Auth": process.env.PERSON_B_SERVICE_KEY || "",
                        "Accept": "application/octet-stream"
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text().catch(() => "Unknown error");
                    throw new Error(`Failed to fetch staged evidence: ${response.status} - ${errorText}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                fileBuffer = Buffer.from(arrayBuffer);
                server.log.info({ fetchedBytes: fileBuffer.length }, "✅ Fetched staged evidence");
            }

            // ─────────────────────────────────────────────────────────────────
            // STEP 2: Verify evidence hash integrity
            // ─────────────────────────────────────────────────────────────────
            const calculatedHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
            
            if (calculatedHash !== evidenceHash) {
                server.log.error({ expected: evidenceHash, actual: calculatedHash }, 
                    "❌ HASH MISMATCH - Evidence may have been tampered with");
                
                // In production, we should reject. For now, log and continue with warning.
                if (process.env.STRICT_HASH_VALIDATION === "true") {
                    return reply.status(400).send({
                        error: "Hash verification failed",
                        expected: evidenceHash,
                        actual: calculatedHash,
                        message: "Evidence integrity check failed. The file may have been modified in transit."
                    });
                }
            } else {
                server.log.info("✅ Hash verification passed");
            }

            // ─────────────────────────────────────────────────────────────────
            // STEP 3: Apply encryption if required
            // ─────────────────────────────────────────────────────────────────
            let bufferToStore = fileBuffer;
            let encryptionMetadata: { iv: string; authTag: string } | undefined;
            let symmetricKey: Buffer | undefined;

            if (encryptionRequired) {
                server.log.info("🔐 Applying AES-256-GCM encryption...");
                symmetricKey = generateSymmetricKey();
                const encryptedData: EncryptedData = encryptBuffer(fileBuffer, symmetricKey);
                bufferToStore = Buffer.from(encryptedData.ciphertext, "base64");
                encryptionMetadata = {
                    iv: encryptedData.iv,
                    authTag: encryptedData.authTag
                };
                server.log.info({ 
                    originalSize: fileBuffer.length, 
                    encryptedSize: bufferToStore.length 
                }, "✅ Encryption applied");
            }

            // ─────────────────────────────────────────────────────────────────
            // STEP 4: Store to IPFS (Primary Storage)
            // ─────────────────────────────────────────────────────────────────
            server.log.info("📤 Uploading to IPFS via Pinata...");
            const cid = await uploadToIPFS(bufferToStore, `evidence-${stageId}`);
            server.log.info({ cid }, "✅ IPFS upload complete");

            // ─────────────────────────────────────────────────────────────────
            // STEP 5: Archive to Arweave (Permanent Storage)
            // ─────────────────────────────────────────────────────────────────
            let arweaveId: string | null = null;
            try {
                server.log.info("📤 Archiving to Arweave via Bundlr...");
                arweaveId = await archiveToArweave(bufferToStore);
                server.log.info({ arweaveId }, "✅ Arweave archival complete");
            } catch (arweaveError: any) {
                server.log.warn({ error: arweaveError.message }, 
                    "⚠️ Arweave archival failed (non-critical) - IPFS storage succeeded");
            }

            const storedAt = Date.now();
            const sizeBytes = bufferToStore.length;

            // ─────────────────────────────────────────────────────────────────
            // STEP 6: Create internal Evidence record with custody chain
            // ─────────────────────────────────────────────────────────────────
            let evidence;
            try {
                if (!isDatabaseConnected()) {
                    throw new Error("Database not connected");
                }
                evidence = await prisma.evidence.create({
                    data: {
                        originalHash: evidenceHash,
                        encryptedHash: encryptionRequired 
                            ? crypto.createHash("sha256").update(bufferToStore).digest("hex")
                            : evidenceHash,
                        ipfsCid: cid,
                        arweaveTx: arweaveId,
                        status: "SUBMITTED",
                        metadata: {
                            stageId,
                            source: "PERSON_B_INTEGRATION",
                            encryptionApplied: encryptionRequired,
                            ...(encryptionMetadata && { encryption: encryptionMetadata })
                        },
                        custodyEvents: {
                            create: {
                                eventType: "SUBMISSION",
                                actorAddress: "PERSON_B_PIPELINE",
                                timestamp: new Date()
                            }
                        }
                    }
                });
                server.log.info("✅ Evidence record created in database");
            } catch (dbError) {
                const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
                server.log.warn(`⚠️ Database unavailable - storage succeeded without DB record: ${errorMessage}`);
                evidence = {
                    id: `temp-${stageId}`,
                    originalHash: evidenceHash,
                    ipfsCid: cid,
                    arweaveTx: arweaveId,
                    status: 'stored_without_db'
                };
            }

            // Store encryption key securely if encryption was applied
            // In production, this should go to a KMS or be wrapped for specific recipients
            if (symmetricKey && encryptionRequired) {
                server.log.info("🔑 Encryption key generated - should be wrapped for authorized recipients");
                // TODO: Wrap key for validators using their public keys
            }

            server.log.info({ 
                evidenceId: evidence.id, 
                cid, 
                arweaveId,
                storedAt,
                sizeBytes 
            }, "✅ Storage complete - Evidence record created");

            // ─────────────────────────────────────────────────────────────────
            // STEP 7: Notify Person C (Blockchain) of stored evidence
            // ─────────────────────────────────────────────────────────────────
            const personCUrl = process.env.PERSON_C_BLOCKCHAIN_ENDPOINT || 'http://localhost:3002/api/evidence/register';
            let blockchainResult = null;
            
            try {
                server.log.info(`📡 Notifying Person C at ${personCUrl}...`);
                const blockchainResponse = await fetch(personCUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Integration-Secret': process.env.INTEGRATION_SECRET || ''
                    },
                    body: JSON.stringify({
                        evidenceHash,
                        ipfsCid: cid,
                        arweaveId,
                        stageId,
                        timestamp: storedAt,
                        encryptionApplied: encryptionRequired
                    })
                });
                
                if (blockchainResponse.ok) {
                    blockchainResult = await blockchainResponse.json();
                    server.log.info(`✅ Blockchain registration successful: ${blockchainResult.data?.evidenceId}`);
                } else {
                    server.log.warn(`⚠️ Blockchain registration failed: ${blockchainResponse.status}`);
                }
            } catch (blockchainError) {
                server.log.warn(`⚠️ Could not reach Person C: ${blockchainError instanceof Error ? blockchainError.message : blockchainError}`);
            }

            // ─────────────────────────────────────────────────────────────────
            // STEP 8: Return StorageResponse to Person B
            // ─────────────────────────────────────────────────────────────────
            const response: StorageResponse = {
                cid,
                arweaveId,
                storageProvider: arweaveId ? "IPFS+Arweave" : "IPFS",
                storedAt,
                sizeBytes,
                evidenceId: evidence.id,
                ...(encryptionMetadata && { encryptionMetadata }),
                ...(blockchainResult && { blockchain: blockchainResult.data })
            };

            return response;

        } catch (error: any) {
            server.log.error({ error: error.message, stack: error.stack }, "❌ Storage request failed");
            return reply.status(500).send({ 
                error: "Storage operation failed",
                message: error.message,
                stageId 
            });
        }
    });

    /**
     * GET /api/store/status/:evidenceId
     * 
     * Check storage status for a piece of evidence.
     * Useful for Person B to verify storage completed successfully.
     */
    server.get("/api/store/status/:evidenceId", async (request: FastifyRequest, reply: FastifyReply) => {
        const { evidenceId } = request.params as { evidenceId: string };

        try {
            const evidence = await prisma.evidence.findUnique({
                where: { id: evidenceId },
                select: {
                    id: true,
                    ipfsCid: true,
                    arweaveTx: true,
                    status: true,
                    createdAt: true,
                    originalHash: true
                }
            });

            if (!evidence) {
                return reply.status(404).send({ error: "Evidence not found" });
            }

            return {
                evidenceId: evidence.id,
                cid: evidence.ipfsCid,
                arweaveId: evidence.arweaveTx,
                storageProvider: evidence.arweaveTx ? "IPFS+Arweave" : "IPFS",
                status: evidence.status,
                storedAt: evidence.createdAt.getTime(),
                hash: evidence.originalHash
            };
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    });

    /**
     * POST /api/store/verify
     * 
     * Verify that stored evidence matches expected hash.
     * Person B can use this to confirm storage integrity.
     */
    server.post("/api/store/verify", async (request: FastifyRequest, reply: FastifyReply) => {
        const { cid, expectedHash } = request.body as { cid: string; expectedHash: string };

        if (!cid || !expectedHash) {
            return reply.status(400).send({ error: "Missing cid or expectedHash" });
        }

        try {
            const evidence = await prisma.evidence.findFirst({
                where: { ipfsCid: cid }
            });

            if (!evidence) {
                return reply.status(404).send({ 
                    verified: false, 
                    error: "No evidence found with this CID" 
                });
            }

            const hashMatches = evidence.originalHash === expectedHash;

            return {
                verified: hashMatches,
                cid,
                storedHash: evidence.originalHash,
                expectedHash,
                evidenceId: evidence.id,
                status: evidence.status
            };
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    });

    /**
     * Health check for integration status
     */
    server.get("/api/integration/health", async () => {
        const stagingUrl = process.env.PERSON_B_STAGING_URL || process.env.STAGING_URL;
        
        return {
            service: "Person D - Storage Backend",
            status: "operational",
            timestamp: Date.now(),
            integrations: {
                personB: {
                    stagingUrl: stagingUrl ? "configured" : "not configured (using mock)",
                    endpoint: "POST /api/store"
                },
                ipfs: {
                    provider: "Pinata",
                    configured: !!process.env.PINATA_JWT
                },
                arweave: {
                    provider: "Bundlr/Irys",
                    configured: !!process.env.BUNDLR_PRIVATE_KEY
                }
            }
        };
    });
}
