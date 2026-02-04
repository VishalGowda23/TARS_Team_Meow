import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ 
    adapter,
    log: ['error', 'warn'],
    errorFormat: 'minimal'
});

let isConnected = false;
let retryCount = 0;
const maxRetries = 3;

export async function connectWithRetry() {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await prisma.$connect();
            isConnected = true;
            console.log(`✅ Database connected on attempt ${i + 1}`);
            return true;
        } catch (error) {
            console.warn(`⚠️ Database connection attempt ${i + 1} failed:`, error instanceof Error ? error.message : 'Unknown error');
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
            }
        }
    }
    console.error(`❌ Failed to connect to database after ${maxRetries} attempts`);
    isConnected = false;
    return false;
}

export function isDatabaseConnected() {
    return isConnected;
}

export default prisma;
