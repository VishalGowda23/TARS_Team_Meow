"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSodium = initSodium;
exports.wrapKey = wrapKey;
exports.unwrapKey = unwrapKey;
exports.generateKeyPair = generateKeyPair;
const libsodium_wrappers_1 = __importDefault(require("libsodium-wrappers"));
async function initSodium() {
    await libsodium_wrappers_1.default.ready;
}
/**
 * Wraps (encrypts) a symmetric key for a recipient using their X25519 public key.
 * This uses a "sealed box" which is anonymous (the sender's key is not needed).
 */
async function wrapKey(symmetricKey, recipientPublicKey) {
    await libsodium_wrappers_1.default.ready;
    const sealedBox = libsodium_wrappers_1.default.crypto_box_seal(symmetricKey, recipientPublicKey);
    return Buffer.from(sealedBox).toString('base64');
}
/**
 * Unwraps (decrypts) a symmetric key using the recipient's X25519 private/public key pair.
 */
async function unwrapKey(wrappedKeyBase64, recipientPublicKey, recipientPrivateKey) {
    await libsodium_wrappers_1.default.ready;
    const wrappedKey = Buffer.from(wrappedKeyBase64, 'base64');
    const decrypted = libsodium_wrappers_1.default.crypto_box_seal_open(wrappedKey, recipientPublicKey, recipientPrivateKey);
    return Buffer.from(decrypted);
}
/**
 * Helper to generate a new X25519 keypair for testing or validators.
 */
async function generateKeyPair() {
    await libsodium_wrappers_1.default.ready;
    return libsodium_wrappers_1.default.crypto_box_keypair();
}
