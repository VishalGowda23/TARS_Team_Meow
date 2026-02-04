"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveToArweave = archiveToArweave;
const client_1 = __importDefault(require("@bundlr-network/client"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * Uploads a buffer to Arweave via Bundlr.
 * @param buffer The file content buffer.
 * @param mimeType The MIME type of the file.
 */
async function archiveToArweave(buffer, mimeType = "application/octet-stream") {
    const privateKey = process.env.BUNDLR_PRIVATE_KEY;
    if (!privateKey) {
        console.warn("BUNDLR_PRIVATE_KEY not configured - Arweave archival disabled");
        return `mock-arweave-tx-${Date.now()}`;
    }
    try {
        const bundlrUrl = process.env.BUNDLR_URL || "https://devnet.irys.xyz";
        const bundlr = new client_1.default(bundlrUrl, "ethereum", privateKey);
        const transaction = bundlr.createTransaction(buffer, {
            tags: [{ name: "Content-Type", value: mimeType }, { name: "App-Name", value: "TARS-Person-D" }]
        });
        await transaction.sign();
        const response = await transaction.upload();
        return response.id;
    }
    catch (error) {
        console.error("Bundlr archival error:", error);
        console.warn("Falling back to mock Arweave ID");
        return `mock-arweave-tx-${Date.now()}`;
    }
}
