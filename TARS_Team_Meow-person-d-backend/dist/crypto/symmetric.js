"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSymmetricKey = generateSymmetricKey;
exports.encryptBuffer = encryptBuffer;
exports.decryptBuffer = decryptBuffer;
const node_crypto_1 = require("node:crypto");
function generateSymmetricKey() {
    return (0, node_crypto_1.randomBytes)(32); // 256 bits
}
function encryptBuffer(buffer, key) {
    const iv = (0, node_crypto_1.randomBytes)(12); // GCM standard IV size
    const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
        ciphertext: ciphertext.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
    };
}
function decryptBuffer(encrypted, key) {
    const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', key, Buffer.from(encrypted.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
        decipher.final(),
    ]);
}
