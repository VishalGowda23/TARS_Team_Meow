import prisma from "../lib/prisma";
import { testPinataConnection } from "../storage/pinata";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

async function runTests() {
    console.log("--- Starting Service Connectivity Tests ---");

    // 1. Test Prisma / Database
    try {
        console.log("Testing Database connection...");
        await prisma.$connect();
        console.log("✅ Database: Connected!");
    } catch (err: any) {
        console.error("❌ Database: Failed!", err.message);
    }

    // 2. Test Pinata
    try {
        console.log("Testing Pinata connection...");
        const isPinataOk = await testPinataConnection();
        if (isPinataOk) {
            console.log("✅ Pinata: Authenticated!");
            console.log("Testing Pinata Upload...");
            const cid = await require("../storage/pinata").uploadToIPFS(Buffer.from("Test Pinata Upload"), "test.txt");
            console.log(`✅ Pinata: Upload Success! CID: ${cid}`);
        } else {
            console.error("❌ Pinata: Authentication failed!");
        }
    } catch (err: any) {
        console.error("❌ Pinata: Error!", err.message);
    }

    // 3. Test Redis
    try {
        console.log("Testing Redis connection...");
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL || "",
            token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
        });
        const pong = await redis.ping();
        if (pong === "PONG") {
            console.log("✅ Redis: Connected!");
        }
    } catch (err: any) {
        console.error("❌ Redis: Failed!", err.message);
    }

    console.log("--- Tests Completed ---");
    process.exit(0);
}

runTests();
