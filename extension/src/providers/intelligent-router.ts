/**
 * Zolttran Intelligent Router
 * Maps task capabilities to the best available model.
 */
import type {
  ProviderID,
  ModelCapability,
  CompletionRequest,
  ChatMessage,
  ToolDefinition,
} from '../types/index.js';
import { getProvider, getModelSpec } from './provider-registry.js';
import { rateLimiter } from './rate-limiter.js';
import { freeModelRotator } from './free-model-rotator.js';

interface ModelPreference {
  providerId: ProviderID;
  modelId: string;
}

const TASK_MODEL_MAP: Record<ModelCapability, ModelPreference[]> = {
  'code-generation': [
    { providerId: 'anthropic',  modelId: 'claude-sonnet-4-5-20260201' },
    { providerId: 'deepseek',   modelId: 'deepseek-coder-v3' },
    { providerId: 'openrouter', modelId: 'qwen/qwen3-coder-480b:free' },
    { providerId: 'openrouter', modelId: 'poolside/laguna-s-2.1:free' },
  ],
  'game-design': [
    { providerId: 'anthropic',  modelId: 'claude-opus-4-8-20260201' },
    { providerId: 'google',     modelId: 'gemini-3-pro' },
    { providerId: 'openai',     modelId: 'gpt-5.5' },
    { providerId: 'openrouter', modelId: 'nvidia/nemotron-3-ultra-550b:free' },
  ],
  '3d-modeling': [
    { providerId: 'google',     modelId: 'gemini-3-pro' },
    { providerId: 'anthropic',  modelId: 'claude-sonnet-4-5-20260201' },
    { providerId: 'openrouter', modelId: 'google/gemma-4-31b:free' },
  ],
  'debugging': [
    { providerId: 'anthropic',  modelId: 'claude-sonnet-4-5-20260201' },
    { providerId: 'deepseek',   modelId: 'deepseek-v4-pro' },
    { providerId: 'openrouter', modelId: 'qwen/qwen3-coder-480b:free' },
  ],
  'asset-generation': [
    { providerId: 'google',     modelId: 'gemini-3-pro' },
    { providerId: 'nvidia',     modelId: 'nvidia/nemotron-omni-7b' },
    { providerId: 'openrouter', modelId: 'google/gemma-4-31b:free' },
  ],
  'documentation': [
    { providerId: 'openrouter', modelId: 'openai/gpt-oss-120b:free' },
    { providerId: 'openrouter', modelId: 'google/gemma-4-31b:free' },
    { providerId: 'nvidia',     modelId: 'nvidia/nemotron-nano-30b' },
  ],
  'reasoning': [
    { providerId: 'anthropic',  modelId: 'claude-opus-4-8-20260201' },
    { providerId: 'openai',     modelId: 'gpt-5.5' },
    { providerId: 'openrouter', modelId: 'nvidia/nemotron-3-ultra-550b:free' },
  ],
  'multimodal': [
    { providerId: 'google',     modelId: 'gemini-3-pro' },
    { providerId: 'openrouter', modelId: 'google/gemma-4-31b:free' },
  ],
  'fast': [
    { providerId: 'groq',       modelId: 'llama-4-400b-preview' },
    { providerId: 'cerebras',   modelId: 'llama-4-400b' },
    { providerId: 'openrouter', modelId: 'poolside/laguna-s-2.1:free' },
    { providerId: 'anthropic',  modelId: 'claude-haiku-4-0-20260201' },
  ],
};

export interface RouteResult {
  providerId: ProviderID;
  modelId: string;
  reason: string;
}

export class IntelligentRouter {
  private freeMode = true;
  private apiKeys: Partial<Record<ProviderID, string>> = {};

  setFreeMode(enabled: boolean): void {
    this.freeMode = enabled;
  }

  setApiKey(providerId: ProviderID, key: string): void {
    this.apiKeys[providerId] = key;
  }

  hasApiKey(providerId: ProviderID): boolean {
    const provider = getProvider(providerId);
    if (!provider) return false;
    if (provider.authType === 'none') return true;
    return Boolean(this.apiKeys[providerId]);
  }

  route(
    capability: ModelCapability,
    forceModel?: { providerId: ProviderID; modelId: string },
  ): RouteResult {
    if (forceModel) {
      return { ...forceModel, reason: 'user-override' };
    }

    if (this.freeMode) {
      const entry = freeModelRotator.getCurrent(capability);
      if (entry) {
        return {
          providerId: entry.providerId as ProviderID,
          modelId: entry.modelId,
          reason: `free-mode tier-${entry.tier}`,
        };
      }
    }

    const prefs = TASK_MODEL_MAP[capability] ?? TASK_MODEL_MAP['code-generation'] ?? [];
    for (const pref of prefs) {
      if (!this.hasApiKey(pref.providerId)) continue;
      if (rateLimiter.isLimited(pref.providerId, pref.modelId)) continue;
      const spec = getModelSpec(pref.providerId, pref.modelId);
      if (!spec) continue;
      if (this.freeMode && spec.tier === 'premium') continue;
      return { ...pref, reason: `capability-match:${capability}` };
    }

    // Always-available local fallback
    return { providerId: 'ollama', modelId: 'llama3.3', reason: 'local-fallback' };
  }

  resolveRequest(
    partial: Omit<CompletionRequest, 'providerId' | 'model'> & {
      capability?: ModelCapability;
      preferredProvider?: ProviderID;
      preferredModel?: string;
      messages: ChatMessage[];
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      tools?: ToolDefinition[];
    },
  ): CompletionRequest {
    const forceModel =
      partial.preferredProvider && partial.preferredModel
        ? { providerId: partial.preferredProvider, modelId: partial.preferredModel }
        : undefined;

    const route = this.route(partial.capability ?? 'code-generation', forceModel);

    return {
      messages: partial.messages,
      model: route.modelId,
      providerId: route.providerId,
      temperature: partial.temperature ?? 0.7,
      maxTokens: partial.maxTokens,
      stream: partial.stream ?? true,
      tools: partial.tools,
      systemPrompt: partial.systemPrompt,
    };
  }
}

export const intelligentRouter = new IntelligentRouter();
