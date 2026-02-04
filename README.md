# TARS Privacy Engine
## Person B: Privacy + Anonymous Submission Engineer

A secure, privacy-focused evidence submission system that ensures **complete whistleblower anonymity** through metadata stripping, encrypted staging, and anonymous network routing.

---

## 🔐 Security Features

| Feature | Implementation |
|---------|----------------|
| **No IP Logging** | All IP access is blocked/redacted |
| **Metadata Stripping** | GPS, EXIF, author data removed |
| **Encrypted Staging** | AES-256-GCM encryption |
| **Anonymous Routing** | Tor network integration |
| **Secure Hashing** | SHA-256 for blockchain |

---

## 📁 Project Structure

```
tars-privacy-engine/
├── src/
│   ├── api/
│   │   └── submissionRoutes.ts    # API endpoints
│   ├── services/
│   │   ├── metadataStripper.ts    # EXIF/GPS removal
│   │   ├── evidenceHasher.ts      # SHA-256 hashing
│   │   ├── encryptedStaging.ts    # Temp encrypted storage
│   │   └── torRouting.ts          # Tor integration
│   ├── types/
│   │   └── index.ts               # TypeScript definitions
│   ├── utils/
│   │   └── logger.ts              # Secure logging
│   └── index.ts                   # Server entry
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd tars-privacy-engine
npm install
```

### 2. Build
```bash
npm run build
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Production Server
```bash
npm start
```

---

## 📡 API Endpoints

### `POST /api/submit`
Submit evidence for processing.

**Request:**
```bash
curl -X POST http://localhost:3001/api/submit \
  -F "evidence=@/path/to/file.jpg" \
  -F "description=Corruption evidence" \
  -F "caseTags=financial,government"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "submissionId": "uuid",
    "evidenceHash": "sha256-hash",
    "timestamp": "2026-02-04T10:00:00Z",
    "stageId": "stage_xxx",
    "receipt": {
      "submissionId": "uuid",
      "evidenceHash": "sha256-hash",
      "submittedAt": "2026-02-04T10:00:00Z",
      "fileType": "image/jpeg",
      "sanitizedSize": 1024000,
      "metadataRemoved": ["gps_data", "exif", "camera_make"]
    }
  }
}
```

### `POST /api/verify`
Verify a hash format.

### `GET /api/stage/:stageId`
Get staged evidence metadata.

### `GET /api/supported-types`
List supported file types.

### `GET /api/health`
Health check endpoint.

---

## 🧹 Metadata Stripper

Removes identifying information from:

| File Type | Stripped Data |
|-----------|---------------|
| **Images** | GPS, EXIF, ICC profile, XMP, IPTC, camera info |
| **PDFs** | Author, creator, timestamps, producer |
| **Videos** | Location, device, creation time |
| **Documents** | Author, company, revision history |

---

## 🔒 Encrypted Staging

Evidence is temporarily encrypted before forwarding:

- **Algorithm:** AES-256-GCM
- **TTL:** 5 minutes (configurable)
- **Max Access:** 3 retrievals
- **Auto-cleanup:** Secure memory wipe

---

## 🧅 Tor Integration

For production anonymity:

```bash
# Install Tor
# Windows: Download from torproject.org
# Linux: sudo apt install tor

# Start Tor service
tor

# Enable in TARS
ENABLE_TOR=true npm start
```

---

## 🔗 Integration with Other TARS Components

### → Person C (Blockchain)
```typescript
// After staging, send to blockchain:
const hash = response.data.evidenceHash;
const stageId = response.data.stageId;

// Person C registers hash on-chain
blockchainContract.registerEvidence(hash, timestamp, cid);
```

### → Person D (Storage)
```typescript
// Retrieve staged evidence for IPFS/Arweave:
const evidence = await fetch(`/api/stage/${stageId}`);
// Person D stores on decentralized storage
```

---

## 🔧 Environment Variables

```env
PORT=3001
NODE_ENV=development
ENABLE_TOR=false
ALLOWED_ORIGIN=https://tars-frontend.com
LOG_LEVEL=info
```

---

## ⚠️ Security Notes

1. **NEVER** deploy without Tor in production
2. **NEVER** log IP addresses or user agents
3. **ALWAYS** strip metadata before hashing
4. **ALWAYS** encrypt staged evidence
5. **ALWAYS** set secure CORS origins in production

---

## 📊 Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Upload    │────▶│   Strip     │────▶│   Hash      │────▶│   Stage     │
│   (via Tor) │     │   Metadata  │     │   (SHA-256) │     │   (AES-256) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Receipt   │◀────│   Return    │◀────│  Register   │◀────│   Forward   │
│   to User   │     │   Hash+ID   │     │  (Person C) │     │   (Person D)│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## 📝 License

MIT License - TARS Project
