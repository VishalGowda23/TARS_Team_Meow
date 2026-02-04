import { CryptoService } from './index';

async function testEncryption() {
    console.log("Starting Crypto Service Test...");

    const originalContent = "Hello, this is a secret evidence file content!";
    const fileBuffer = Buffer.from(originalContent);

    // 1. Generate a test keypair
    const keypair = await CryptoService.generateKeyPair();
    console.log("Test Keypair Generated.");

    // 2. Encrypt for the recipient
    console.log("Encrypting content...");
    const { encryptedFile, wrappedKeys } = await CryptoService.encryptForRecipients(fileBuffer, [keypair.publicKey]);

    console.log("Encrypted File (base64):", encryptedFile.ciphertext.substring(0, 20) + "...");
    console.log("Wrapped Key (base64):", wrappedKeys[0]);

    // 3. Decrypt the key
    console.log("Unwrapping key...");
    const unwrappedKey = await CryptoService.unwrapKey(
        wrappedKeys[0],
        keypair.publicKey,
        keypair.privateKey
    );

    // 4. Decrypt the file
    console.log("Decrypting file...");
    const decryptedBuffer = CryptoService.decryptBuffer(encryptedFile, unwrappedKey);
    const decryptedContent = decryptedBuffer.toString();

    console.log("Decrypted Content:", decryptedContent);

    if (decryptedContent === originalContent) {
        console.log("SUCCESS: Encryption round-trip verified!");
    } else {
        console.error("FAILURE: Decrypted content does not match original!");
        process.exit(1);
    }
}

testEncryption().catch(err => {
    console.error("Test failed with error:", err);
    process.exit(1);
});
