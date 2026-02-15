# TARS - Trustless Anonymous Reporting System

A decentralized whistleblowing platform that replaces institutional trust with cryptographic certainty. Built on Ethereum (Sepolia Testnet) with IPFS for immutable, anonymous evidence submission.

## 🌟 Features

### Core Features
- **Metadata Stripper**: Automatically removes GPS, EXIF, author data from all file types
- **Proof-of-Existence**: Registers document hashes on blockchain for unalterable timestamps
- **Selective Disclosure**: Release evidence in stages using granular encryption keys
- **Multi-Party Validation**: Consensus-based verification by independent validators
- **Pseudonymous Reputation**: Build trust score without revealing identity
- **Audit Report Generator**: Legal documentation with cryptographic proofs

### Security Features
- 🔐 AES-256-GCM encryption for selective disclosure
- 🧅 Tor-compatible for anonymous submissions
- 🔒 Zero-knowledge pseudonymous identity system
- ⛓️ Immutable blockchain audit trail
- 📍 Complete metadata sanitization

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                    (Your existing frontend)                          │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND API                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Evidence   │  │  Validation │  │    IPFS     │  │   Audit    │ │
│  │   Routes    │  │   Routes    │  │   Routes    │  │   Routes   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
│         │                │                │                │        │
│  ┌──────┴────────────────┴────────────────┴────────────────┴──────┐ │
│  │                        SERVICES                                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │ │
│  │  │  Metadata    │  │    IPFS      │  │     Blockchain       │  │ │
│  │  │  Stripper    │  │   Service    │  │      Service         │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │                  Encryption Service                       │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   IPFS/Pinata   │     │ Sepolia Testnet │     │   Smart         │
│   (Storage)     │     │   (Blockchain)  │     │   Contracts     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- MetaMask wallet with Sepolia ETH
- Pinata account (for IPFS)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
```

### Configuration

Edit `.env` file with:

```env
# Your wallet private key (for deploying contracts)
PRIVATE_KEY=your_wallet_private_key

# Sepolia RPC (get from Infura/Alchemy)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key

# Pinata IPFS credentials
PINATA_JWT=your_pinata_jwt_token

# After deployment, add contract addresses
TARS_CONTRACT_ADDRESS=
TARS_TOKEN_ADDRESS=
```

### Deploy Contracts

```bash
# Compile contracts
npm run compile

# Deploy to Sepolia
npm run deploy:sepolia
```

After deployment, copy the contract addresses to your `.env` file.

### Start Backend Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server runs on `http://localhost:3001`

## 📡 API Endpoints

### Evidence Submission

```http
POST /api/evidence/submit
Content-Type: multipart/form-data

files: [File]
category: string
secret: string (your pseudonymous identity secret)
enableEncryption: boolean
```

**Response:**
```json
{
  "success": true,
  "pseudonymousId": "0x...",
  "submissions": [{
    "submissionId": "1",
    "contentHash": "0x...",
    "ipfsHash": "Qm...",
    "transactionHash": "0x...",
    "strippedFields": ["gps.latitude", "device.model", ...]
  }]
}
```

### Verify Evidence

```http
POST /api/evidence/verify
Content-Type: application/json

{
  "contentHash": "sha256_hash_of_file"
}
```

### Get Submission

```http
GET /api/evidence/:submissionId
```

### Validate Evidence (Validators Only)

```http
POST /api/validation/validate
Content-Type: application/json

{
  "submissionId": 1,
  "approved": true,
  "comment": "Evidence verified authentic"
}
```

### Generate Audit Report

```http
GET /api/audit/:submissionId/legal-report?jurisdiction=US
```

### Check Reputation

```http
POST /api/reputation/lookup
Content-Type: application/json

{
  "secret": "your_secret_phrase"
}
```

## 🔐 Smart Contract Interface

### TARS.sol Main Functions

```solidity
// Submit evidence
function submitEvidence(
    bytes32 _contentHash,
    string calldata _ipfsHash,
    string calldata _category,
    bytes32 _encryptionKeyHash,
    string calldata _metadataHash,
    address _pseudonymousId
) external returns (uint256)

// Validate evidence (validators only)
function validateEvidence(
    uint256 _submissionId,
    bool _approved,
    string calldata _comment
) external

// Verify proof of existence
function verifyProofOfExistence(bytes32 _contentHash) external view returns (
    bool exists,
    uint256 submissionId,
    uint256 timestamp,
    uint256 blockNumber
)

// Generate audit report
function generateAuditReport(uint256 _submissionId) external view returns (...)
```

## 🧪 Testing

```bash
# Run smart contract tests
npm test

# Run specific test
npx hardhat test test/TARS.test.js
```

## 📁 Project Structure

```
├── contracts/
│   ├── TARS.sol           # Main whistleblowing contract
│   └── TARSToken.sol      # Utility token for validators
├── scripts/
│   └── deploy.js          # Deployment script
├── server/
│   ├── index.js           # Express server
│   ├── routes/
│   │   ├── evidence.js    # Evidence submission routes
│   │   ├── validation.js  # Validation routes
│   │   ├── ipfs.js        # IPFS routes
│   │   ├── audit.js       # Audit report routes
│   │   └── reputation.js  # Reputation routes
│   └── services/
│       ├── metadataStripper.js  # Metadata removal
│       ├── ipfsService.js       # IPFS/Pinata integration
│       ├── blockchainService.js # Ethereum interaction
│       └── encryptionService.js # Encryption utilities
├── test/
│   └── TARS.test.js       # Contract tests
├── hardhat.config.js
├── package.json
└── README.md
```

## 🔒 Security Considerations

1. **Never expose private keys** - Use environment variables
2. **Secret phrases** should be at least 12 characters
3. **Decryption keys** must be stored securely by the whistleblower
4. **Metadata stripping** is automatic but verify for sensitive files
5. **Consider using Tor** for additional network-level anonymity

## 🌐 Network Information

| Network | Chain ID | Contract |
|---------|----------|----------|
| Sepolia | 11155111 | (Deployed address) |

## 📜 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## ⚠️ Disclaimer

This platform is designed for legitimate whistleblowing activities. Users are responsible for ensuring their submissions comply with applicable laws. The platform provides technical anonymity but cannot guarantee complete protection against all forms of identification.
