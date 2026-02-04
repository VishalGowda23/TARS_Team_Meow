import * as symmetric from './symmetric';
import * as asymmetric from './asymmetric';

export const CryptoService = {
    ...symmetric,
    ...asymmetric,

    /**
     * Complete pipeline: encrypt a file buffer and wrap the key for one or more recipients.
     */
    async encryptForRecipients(fileBuffer: Buffer, publicKeys: Uint8Array[]) {
        const symKey = symmetric.generateSymmetricKey();
        const encryptedFile = symmetric.encryptBuffer(fileBuffer, symKey);

        const wrappedKeys = await Promise.all(
            publicKeys.map(pk => asymmetric.wrapKey(symKey, pk))
        );

        return {
            encryptedFile,
            wrappedKeys, // Array of base64 strings
        };
    }
};
