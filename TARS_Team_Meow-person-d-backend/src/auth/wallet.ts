import { ethers } from "ethers";
import jwt from "jsonwebtoken";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
if (redisUrl && redisToken) {
    redis = new Redis({ url: redisUrl, token: redisToken });
}

const nonceStore = new Map<string, string>();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

/**
 * Generates a challenge nonce for a given wallet address.
 * Stores it in Redis with a 5-minute TTL.
 */
export async function generateNonce(walletAddress: string): Promise<string> {
    const nonce = `Sign this message to authenticate with TARS: ${Math.floor(Math.random() * 1000000)}`;
    const key = walletAddress.toLowerCase();
    if (redis) {
        await redis.set(`nonce:${key}`, nonce, { ex: 300 });
    } else {
        nonceStore.set(key, nonce);
        setTimeout(() => nonceStore.delete(key), 300000);
    }
    return nonce;
}

/**
 * Verifies the signature of a nonce and returns a JWT if valid.
 */
export async function verifySignatureAndLogin(walletAddress: string, signature: string): Promise<string | null> {
    const normalizedAddress = walletAddress.toLowerCase();
    let storedNonce: string | null = null;
    
    if (redis) {
        storedNonce = await redis.get(`nonce:${normalizedAddress}`);
    } else {
        storedNonce = nonceStore.get(normalizedAddress) || null;
    }

    if (!storedNonce) {
        throw new Error("Nonce expired or not found");
    }

    try {
        const recoveredAddress = ethers.verifyMessage(storedNonce, signature);

        if (recoveredAddress.toLowerCase() === normalizedAddress) {
            if (redis) {
                await redis.del(`nonce:${normalizedAddress}`);
            } else {
                nonceStore.delete(normalizedAddress);
            }

            const token = jwt.sign({ walletAddress: normalizedAddress }, JWT_SECRET, { expiresIn: '24h' });
            return token;
        }
    } catch (error) {
        console.error("Signature verification failed:", error);
    }

    return null;
}

/**
 * Simple middleware to verify JWT.
 */
export async function verifyToken(token: string) {
    try {
        return jwt.verify(token, JWT_SECRET) as { walletAddress: string };
    } catch (error) {
        return null;
    }
}
