import crypto from 'crypto';
import NodeCache from 'node-cache';
import { StagedEvidence, StagingConfig, EvidenceHash } from '../types';
import { logger } from '../utils/logger';

export class EncryptedStaging {
  private cache: NodeCache;
  private config: StagingConfig;
  private masterKey: Buffer;

  constructor(config?: Partial<StagingConfig>) {
    this.config = {
      ttlSeconds: config?.ttlSeconds || 300,
      maxAccessCount: config?.maxAccessCount || 3,
      encryptionAlgorithm: config?.encryptionAlgorithm || 'aes-256-gcm',
      keyDerivationIterations: config?.keyDerivationIterations || 100000
    };

    this.cache = new NodeCache({
      stdTTL: this.config.ttlSeconds,
      checkperiod: 60,
      useClones: false,
      deleteOnExpire: true
    });

    this.masterKey = crypto.randomBytes(32);

    this.cache.on('expired', (key: string, value: StagedEvidence) => {
      logger.info(`Staged evidence expired and deleted: ${key}`);
      this.secureDelete(value);
    });

    logger.info('Encrypted staging initialized');
  }

  async stageEvidence(cleanBuffer: Buffer, evidenceHash: EvidenceHash): Promise<StagedEvidence> {
    const stageId = this.generateStageId();
    logger.info(`Staging evidence: ${stageId}`);

    const { encryptedBuffer, iv, authTag } = this.encrypt(cleanBuffer, stageId);

    const stagedEvidence: StagedEvidence = {
      stageId, encryptedBuffer, iv, authTag, evidenceHash,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.ttlSeconds * 1000),
      accessCount: 0,
      maxAccess: this.config.maxAccessCount
    };

    this.cache.set(stageId, stagedEvidence);

    logger.info(`Evidence staged successfully: ${stageId}, expires in ${this.config.ttlSeconds}s`);

    return stagedEvidence;
  }

  retrieveEvidence(stageId: string): Buffer | null {
    const staged = this.cache.get<StagedEvidence>(stageId);
    if (!staged) {
      logger.warn(`Staged evidence not found: ${stageId}`);
      return null;
    }

    if (staged.accessCount >= staged.maxAccess) {
      logger.warn(`Access limit reached: ${stageId}`);
      this.deleteStaged(stageId);
      return null;
    }

    staged.accessCount++;
    this.cache.set(stageId, staged);

    const decrypted = this.decrypt(staged.encryptedBuffer, staged.iv, staged.authTag, stageId);
    logger.info(`Evidence retrieved: ${stageId}, access ${staged.accessCount}/${staged.maxAccess}`);
    return decrypted;
  }

  getStagedInfo(stageId: string): Omit<StagedEvidence, 'encryptedBuffer'> | null {
    const staged = this.cache.get<StagedEvidence>(stageId);
    if (!staged) return null;
    return {
      stageId: staged.stageId, iv: staged.iv, authTag: staged.authTag, evidenceHash: staged.evidenceHash,
      createdAt: staged.createdAt, expiresAt: staged.expiresAt, accessCount: staged.accessCount, maxAccess: staged.maxAccess
    } as Omit<StagedEvidence, 'encryptedBuffer'>;
  }

  deleteStaged(stageId: string): boolean {
    const staged = this.cache.get<StagedEvidence>(stageId);
    if (staged) this.secureDelete(staged);
    return this.cache.del(stageId) > 0;
  }

  private encrypt(buffer: Buffer, stageId: string): { encryptedBuffer: Buffer; iv: string; authTag: string } {
    const key = this.deriveKey(stageId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { encryptedBuffer: encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
  }

  private decrypt(encryptedBuffer: Buffer, ivHex: string, authTagHex: string, stageId: string): Buffer {
    const key = this.deriveKey(stageId);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  }

  private deriveKey(stageId: string): Buffer {
    return crypto.pbkdf2Sync(this.masterKey, stageId, this.config.keyDerivationIterations, 32, 'sha256');
  }

  private generateStageId(): string {
    return `stage_${Date.now().toString(36)}_${crypto.randomBytes(12).toString('hex')}`;
  }

  private secureDelete(staged: StagedEvidence): void {
    crypto.randomFillSync(staged.encryptedBuffer);
    staged.encryptedBuffer = Buffer.alloc(0);
    staged.iv = '';
    staged.authTag = '';
  }

  getStats(): { activeStages: number; totalKeys: number; memoryUsage: number } {
    const keys = this.cache.keys();
    let memoryUsage = 0;

    keys.forEach(key => {
      const staged = this.cache.get<StagedEvidence>(key);
      if (staged) {
        memoryUsage += staged.encryptedBuffer.length;
      }
    });

    return { activeStages: keys.length, totalKeys: keys.length, memoryUsage };
  }

  cleanup(): void {
    logger.info('Cleaning up staged evidence');
    const keys = this.cache.keys();
    keys.forEach(key => {
      const staged = this.cache.get<StagedEvidence>(key);
      if (staged) this.secureDelete(staged);
    });
    this.cache.flushAll();
    crypto.randomFillSync(this.masterKey);
    logger.info('Staging cleanup complete');
  }
}

export const encryptedStaging = new EncryptedStaging({ ttlSeconds: 300, maxAccessCount: 3 });
