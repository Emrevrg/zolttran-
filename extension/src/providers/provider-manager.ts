/**
 * Zolttran Provider Manager
 * Central entry point for all AI completions.
 * Handles adapter selection, rate limiting, retries, and cost tracking.
 */
import type {
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  ProviderID,
  ModelCapability,
} from '../types/index.js';
import { getProvider, getModelSpec } from './provider-registry.js';
import { rateLimiter } from './rate-limiter.js';
import { freeModelRotator } from './free-model-rotator.js';
import { intelligentRouter } from './intelligent-router.js';
import type { BaseAdapter, AdapterCredentials } from './adapters/base-adapter.js';
import { OpenAIAdapter } from './adapters/openai-adapter.js';
import { AnthropicAdapter } from './adapters/anthropic-adapter.js';
import { GoogleAdapter } from './adapters/google-adapter.js';
import { OllamaAdapter } from './adapters/ollama-adapter.js';
import { NvidiaAdapter } from './adapters/nvidia-adapter.js';
import { OpenRouterAdapter } from './adapters/openrouter-adapter.js';
import { CustomAdapter } from './adapters/custom-adapter.js';

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

function createAdapter(providerId: ProviderID, creds: AdapterCredentials): BaseAdapter {
  switch (providerId) {
    case 'anthropic':  return new AnthropicAdapter(creds);
    case 'google':     return new GoogleAdapter(creds);
    case 'nvidia':     return new NvidiaAdapter(creds);
    case 'openrouter': return new OpenRouterAdapter(creds);
    case 'ollama':     return new OllamaAdapter(creds);
    case 'lmstudio':   return new OllamaAdapter(creds, 'http://localhost:1234/v1');
    case 'custom':     return new CustomAdapter(creds);
    default: {
      const provider = getProvider(providerId);
      return new OpenAIAdapter(creds, provider?.baseUrl ?? 'http://localhost:8000/v1');
    }
  }
}

// ---------------------------------------------------------------------------
// Provider Manager
// ---------------------------------------------------------------------------

export class ProviderManager {
  private apiKeys = new Map<ProviderID, string>();
  private customBaseUrls = new Map<ProviderID, string>();
  private totalCostUsd = 0;
  private dailyCostUsd = 0;
  private costResetDate = new Date().toDateString();
  // Expose projectPath as a readable property for extension.ts
  public projectPath = '';

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  setApiKey(providerId: ProviderID, key: string): void {
    this.apiKeys.set(providerId, key);
    intelligentRouter.setApiKey(providerId, key);
  }

  getApiKey(providerId: ProviderID): string | undefined {
    return this.apiKeys.get(providerId);
  }

  setCustomBaseUrl(providerId: ProviderID, url: string): void {
    this.customBaseUrls.set(providerId, url);
  }

  setFreeMode(enabled: boolean): void {
    intelligentRouter.setFreeMode(enabled);
  }

  // -----------------------------------------------------------------------
  // Test provider connectivity
  // -----------------------------------------------------------------------

  async testProvider(providerId: ProviderID): Promise<{ ok: boolean; error?: string }> {
    try {
      const provider = getProvider(providerId);
      if (!provider) return { ok: false, error: 'Provider not found' };
      if (provider.authType !== 'none' && !this.apiKeys.has(providerId)) {
        return { ok: false, error: 'No API key configured' };
      }

      const firstModel = provider.models[0];
      if (!firstModel) return { ok: false, error: 'No models registered' };

      const request: CompletionRequest = {
        messages: [{ id: '1', role: 'user', content: 'Hi', timestamp: Date.now() }],
        model: firstModel.id,
        providerId,
        maxTokens: 5,
        stream: false,
      };
      await this.complete(request);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  // -----------------------------------------------------------------------
  // Core completion
  // -----------------------------------------------------------------------

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const creds = this.buildCredentials(request.providerId);
    const adapter = createAdapter(request.providerId, creds);

    if (!rateLimiter.canProceed(request.providerId, request.model)) {
      const next = freeModelRotator.rotate(request.model);
      if (next) {
        request.providerId = next.providerId as ProviderID;
        request.model = next.modelId;
        return this.complete(request);
      }
      throw new Error(`Rate limited on ${request.providerId}/${request.model} — no fallback available.`);
    }

    try {
      const response = await adapter.complete(request);
      this.recordUsage(request.providerId, request.model, response.usage.totalTokens);
      this.enrichCost(response, request.providerId);
      freeModelRotator.recordSuccess(request.model);
      return response;
    } catch (err) {
      const msg = String(err);
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        rateLimiter.markLimited(request.providerId, request.model, 60);
        freeModelRotator.recordFailure(request.model);
      }
      throw err;
    }
  }

  async *stream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
    const creds = this.buildCredentials(request.providerId);
    const adapter = createAdapter(request.providerId, creds);

    if (!rateLimiter.canProceed(request.providerId, request.model)) {
      const next = freeModelRotator.rotate(request.model);
      if (next) {
        request.providerId = next.providerId as ProviderID;
        request.model = next.modelId;
        yield* this.stream(request);
        return;
      }
      yield { type: 'error', error: 'Rate limited — no fallback available.' };
      return;
    }

    try {
      for await (const chunk of adapter.stream(request)) {
        if (chunk.type === 'done') {
          this.recordUsage(request.providerId, request.model, chunk.usage.totalTokens);
          freeModelRotator.recordSuccess(request.model);
        }
        if (chunk.type === 'error') {
          const msg = chunk.error;
          if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
            rateLimiter.markLimited(request.providerId, request.model, 60);
            freeModelRotator.recordFailure(request.model);
          }
        }
        yield chunk;
      }
    } catch (err) {
      const msg = String(err);
      if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
        rateLimiter.markLimited(request.providerId, request.model, 60);
        freeModelRotator.recordFailure(request.model);
      }
      yield { type: 'error', error: msg };
    }
  }

  // -----------------------------------------------------------------------
  // Cost tracking
  // -----------------------------------------------------------------------

  getCostToday(): number {
    this.resetDailyCostIfNeeded();
    return this.dailyCostUsd;
  }

  getCostTotal(): number {
    return this.totalCostUsd;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private buildCredentials(providerId: ProviderID): AdapterCredentials {
    return {
      apiKey: this.apiKeys.get(providerId),
      baseUrl: this.customBaseUrls.get(providerId),
    };
  }

  private recordUsage(providerId: ProviderID, modelId: string, tokens: number): void {
    rateLimiter.recordRequest(providerId, modelId, tokens);
  }

  private enrichCost(response: CompletionResponse, providerId: ProviderID): void {
    const spec = getModelSpec(providerId, response.model);
    if (!spec) return;
    const cost =
      (response.usage.promptTokens / 1_000_000) * spec.costInput +
      (response.usage.completionTokens / 1_000_000) * spec.costOutput;
    response.usage.estimatedCostUsd = cost;
    this.resetDailyCostIfNeeded();
    this.dailyCostUsd += cost;
    this.totalCostUsd += cost;
  }

  private resetDailyCostIfNeeded(): void {
    const today = new Date().toDateString();
    if (today !== this.costResetDate) {
      this.dailyCostUsd = 0;
      this.costResetDate = today;
    }
  }
}

export const providerManager = new ProviderManager();
