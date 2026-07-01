import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { BreakpointConfig, InterceptedRequest } from '../../../shared/types';

export class BreakpointService extends EventEmitter {
  private config: BreakpointConfig = {
    enabled: false,
    breakOnRequest: true,
    breakOnResponse: false,
  };

  private pendingRequests: Map<string, {
    resolve: (value: InterceptedRequest | null) => void;
    reject: (reason?: any) => void;
    intercepted: InterceptedRequest;
  }> = new Map();

  /**
   * Set breakpoint configuration
   */
  setConfig(config: BreakpointConfig): void {
    this.config = { ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): BreakpointConfig {
    return { ...this.config };
  }

  /**
   * Check if breakpoint should trigger for this request/response
   */
  shouldBreak(type: 'request' | 'response', _method: string, url: string): boolean {
    if (!this.config.enabled) return false;

    // Check type
    if (type === 'request' && !this.config.breakOnRequest) return false;
    if (type === 'response' && !this.config.breakOnResponse) return false;

    // Check URL pattern if specified
    if (this.config.urlPattern) {
      try {
        const regex = new RegExp(this.config.urlPattern, 'i');
        if (!regex.test(url)) return false;
      } catch (error) {
        console.error('[BreakpointService] Invalid regex pattern:', error);
        return false;
      }
    }

    return true;
  }

  /**
   * Pause execution at a breakpoint
   * Returns a promise that resolves when user continues/modifies
   */
  async pauseAtBreakpoint(
    type: 'request' | 'response',
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string | null,
    status?: number
  ): Promise<InterceptedRequest | null> {
    const id = randomUUID();
    const intercepted: InterceptedRequest = {
      id,
      type,
      timestamp: Date.now(),
      method,
      url,
      headers,
      body,
      status,
    };

    // Emit event to notify renderer
    this.emit('breakpoint:hit', intercepted);

    // Wait for user action
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject, intercepted });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          resolve(null); // Continue with original request
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Continue with (optionally modified) request/response
   */
  continue(id: string, modified?: InterceptedRequest): void {
    const pending = this.pendingRequests.get(id);
    if (pending) {
      this.pendingRequests.delete(id);
      pending.resolve(modified || pending.intercepted);
    }
  }

  /**
   * Drop/cancel the request
   */
  drop(id: string): void {
    const pending = this.pendingRequests.get(id);
    if (pending) {
      this.pendingRequests.delete(id);
      pending.reject(new Error('Request dropped by user'));
    }
  }

  /**
   * Get list of pending breakpoints
   */
  getPendingRequests(): InterceptedRequest[] {
    return Array.from(this.pendingRequests.values()).map(p => p.intercepted);
  }

  /**
   * Clear all pending requests (continue all)
   */
  clearPending(): void {
    for (const pending of this.pendingRequests.values()) {
      pending.resolve(pending.intercepted);
    }
    this.pendingRequests.clear();
  }
}
