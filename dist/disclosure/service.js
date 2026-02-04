"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.grantDisclosure = grantDisclosure;
exports.validateToken = validateToken;
exports.revokeDisclosure = revokeDisclosure;
const node_crypto_1 = require("node:crypto");
const redis_1 = require("@upstash/redis");
const prisma_1 = __importDefault(require("../lib/prisma"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
let redis = null;
if (redisUrl && redisToken) {
    redis = new redis_1.Redis({ url: redisUrl, token: redisToken });
}
const disclosureStore = new Map();
/**
 * Grants access to a specific piece of evidence for a limited time.
 */
async function grantDisclosure(evidenceId, recipientEmail, ttlSeconds = 3600) {
    const token = (0, node_crypto_1.randomBytes)(32).toString("hex");
    // Store token in DB for long-term audit trail
    await prisma_1.default.disclosureToken.create({
        data: {
            evidenceId,
            token,
            recipientEmail,
            expiresAt: new Date(Date.now() + ttlSeconds * 1000)
        }
    });
    if (redis) {
        await redis.set(`disclosure:${token}`, evidenceId, { ex: ttlSeconds });
    }
    else {
        disclosureStore.set(token, { evidenceId, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
    // Log custody event
    await prisma_1.default.custodyEvent.create({
        data: {
            evidenceId,
            eventType: "DISCLOSURE_GRANT",
            actorAddress: `RECIPIENT:${recipientEmail}`,
            timestamp: new Date()
        }
    });
    return token;
}
/**
 * Validates a disclosure token and retrieves evidence metadata.
 */
async function validateToken(token) {
    let evidenceId = null;
    if (redis) {
        evidenceId = await redis.get(`disclosure:${token}`);
    }
    else {
        const stored = disclosureStore.get(token);
        if (stored && stored.expiresAt > Date.now()) {
            evidenceId = stored.evidenceId;
        }
        else if (stored) {
            disclosureStore.delete(token);
        }
    }
    if (!evidenceId) {
        return null;
    }
    return prisma_1.default.evidence.findUnique({
        where: { id: evidenceId },
        include: {
            encryptedKeys: true,
            auditReports: true
        }
    });
}
/**
 * Revokes access immediately.
 */
async function revokeDisclosure(token) {
    if (redis) {
        await redis.del(`disclosure:${token}`);
    }
    else {
        disclosureStore.delete(token);
    }
}
