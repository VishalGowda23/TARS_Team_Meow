import sodium from 'libsodium-wrappers';

export async function initSodium() {
    await sodium.ready;
}

/**
 * Wraps (encrypts) a symmetric key for a recipient using their X25519 public key.
 * This uses a "sealed box" which is anonymous (the sender's key is not needed).
 */
export async function wrapKey(symmetricKey: Buffer, recipientPublicKey: Uint8Array): Promise<string> {
    await sodium.ready;
    const sealedBox = sodium.crypto_box_seal(symmetricKey, recipientPublicKey);
    return Buffer.from(sealedBox).toString('base64');
}

/**
 * Unwraps (decrypts) a symmetric key using the recipient's X25519 private/public key pair.
 */
export async function unwrapKey(
    wrappedKeyBase64: string,
    recipientPublicKey: Uint8Array,
    recipientPrivateKey: Uint8Array
): Promise<Buffer> {
    await sodium.ready;
    const wrappedKey = Buffer.from(wrappedKeyBase64, 'base64');
    const decrypted = sodium.crypto_box_seal_open(wrappedKey, recipientPublicKey, recipientPrivateKey);
    return Buffer.from(decrypted);
}

/**
 * Helper to generate a new X25519 keypair for testing or validators.
 */
export async function generateKeyPair() {
    await sodium.ready;
    return sodium.crypto_box_keypair();
}
