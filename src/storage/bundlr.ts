import Bundlr from "@bundlr-network/client";
import dotenv from "dotenv";

dotenv.config();

/**
 * Uploads a buffer to Arweave via Bundlr.
 * @param buffer The file content buffer.
 * @param mimeType The MIME type of the file.
 */
export async function archiveToArweave(buffer: Buffer, mimeType: string = "application/octet-stream"): Promise<string> {
    const privateKey = process.env.BUNDLR_PRIVATE_KEY;
    
    if (!privateKey) {
        console.warn("BUNDLR_PRIVATE_KEY not configured - Arweave archival disabled");
        return `mock-arweave-tx-${Date.now()}`;
    }
    
    try {
        const bundlrUrl = process.env.BUNDLR_URL || "https://devnet.irys.xyz";
        const bundlr = new Bundlr(bundlrUrl, "ethereum", privateKey);
        
        const transaction = bundlr.createTransaction(buffer, {
            tags: [{ name: "Content-Type", value: mimeType }, { name: "App-Name", value: "TARS-Person-D" }]
        });
        
        await transaction.sign();
        const response = await transaction.upload();
        
        return response.id;
    } catch (error) {
        console.error("Bundlr archival error:", error);
        console.warn("Falling back to mock Arweave ID");
        return `mock-arweave-tx-${Date.now()}`;
    }
}
