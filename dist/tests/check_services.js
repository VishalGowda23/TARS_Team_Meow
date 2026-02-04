"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const pinata_1 = require("../storage/pinata");
const redis_1 = require("@upstash/redis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function runTests() {
    console.log("--- Starting Service Connectivity Tests ---");
    // 1. Test Prisma / Database
    try {
        console.log("Testing Database connection...");
        await prisma_1.default.$connect();
        console.log("✅ Database: Connected!");
    }
    catch (err) {
        console.error("❌ Database: Failed!", err.message);
    }
    // 2. Test Pinata
    try {
        console.log("Testing Pinata connection...");
        const isPinataOk = await (0, pinata_1.testPinataConnection)();
        if (isPinataOk) {
            console.log("✅ Pinata: Authenticated!");
            console.log("Testing Pinata Upload...");
            const cid = await require("../storage/pinata").uploadToIPFS(Buffer.from("Test Pinata Upload"), "test.txt");
            console.log(`✅ Pinata: Upload Success! CID: ${cid}`);
        }
        else {
            console.error("❌ Pinata: Authentication failed!");
        }
    }
    catch (err) {
        console.error("❌ Pinata: Error!", err.message);
    }
    // 3. Test Redis
    try {
        console.log("Testing Redis connection...");
        const redis = new redis_1.Redis({
            url: process.env.UPSTASH_REDIS_REST_URL || "",
            token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
        });
        const pong = await redis.ping();
        if (pong === "PONG") {
            console.log("✅ Redis: Connected!");
        }
    }
    catch (err) {
        console.error("❌ Redis: Failed!", err.message);
    }
    console.log("--- Tests Completed ---");
    process.exit(0);
}
runTests();
