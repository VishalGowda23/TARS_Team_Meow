# TARS — Person D Backend
## Tasks & Implementation Plan

This document defines all engineering tasks and concrete implementation steps for **Person D** in the TARS system.

Role Scope:

- Decentralized storage
- Encryption & selective disclosure
- Validator backend
- Multi-party workflow engine
- Audit report generator
- Key management
- Blockchain event ingestion

Target Stack:

- Hosting: Render
- Database: Supabase Postgres
- IPFS: web3.storage
- Arweave Archive: Bundlr Devnet
- Cache / TTL: Upstash Redis
- Blockchain RPC: Alchemy
- API Framework: Fastify (Node.js + TypeScript)
- ORM: Prisma
- Encryption: Node crypto + libsodium-wrappers
- PDF: Playwright
- Templates: Handlebars
- Auth: Wallet signature + JWT

---

---

# GLOBAL SETUP TASKS

## TASK D-0 — Repository & Environment Bootstrap

### Goals
- Initialize backend project
- Prepare cloud-ready config
- Environment isolation
- CI-friendly startup

### Steps

- Create repository `tars-person-d-backend`
- Initialize Node + TypeScript
- Install dependencies:

```

npm install fastify prisma @prisma/client
npm install libsodium-wrappers ethers jsonwebtoken
npm install @web3-storage/w3up-client
npm install @bundlr-network/client
npm install playwright handlebars qrcode
npm install ioredis
npm install pino dotenv

```

- Setup `.env.example`:

```

DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE=
WEB3_STORAGE_TOKEN=
BUNDLR_URL=
BUNDLR_PRIVATE_KEY=
ALCHEMY_RPC=
UPSTASH_REDIS_URL=
JWT_SECRET=

```

- Initialize Prisma
- Configure Render start script
- Add TypeScript build pipeline

Deliverables:

- Repo initialized
- Server starts locally
- Prisma connected to Supabase
- Render deployment ready

---

---

# STORAGE & ENCRYPTION PIPELINE

---

## TASK D-1 — Hybrid Encryption Service

### Goals
- Encrypt evidence files
- Generate per-submission AES key
- Encrypt AES key per recipient
- Zero plaintext persistence

### Implementation

- AES-256-GCM for file encryption
- X25519 / libsodium sealed box for key wrapping

Expose module:

```

/crypto/encryptFile.ts
/crypto/decryptFile.ts
/crypto/keyWrap.ts

```

Functions:

- generateSymmetricKey()
- encryptFile(buffer)
- decryptFile(buffer, key)
- encryptKeyForWallet()
- decryptKeyForWallet()

Deliverables:

- Encrypted file output
- Key map per validator
- Unit tests for encryption round-trip

---

---

## TASK D-2 — IPFS Upload Service

### Goals
- Upload encrypted files to IPFS
- Retrieve CID
- Verify upload integrity

### Implementation

- Use web3.storage client
- Upload encrypted buffer
- Return CID

Expose:

```

POST /storage/ipfs

```

Deliverables:

- CID returned
- Hash consistency verified
- Error handling for retries

---

---

## TASK D-3 — Arweave Archive via Bundlr

### Goals
- Push encrypted file to Arweave network
- Get transaction ID
- Treat as immutable archive

### Implementation

- Use Bundlr devnet client
- Upload encrypted file
- Store txId in DB

Expose:

```

POST /storage/archive

```

Deliverables:

- Bundlr tx ID
- Verified on gateway
- Stored in Supabase

---

---

# DATABASE & SCHEMA

---

## TASK D-4 — Supabase Schema Design

### Tables

- evidence
- validator_assignments
- validator_votes
- custody_events
- encrypted_keys
- disclosure_tokens
- audit_reports

Fields include:

- hashes
- CIDs
- arweave_tx
- status
- timestamps
- wallet addresses
- signatures

Deliverables:

- Prisma schema
- Migration scripts
- Seed data

---

---

# VALIDATOR BACKEND

---

## TASK D-5 — Wallet Authentication

### Goals
- Validators authenticate via Ethereum wallet
- JWT issued after signature verification

### Implementation

- nonce challenge
- ethers.verifyMessage
- JWT generation

Expose:

```

POST /auth/nonce
POST /auth/login

```

Deliverables:

- Wallet login flow
- JWT middleware
- Supabase records created

---

---

## TASK D-6 — Validator APIs

### Goals
- Fetch metadata
- Download encrypted file
- Submit verdict
- Sign verification

Expose:

```

GET  /validator/evidence/:id
GET  /validator/download/:id
POST /validator/vote
POST /validator/sign

```

Deliverables:

- Auth protected routes
- Vote stored
- Signature verified
- Custody event emitted

---

---

# MULTI-PARTY WORKFLOW ENGINE

---

## TASK D-7 — Workflow State Machine

### States

```

SUBMITTED
ASSIGNED
UNDER_REVIEW
VERIFIED
REJECTED
DISCLOSED

```

### Implementation

- FSM module
- Threshold based approval
- Validator assignment logic

Expose:

```

POST /workflow/assign
POST /workflow/finalize

```

Deliverables:

- Deterministic transitions
- Consensus enforcement
- DB synced

---

---

# SELECTIVE DISCLOSURE SYSTEM

---

## TASK D-8 — Recipient Key Management

### Goals
- Encrypt AES key per recipient
- TTL based access
- Revocable permissions

Implementation:

- libsodium sealed box
- Upstash Redis TTL
- token issuance

Expose:

```

POST /disclosure/grant
GET  /disclosure/key/:token

```

Deliverables:

- Time-limited keys
- Revocation
- Audit trail entries

---

---

# BLOCKCHAIN EVENT INGESTION

---

## TASK D-9 — Custody Indexer

### Goals
- Listen to smart contract events
- Persist custody events
- Sync blockchain history

Implementation:

- ethers.js
- Alchemy RPC
- polling + websocket

Deliverables:

- Indexed events
- Stored timestamps
- Cross-referenced with DB

---

---

# AUDIT REPORT ENGINE

---

## TASK D-10 — Legal PDF Generator

### Goals
- Generate court-ready audit packets
- Include cryptographic proofs
- Embed QR links

Implementation:

- Handlebars HTML templates
- Playwright PDF render
- QR generator
- Timestamp headers

Expose:

```

GET /audit/:evidenceId/pdf

```

Deliverables:

- PDF file
- Blockchain refs
- Validator signatures
- Custody timeline

---

---

# KEY MANAGEMENT & SECURITY

---

## TASK D-11 — Secrets & TTL Handling

### Goals
- No plaintext key storage
- Auto expiration
- Secure deletion

Implementation:

- Redis TTL
- Memory wiping
- Env secrets only

Deliverables:

- Secure key lifecycle
- Zero retention logs

---

---

# OBSERVABILITY & HARDENING

---

## TASK D-12 — Logging & Monitoring

### Goals
- Tamper-evident logs
- No IP storage
- PII redaction

Implementation:

- Pino logger
- structured logs
- redaction rules

Deliverables:

- Safe logs
- Debug traces
- Auditability

---

---

# FINAL INTEGRATION TASK

---

## TASK D-13 — End-to-End Pipeline

### Flow

Submission →
Encrypted →
IPFS →
Bundlr →
Blockchain Register →
Validator Assignment →
Consensus →
Selective Disclosure →
Audit PDF

### Goals

- One API call triggers pipeline
- Deterministic results
- Failure recovery

Deliverables:

- Fully wired backend
- Demo evidence
- Sample audit PDF
- Test validators
- Proof screenshots

---

---

# OUTPUT REQUIREMENTS

System must produce:

- IPFS CID
- Bundlr Tx ID
- Blockchain Tx hash
- Validator signatures
- Custody ledger
- Audit PDF

---

---

# SUCCESS CRITERIA

- No plaintext stored
- Evidence immutable
- Validators multi-sig enforced
- PDFs reproducible
- APIs documented
- Cloud deployable
- Free-tier compliant

---

---

END OF FILE
```
