import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

export interface EncryptedData {
    ciphertext: string;
    iv: string;
    authTag: string;
}

export function generateSymmetricKey(): Buffer {
    return randomBytes(32); // 256 bits
}

export function encryptBuffer(buffer: Buffer, key: Buffer): EncryptedData {
    const iv = randomBytes(12); // GCM standard IV size
    const cipher = createCipheriv('aes-256-gcm', key, iv);

    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        ciphertext: ciphertext.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
    };
}

export function decryptBuffer(encrypted: EncryptedData, key: Buffer): Buffer {
    const decipher = createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(encrypted.iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));

    return Buffer.concat([
        decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
        decipher.final(),
    ]);
}
