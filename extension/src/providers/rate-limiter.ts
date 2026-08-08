/**
 * Token-bucket rate limiter per provider + model.
 */
import type { ProviderID, RateLimitState } from '../types/index.js';
import { getProvider } from './provider-registry.js';

export class RateLimiter {
  private states = new Map<string, RateLimitState>();

  private key(providerId: ProviderID, modelId: string): string {
    return `${providerId}::${modelId}`;
  }

  private getOrCreate(providerId: ProviderID, modelId: string): RateLimitState {
    const k = this.key(providerId, modelId);
    if (!this.states.has(k)) {
      this.states.set(k, {
        providerId,
        modelId,
        requestsThisMinute: 0,
        tokensThisMinute: 0,
        lastResetTime: Date.now(),
        isLimited: false,
      });
    }
    return this.states.get(k)!;
  }

  private resetIfNeeded(state: RateLimitState): void {
    const now = Date.now();
    if (now - state.lastResetTime >= 60_000) {
      state.requestsThisMinute = 0;
      state.tokensThisMinute = 0;
      state.lastResetTime = now;
      state.isLimited = false;
      state.retryAfter = undefined;
    }
  }

  /** Returns true if the request can proceed. */
  canProceed(providerId: ProviderID, modelId: string, estimatedTokens = 1000): boolean {
    const state = this.getOrCreate(providerId, modelId);
    this.resetIfNeeded(state);
    const provider = getProvider(providerId);
    const rpm = provider?.rateLimitRPM ?? 60;
    const tpm = provider?.rateLimitTPM ?? Infinity;
    return state.requestsThisMinute < rpm && state.tokensThisMinute + estimatedTokens < tpm;
  }

  /** Record a successful request. */
  recordRequest(providerId: ProviderID, modelId: string, tokensUsed: number): void {
    const state = this.getOrCreate(providerId, modelId);
    this.resetIfNeeded(state);
    state.requestsThisMinute++;
    state.tokensThisMinute += tokensUsed;
  }

  /** Mark a provider as rate-limited (HTTP 429). */
  markLimited(providerId: ProviderID, modelId: string, retryAfterSeconds = 60): void {
    const state = this.getOrCreate(providerId, modelId);
    state.isLimited = true;
    state.retryAfter = Date.now() + retryAfterSeconds * 1_000;
  }

  /** Check if currently rate-limited (respects retryAfter window). */
  isLimited(providerId: ProviderID, modelId: string): boolean {
    const state = this.getOrCreate(providerId, modelId);
    if (!state.isLimited) return false;
    if (state.retryAfter && Date.now() > state.retryAfter) {
      state.isLimited = false;
      state.retryAfter = undefined;
      return false;
    }
    return true;
  }

  getState(providerId: ProviderID, modelId: string): RateLimitState {
    return this.getOrCreate(providerId, modelId);
  }

  getAllStates(): RateLimitState[] {
    return Array.from(this.states.values());
  }

  /** Seconds until the rate limit resets for a provider/model. */
  secondsUntilReset(providerId: ProviderID, modelId: string): number {
    const state = this.getOrCreate(providerId, modelId);
    if (state.retryAfter) {
      return Math.max(0, Math.ceil((state.retryAfter - Date.now()) / 1000));
    }
    return Math.max(0, Math.ceil((state.lastResetTime + 60_000 - Date.now()) / 1000));
  }
}

export const rateLimiter = new RateLimiter();
