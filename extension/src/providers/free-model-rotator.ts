/**
 * OmniForge Free Model Rotator
 * Manages the ranked list of free/local models and rotates automatically
 * on rate-limit (429) or server errors (5xx).
 */
import type { FreeModelEntry, FreeModelState, ProviderID, ModelCapability } from '../types/index.js';
import { rateLimiter } from './rate-limiter.js';

// -------------------------------------------------------------------------
// Tiered free model list (July 2026)
// -------------------------------------------------------------------------
const FREE_MODEL_LIST: FreeModelEntry[] = [
  // Tier 1 — most powerful
  { modelId: 'nvidia/nemotron-3-ultra-550b',        providerId: 'nvidia',      tier: 1, available: true, failCount: 0 },
  { modelId: 'qwen/qwen3-coder-480b:free',          providerId: 'openrouter',  tier: 1, available: true, failCount: 0 },
  { modelId: 'openai/gpt-oss-120b:free',            providerId: 'openrouter',  tier: 1, available: true, failCount: 0 },
  // Tier 2 — fast
  { modelId: 'poolside/laguna-s-2.1:free',          providerId: 'openrouter',  tier: 2, available: true, failCount: 0 },
  { modelId: 'cohere/north-mini-code:free',         providerId: 'openrouter',  tier: 2, available: true, failCount: 0 },
  { modelId: 'google/gemma-4-31b:free',             providerId: 'openrouter',  tier: 2, available: true, failCount: 0 },
  // Tier 3 — fallback
  { modelId: 'nvidia/nemotron-super-120b',          providerId: 'nvidia',      tier: 3, available: true, failCount: 0 },
  { modelId: 'nvidia/nemotron-nano-30b',            providerId: 'nvidia',      tier: 3, available: true, failCount: 0 },
  { modelId: 'poolside/laguna-xs-2.1:free',         providerId: 'openrouter',  tier: 3, available: true, failCount: 0 },
  { modelId: 'qwen/qwen3-next-80b:free',            providerId: 'openrouter',  tier: 3, available: true, failCount: 0 },
  { modelId: 'google/gemma-4-26b-moe:free',         providerId: 'openrouter',  tier: 3, available: true, failCount: 0 },
  { modelId: 'meta-llama/llama-3.3-70b:free',       providerId: 'openrouter',  tier: 3, available: true, failCount: 0 },
  { modelId: 'llama-4-400b-preview',                providerId: 'groq',        tier: 3, available: true, failCount: 0 },
  { modelId: 'llama-4-400b',                        providerId: 'cerebras',    tier: 3, available: true, failCount: 0 },
  // Tier 4 — local
  { modelId: 'llama3.3',                            providerId: 'ollama',      tier: 4, available: true, failCount: 0 },
  { modelId: 'qwen3:8b',                            providerId: 'ollama',      tier: 4, available: true, failCount: 0 },
  { modelId: 'local-model',                         providerId: 'lmstudio',    tier: 4, available: true, failCount: 0 },
];

const FAIL_COOLDOWN_MS = 5 * 60 * 1_000; // 5 minutes before retrying a failed model
const MAX_FAIL_BEFORE_DISABLE = 3;

export class FreeModelRotator {
  private state: FreeModelState = {
    currentIndex: 0,
    models: FREE_MODEL_LIST.map((m) => ({ ...m })),
    lastRotation: Date.now(),
  };

  private listeners: Array<(entry: FreeModelEntry) => void> = [];

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Get the current best available free model.
   * Optionally filter by required capability.
   */
  getCurrent(capability?: ModelCapability): FreeModelEntry | null {
    const available = this.getAvailable(capability);
    return available[0] ?? null;
  }

  /**
   * Advance to the next model (called on 429 or 5xx).
   */
  rotate(failedModelId?: string): FreeModelEntry | null {
    if (failedModelId) {
      this.recordFailure(failedModelId);
    }

    const available = this.getAvailable();
    if (available.length === 0) {
      this.resetCooldowns();
      return this.getAvailable()[0] ?? null;
    }

    // Move past the failed model
    const currentEntry = this.state.models[this.state.currentIndex];
    if (currentEntry && failedModelId && currentEntry.modelId === failedModelId) {
      const nextIdx = available.findIndex((e) => e.modelId !== failedModelId);
      if (nextIdx !== -1) {
        const nextEntry = available[nextIdx];
        if (nextEntry) {
          this.state.currentIndex = this.state.models.indexOf(nextEntry);
          this.state.lastRotation = Date.now();
          this.emit(nextEntry);
          return nextEntry;
        }
      }
    }

    const next = available[0];
    if (next) {
      this.state.currentIndex = this.state.models.indexOf(next);
      this.state.lastRotation = Date.now();
      this.emit(next);
    }
    return next ?? null;
  }

  /** Mark a model as failing (rate-limited or server error). */
  recordFailure(modelId: string): void {
    const entry = this.state.models.find((m) => m.modelId === modelId);
    if (!entry) return;
    entry.failCount++;
    entry.lastFailTime = Date.now();
    if (entry.failCount >= MAX_FAIL_BEFORE_DISABLE) {
      entry.available = false;
    }
  }

  /** Mark a model as working again. */
  recordSuccess(modelId: string): void {
    const entry = this.state.models.find((m) => m.modelId === modelId);
    if (!entry) return;
    entry.failCount = 0;
    entry.available = true;
    entry.lastFailTime = undefined;
  }

  getState(): FreeModelState {
    return { ...this.state, models: this.state.models.map((m) => ({ ...m })) };
  }

  onRotation(cb: (entry: FreeModelEntry) => void): () => void {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter((l) => l !== cb); };
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private getAvailable(capability?: ModelCapability): FreeModelEntry[] {
    const now = Date.now();
    return this.state.models
      .filter((m) => {
        if (!m.available) {
          // Check if cooldown expired
          if (m.lastFailTime && now - m.lastFailTime > FAIL_COOLDOWN_MS) {
            m.available = true;
            m.failCount = 0;
          } else {
            return false;
          }
        }
        if (rateLimiter.isLimited(m.providerId as ProviderID, m.modelId)) return false;
        return true;
      })
      .sort((a, b) => a.tier - b.tier);
  }

  private resetCooldowns(): void {
    for (const m of this.state.models) {
      m.available = true;
      m.failCount = 0;
      m.lastFailTime = undefined;
    }
  }

  private emit(entry: FreeModelEntry): void {
    for (const cb of this.listeners) cb(entry);
  }
}

export const freeModelRotator = new FreeModelRotator();
