"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNonce = generateNonce;
exports.verifySignatureAndLogin = verifySignatureAndLogin;
exports.verifyToken = verifyToken;
const ethers_1 = require("ethers");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = require("@upstash/redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
let redis = null;
if (redisUrl && redisToken) {
    redis = new redis_1.Redis({ url: redisUrl, token: redisToken });
}
const nonceStore = new Map();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
/**
 * Generates a challenge nonce for a given wallet address.
 * Stores it in Redis with a 5-minute TTL.
 */
async function generateNonce(walletAddress) {
    const nonce = `Sign this message to authenticate with TARS: ${Math.floor(Math.random() * 1000000)}`;
    const key = walletAddress.toLowerCase();
    if (redis) {
        await redis.set(`nonce:${key}`, nonce, { ex: 300 });
    }
    else {
        nonceStore.set(key, nonce);
        setTimeout(() => nonceStore.delete(key), 300000);
    }
    return nonce;
}
/**
 * Verifies the signature of a nonce and returns a JWT if valid.
 */
async function verifySignatureAndLogin(walletAddress, signature) {
    const normalizedAddress = walletAddress.toLowerCase();
    let storedNonce = null;
    if (redis) {
        storedNonce = await redis.get(`nonce:${normalizedAddress}`);
    }
    else {
        storedNonce = nonceStore.get(normalizedAddress) || null;
    }
    if (!storedNonce) {
        throw new Error("Nonce expired or not found");
    }
    try {
        const recoveredAddress = ethers_1.ethers.verifyMessage(storedNonce, signature);
        if (recoveredAddress.toLowerCase() === normalizedAddress) {
            if (redis) {
                await redis.del(`nonce:${normalizedAddress}`);
            }
            else {
                nonceStore.delete(normalizedAddress);
            }
            const token = jsonwebtoken_1.default.sign({ walletAddress: normalizedAddress }, JWT_SECRET, { expiresIn: '24h' });
            return token;
        }
    }
    catch (error) {
        console.error("Signature verification failed:", error);
    }
    return null;
}
/**
 * Simple middleware to verify JWT.
 */
async function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (error) {
        return null;
    }
}
