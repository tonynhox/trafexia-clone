import type { MockRule } from '../../../shared/types';
import type { TrafficStorage } from './TrafficStorage';
import { randomUUID } from 'crypto';

export class MockService {
  private rules: Map<string, MockRule> = new Map();
  private storage: TrafficStorage;

  constructor(storage: TrafficStorage) {
    this.storage = storage;
  }

  /**
   * Load rules from database
   */
  async loadRules(): Promise<void> {
    try {
      const savedRules = this.storage.getMockRules();
      this.rules.clear();
      for (const rule of savedRules) {
        this.rules.set(rule.id, rule);
      }
      console.log(`[MockService] Loaded ${savedRules.length} mock rules from database`);
    } catch (error) {
      console.error('[MockService] Failed to load rules:', error);
    }
  }

  /**
   * Get all mock rules
   */
  getRules(): MockRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Add a new mock rule
   */
  addRule(rule: Omit<MockRule, 'id'>): MockRule {
    const id = randomUUID();
    const newRule: MockRule = { ...rule, id };
    this.rules.set(id, newRule);
    
    // Save to database
    try {
      this.storage.saveMockRule(newRule);
    } catch (error) {
      console.error('[MockService] Failed to save rule to database:', error);
    }
    
    return newRule;
  }

  /**
   * Update an existing rule
   */
  updateRule(id: string, updates: Partial<MockRule>): void {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error(`Mock rule not found: ${id}`);
    }
    const updated = { ...rule, ...updates, id }; // Keep ID unchanged
    this.rules.set(id, updated);
    
    // Save to database
    try {
      this.storage.saveMockRule(updated);
    } catch (error) {
      console.error('[MockService] Failed to update rule in database:', error);
    }
  }

  /**
   * Delete a rule
   */
  deleteRule(id: string): void {
    if (!this.rules.delete(id)) {
      throw new Error(`Mock rule not found: ${id}`);
    }
    
    // Delete from database
    try {
      this.storage.deleteMockRule(id);
    } catch (error) {
      console.error('[MockService] Failed to delete rule from database:', error);
    }
  }

  /**
   * Toggle rule enabled state
   */
  toggleRule(id: string, enabled: boolean): void {
    this.updateRule(id, { enabled });
  }

  /**
   * Check if a request matches any enabled mock rule
   * Returns the matching rule or null
   */
  findMatchingRule(method: string, url: string): MockRule | null {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check method filter (if specified)
      if (rule.method && rule.method !== method) {
        continue;
      }

      // Check URL pattern
      try {
        const regex = new RegExp(rule.urlPattern, 'i');
        if (regex.test(url)) {
          return rule;
        }
      } catch (error) {
        console.error(`[MockService] Invalid regex pattern: ${rule.urlPattern}`, error);
      }
    }

    return null;
  }

  /**
   * Generate mock response for a matched rule
   */
  generateMockResponse(rule: MockRule): {
    status: number;
    headers: Record<string, string>;
    body: string;
  } {
    return {
      status: rule.responseStatus,
      headers: { ...rule.responseHeaders },
      body: rule.responseBody,
    };
  }

  /**
   * Clear all rules
   */
  clearAll(): void {
    this.rules.clear();
  }
}
