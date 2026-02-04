import { randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";
import prisma from "../lib/prisma";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
if (redisUrl && redisToken) {
    redis = new Redis({ url: redisUrl, token: redisToken });
}

const disclosureStore = new Map<string, { evidenceId: string; expiresAt: number }>();

/**
 * Grants access to a specific piece of evidence for a limited time.
 */
export async function grantDisclosure(evidenceId: string, recipientEmail: string, ttlSeconds: number = 3600) {
    const token = randomBytes(32).toString("hex");

    // Store token in DB for long-term audit trail
    await prisma.disclosureToken.create({
        data: {
            evidenceId,
            token,
            recipientEmail,
            expiresAt: new Date(Date.now() + ttlSeconds * 1000)
        }
    });

    if (redis) {
        await redis.set(`disclosure:${token}`, evidenceId, { ex: ttlSeconds });
    } else {
        disclosureStore.set(token, { evidenceId, expiresAt: Date.now() + ttlSeconds * 1000 });
    }

    // Log custody event
    await prisma.custodyEvent.create({
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
export async function validateToken(token: string) {
    let evidenceId: string | null = null;
    
    if (redis) {
        evidenceId = await redis.get(`disclosure:${token}`) as string | null;
    } else {
        const stored = disclosureStore.get(token);
        if (stored && stored.expiresAt > Date.now()) {
            evidenceId = stored.evidenceId;
        } else if (stored) {
            disclosureStore.delete(token);
        }
    }

    if (!evidenceId) {
        return null;
    }

    return prisma.evidence.findUnique({
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
export async function revokeDisclosure(token: string) {
    if (redis) {
        await redis.del(`disclosure:${token}`);
    } else {
        disclosureStore.delete(token);
    }
}
