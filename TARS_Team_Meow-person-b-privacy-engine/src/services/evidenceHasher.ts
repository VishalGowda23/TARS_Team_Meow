import crypto from 'crypto';
import { EvidenceHash, HashVerificationResult, HashAlgorithm } from '../types';
import { logger } from '../utils/logger';

export class EvidenceHasher {
  
  generateHash(cleanBuffer: Buffer): EvidenceHash {
    const timestamp = new Date();
    logger.info(`Generating hash for ${cleanBuffer.length} bytes`);

    const sha256 = this.computeSHA256(cleanBuffer);
    const sha512 = this.computeSHA512(cleanBuffer);
    const md5 = this.computeMD5(cleanBuffer);

    const evidenceHash: EvidenceHash = { sha256, sha512, md5, timestamp, fileSize: cleanBuffer.length };
    logger.info(`Hash generated: ${sha256.substring(0, 16)}...`);
    return evidenceHash;
  }

  private computeSHA256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private computeSHA512(buffer: Buffer): string {
    return crypto.createHash('sha512').update(buffer).digest('hex');
  }

  private computeMD5(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  verifyHash(
    buffer: Buffer,
    expectedHash: string,
    algorithm: HashAlgorithm = 'sha256'
  ): HashVerificationResult {
    let computedHash: string;

    switch (algorithm) {
      case 'sha256':
        computedHash = this.computeSHA256(buffer);
        break;
      case 'sha512':
        computedHash = this.computeSHA512(buffer);
        break;
      case 'md5':
        computedHash = this.computeMD5(buffer);
        break;
      default:
        throw new Error(`Unsupported hash algorithm: ${algorithm}`);
    }

    const isValid = computedHash === expectedHash.toLowerCase();

    logger.info(`Hash verification: ${isValid ? 'VALID' : 'INVALID'}`);

    return { isValid, computedHash, expectedHash: expectedHash.toLowerCase(), algorithm, verifiedAt: new Date() };
  }

  generateTimestampedHash(cleanBuffer: Buffer, timestamp: Date): string {
    const contentHash = this.computeSHA256(cleanBuffer);
    const combined = `${contentHash}:${timestamp.toISOString()}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  generateMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) throw new Error('Empty hash list');
    if (hashes.length === 1) return hashes[0];

    let currentLevel = [...hashes];
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        nextLevel.push(crypto.createHash('sha256').update(left + right).digest('hex'));
      }
      currentLevel = nextLevel;
    }
    return currentLevel[0];
  }

  createHashChainLink(currentHash: string, previousHash: string | null, timestamp: Date): string {
    const chainData = { current: currentHash, previous: previousHash || 'GENESIS', timestamp: timestamp.toISOString() };
    return crypto.createHash('sha256').update(JSON.stringify(chainData)).digest('hex');
  }

  formatHash(hash: string, truncate: boolean = false): string {
    return truncate ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` : hash;
  }

  isValidHashFormat(hash: string, algorithm: HashAlgorithm = 'sha256'): boolean {
    const lengths: Record<string, number> = { sha256: 64, sha512: 128, md5: 32, blake3: 64 };
    return hash.length === lengths[algorithm] && /^[a-fA-F0-9]+$/.test(hash);
  }
}

export const evidenceHasher = new EvidenceHasher();
