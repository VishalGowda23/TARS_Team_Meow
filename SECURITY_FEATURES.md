# TARS Security Features

## Metadata Stripping

All uploaded files undergo automatic metadata removal to protect whistleblower identity and location.

### What Gets Removed:
- **Images (JPEG/PNG)**: EXIF data including:
  - Camera make/model
  - GPS coordinates
  - Date/time taken
  - Software used
  - Exposure settings
  
- **PDFs**: Metadata including:
  - Author information
  - Creation/modification dates
  - Software used
  - (Pending full implementation)

- **Office Documents**: Metadata including:
  - Author names
  - Company information
  - Edit history
  - (Pending full implementation)

### Implementation:
Located in `/src/lib/utils/metadataStripper.ts`

The system uses the `piexifjs` library for JPEG EXIF removal and canvas reprocessing for other image types.

---

## Granular Access Control

Files are encrypted client-side with AES-256-GCM encryption before submission. Access is controlled via individual encryption keys.

### How It Works:

1. **File Encryption**:
   - Each file gets a unique AES-256 encryption key
   - File is encrypted in the browser before submission
   - Original file never leaves in plaintext

2. **Access Keys**:
   - Submitter automatically gets access
   - Keys can be granted to:
     - Validators (for review)
     - Higher authorities (for disclosure)
     - Investigators (as needed)
   - Each access key is time-limited and revocable

3. **Key Distribution**:
   - Keys are encrypted with recipient's public key (RSA-OAEP)
   - Only authorized parties can decrypt the file
   - No central key storage

### Access Control Functions:

```typescript
// Grant access to a user
await createAccessKey(encryptionKey, userId, expirationMs);

// Revoke access
revokeAccessKey(keyId, userId);

// Check if user has access
const fileData = await retrieveEncryptedFile(evidenceId, userId);
```

### Implementation:
Located in `/src/lib/utils/encryption.ts`

---

## Security Flow

1. **Submission**:
   ```
   Original File → Metadata Stripped → Encrypted → Hashed → Blockchain
   ```

2. **Storage**:
   - Encrypted file stored in IndexedDB/LocalStorage
   - Access keys stored separately
   - Hash recorded on blockchain for integrity

3. **Access**:
   - User requests file
   - System checks for valid access key
   - File decrypted only if authorized
   - Decryption happens client-side

---

## Configuration

### Metadata Stripping

Enable/disable per file type in submit flow:
```typescript
const strippedResult = await stripMetadata(file);
```

### Encryption Keys

Default key length: 256 bits (AES-GCM)
Default access duration: Unlimited (can be set per key)

```typescript
// Grant temporary access (24 hours)
await createAccessKey(key, userId, 24 * 60 * 60 * 1000);
```

---

## Future Enhancements

- [ ] PDF metadata stripping (pdf-lib integration)
- [ ] Office document metadata removal
- [ ] Public key infrastructure (PKI) for RSA encryption
- [ ] Hardware security module (HSM) integration
- [ ] Audit logging for all file access
- [ ] Automatic key rotation
- [ ] Multi-party computation for key management

---

## Security Notes

⚠️ **Current Limitations**:
- Keys stored in browser localStorage (demo only)
- Production should use secure key management service
- RSA encryption of keys not yet implemented
- No key backup/recovery mechanism

🔒 **Best Practices**:
- Always verify encryption before submission
- Monitor access key expiration
- Revoke keys immediately when access no longer needed
- Regularly audit who has access to each file

---

## Testing

### Test Metadata Stripping:
1. Upload a photo with GPS data
2. Check console for metadata report
3. Verify "Metadata stripped" message

### Test Access Control:
1. Submit evidence as User A
2. Try to access as User B (should fail)
3. Grant access key to User B
4. User B can now view file

---

## API Reference

### Metadata Stripping
```typescript
import { stripMetadata, generateMetadataReport } from '@/lib/utils/metadataStripper';

const result = await stripMetadata(file);
const report = generateMetadataReport(result);
```

### Encryption
```typescript
import { 
  encryptFile, 
  decryptFile, 
  createAccessKey,
  revokeAccessKey 
} from '@/lib/utils/encryption';

// Encrypt
const encrypted = await encryptFile(file);

// Grant access
const accessKey = await createAccessKey(
  encrypted.encryptionKey, 
  'userId', 
  expirationMs
);

// Decrypt (if authorized)
const decrypted = await decryptFile(
  encryptedData, 
  key, 
  iv
);
```
