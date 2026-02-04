"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToIPFS = uploadToIPFS;
exports.testPinataConnection = testPinataConnection;
const pinata_web3_1 = require("pinata-web3");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (!process.env.PINATA_JWT) {
    console.warn("WARNING: PINATA_JWT is not set. IPFS uploads will be disabled.");
}
const pinata = process.env.PINATA_JWT ? new pinata_web3_1.PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.PINATA_GATEWAY,
}) : null;
/**
 * Uploads a buffer to IPFS via Pinata.
 * @param buffer The file content buffer.
 * @param fileName Name of the file for Pinata metadata.
 */
async function uploadToIPFS(buffer, fileName) {
    if (!pinata) {
        console.warn("IPFS upload skipped - Pinata not configured");
        return `mock-ipfs-cid-${Date.now()}`;
    }
    try {
        const file = new File([new Uint8Array(buffer)], fileName, { type: "application/octet-stream" });
        const upload = await pinata.upload.file(file);
        return upload.IpfsHash;
    }
    catch (error) {
        console.error("Pinata upload error:", error);
        if (error.details)
            console.error("Pinata error details:", error.details);
        throw new Error(`Failed to upload to IPFS via Pinata: ${error.message || "Unknown error"}`);
    }
}
/**
 * Checks if Pinata is correctly configured.
 */
async function testPinataConnection() {
    if (!pinata) {
        console.warn("Pinata not configured for testing");
        return false;
    }
    try {
        const auth = await pinata.testAuthentication();
        return auth.message === "Congratulations! You are communicating with the Pinata API!";
    }
    catch (error) {
        console.error("Pinata authentication failed:", error);
        return false;
    }
}
