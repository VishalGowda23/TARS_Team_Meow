import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { CryptoService } from "../crypto";
import { uploadToIPFS } from "../storage/pinata";
import { archiveToArweave } from "../storage/bundlr";
import prisma from "../lib/prisma";
import * as crypto from "node:crypto";
import { assignValidators } from "../workflow/engine";

export async function submissionRoutes(server: FastifyInstance) {

    // POST /evidence/submit
    server.post("/evidence/submit", async (request: FastifyRequest, reply: FastifyReply) => {
        const { content, fileName, recipientPublicKeys, validatorAddresses } = request.body as {
            content: string, // Base64 content
            fileName: string,
            recipientPublicKeys: string[], // Base64 X25519 keys
            validatorAddresses: string[]
        };

        server.log.info({ fileName, recipientCount: recipientPublicKeys?.length }, "Received submission request");

        if (!content || !recipientPublicKeys || !validatorAddresses) {
            return reply.status(400).send({ error: "Missing required fields" });
        }

        try {
            const buffer = Buffer.from(content, "base64");
            console.log(`[DEBUG] Input Buffer Size: ${buffer.length}`);

            // 1. Calculate original hash
            const originalHash = require("node:crypto").createHash("sha256").update(buffer).digest("hex");

            // 2. Encrypt
            const pks = recipientPublicKeys.map(k => Buffer.from(k, "base64"));
            const { encryptedFile, wrappedKeys } = await CryptoService.encryptForRecipients(buffer, pks);

            const encryptedBuffer = Buffer.from(encryptedFile.ciphertext, "base64");
            console.log(`[DEBUG] Encrypted Buffer Size: ${encryptedBuffer.length}`);
            const encryptedHash = require("node:crypto").createHash("sha256").update(encryptedBuffer).digest("hex");

            // 3. Upload to IPFS (Pinata)
            const ipfsCid = await uploadToIPFS(encryptedBuffer, fileName);

            // 4. Archive to Arweave (Bundlr)
            // Note: This might fail on devnet if BUNDLR_PRIVATE_KEY is invalid/not funded, 
            // so we'll wrap it to ensure the DB record is still created.
            let arweaveTx = null;
            try {
                arweaveTx = await archiveToArweave(encryptedBuffer);
            } catch (e) {
                server.log.warn("Arweave archival failed, continuing with submission.");
            }

            // 5. Create DB record
            const evidence = await prisma.evidence.create({
                data: {
                    originalHash,
                    encryptedHash,
                    ipfsCid,
                    arweaveTx,
                    status: "SUBMITTED",
                    metadata: { fileName, iv: encryptedFile.iv, authTag: encryptedFile.authTag },
                    encryptedKeys: {
                        create: wrappedKeys.map((wk, i) => ({
                            recipientAddress: "recipient_" + i, // Or a real address if provided
                            wrappedKey: wk
                        }))
                    },
                    custodyEvents: {
                        create: {
                            eventType: "SUBMISSION",
                            actorAddress: "SUBMITTER",
                            timestamp: new Date()
                        }
                    }
                }
            });

            // 6. Trigger Validator Assignment
            await assignValidators(evidence.id, validatorAddresses);

            return {
                evidenceId: evidence.id,
                ipfsCid,
                arweaveTx,
                status: "ASSIGNED"
            };

        } catch (error: any) {
            console.error("[DEBUG] Submission Error:", error);
            if (error.cause) console.error("[DEBUG] Error Cause:", error.cause);
            return reply.status(500).send({ error: error.message });
        }
    });
}
