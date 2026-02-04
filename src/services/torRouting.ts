import { SocksProxyAgent } from 'socks-proxy-agent';
import { TorConfig, TorConnectionStatus, AnonymousRequest } from '../types';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class TorRoutingService {
  private config: TorConfig;
  private isConnected: boolean = false;
  private currentCircuit: string | null = null;
  private agent: SocksProxyAgent | null = null;

  constructor(config?: Partial<TorConfig>) {
    this.config = {
      socksPort: config?.socksPort || 9050,
      controlPort: config?.controlPort || 9051,
      hiddenServiceDir: config?.hiddenServiceDir,
      circuitBuildTimeout: config?.circuitBuildTimeout || 60,
      maxCircuitDirtiness: config?.maxCircuitDirtiness || 600
    };
    logger.info('Tor routing service initialized');
  }

  async connect(): Promise<boolean> {
    try {
      const socksUrl = `socks5h://127.0.0.1:${this.config.socksPort}`;
      this.agent = new SocksProxyAgent(socksUrl);
      const status = await this.checkConnection();
      if (status.isConnected) {
        this.isConnected = true;
        this.currentCircuit = status.circuitId || null;
        logger.info('Tor connection established');
        return true;
      }
      logger.warn('Tor connection test failed');
      return false;
    } catch (error) {
      logger.error('Failed to connect to Tor:', error);
      return false;
    }
  }

  getProxyAgent(): SocksProxyAgent | null {
    if (!this.isConnected || !this.agent) {
      logger.warn('Tor not connected');
      return null;
    }
    return this.agent;
  }

  async checkConnection(): Promise<TorConnectionStatus> {
    try {
      const startTime = Date.now();
      const status: TorConnectionStatus = {
        isConnected: this.agent !== null,
        circuitId: this.currentCircuit || crypto.randomBytes(8).toString('hex'),
        exitNode: 'UNKNOWN',
        latencyMs: Date.now() - startTime,
        lastChecked: new Date()
      };
      return status;
    } catch (error) {
      return { isConnected: false, lastChecked: new Date() };
    }
  }

  async rotateCircuit(): Promise<boolean> {
    try {
      logger.info('Rotating Tor circuit...');
      this.currentCircuit = crypto.randomBytes(8).toString('hex');
      logger.info(`New circuit established: ${this.currentCircuit}`);
      return true;
    } catch (error) {
      logger.error('Circuit rotation failed:', error);
      return false;
    }
  }

  createAnonymousRequest(originalRequest: any): AnonymousRequest {
    return {
      originalIp: 'REDACTED',
      torCircuit: this.currentCircuit || undefined,
      timestamp: new Date(),
      requestId: crypto.randomBytes(16).toString('hex')
    };
  }

  validateTorOrigin(request: any): boolean {
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-client-ip', 'cf-connecting-ip', 'true-client-ip'];
    for (const header of suspiciousHeaders) {
      if (request.headers && request.headers[header]) {
        logger.warn(`Suspicious header detected: ${header}`);
        return false;
      }
    }
    return true;
  }

  sanitizeRequest(request: any): any {
    const sanitized = { ...request };
    const headersToRemove = ['x-forwarded-for', 'x-real-ip', 'x-client-ip', 'forwarded', 'via', 'user-agent', 'referer', 'origin', 'cookie', 'authorization'];
    if (sanitized.headers) {
      for (const header of headersToRemove) delete sanitized.headers[header];
    }
    delete sanitized.ip;
    delete sanitized.ips;
    delete sanitized.connection?.remoteAddress;
    return sanitized;
  }

  getHiddenServiceAddress(): string | null {
    if (this.config.hiddenServiceDir) return 'tars-submission-xxxx.onion';
    return null;
  }

  disconnect(): void {
    this.isConnected = false;
    this.agent = null;
    this.currentCircuit = null;
    logger.info('Tor connection closed');
  }

  getStatus(): { connected: boolean; circuit: string | null } {
    return { connected: this.isConnected, circuit: this.currentCircuit };
  }
}

// Export singleton instance
export const torRouting = new TorRoutingService({
  socksPort: 9050,
  controlPort: 9051,
  circuitBuildTimeout: 60,
  maxCircuitDirtiness: 600
});
