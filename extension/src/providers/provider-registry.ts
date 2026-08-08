/**
 * OmniForge Provider Registry
 * Central registry of all 25+ AI providers and their models.
 */
import type { ProviderConfig, ModelSpec, ProviderID } from '../types/index.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function m(
  id: string,
  name: string,
  ctx: number,
  tier: ModelSpec['tier'],
  caps: ModelSpec['capabilities'],
  costIn = 0,
  costOut = 0,
  opts?: Partial<ModelSpec>,
): ModelSpec {
  return { id, name, contextWindow: ctx, tier, capabilities: caps, costInput: costIn, costOutput: costOut, ...opts };
}

// ---------------------------------------------------------------------------
// Model Collections
// ---------------------------------------------------------------------------

const OPENROUTER_MODELS: ModelSpec[] = [
  m('anthropic/claude-opus-4-8',       'Claude Opus 4.8',         200_000, 'premium', ['code-generation','game-design','reasoning','debugging'],                   15, 75),
  m('anthropic/claude-sonnet-4-5',     'Claude Sonnet 4.5',       200_000, 'premium', ['code-generation','game-design','debugging','reasoning'],                    3, 15),
  m('anthropic/claude-haiku-4-0',      'Claude Haiku 4.0',        200_000, 'premium', ['code-generation','fast'],                                                  0.25, 1.25),
  m('openai/gpt-5.5',                  'GPT-5.5',                 128_000, 'premium', ['code-generation','reasoning','game-design'],                               10, 30),
  m('openai/gpt-oss-120b:free',        'GPT-OSS 120B (Free)',     131_000, 'free',    ['code-generation','documentation','reasoning'],                              0, 0),
  m('google/gemini-3-pro',             'Gemini 3 Pro',            1_000_000,'premium',['code-generation','3d-modeling','asset-generation','multimodal'],            1.25, 5),
  m('google/gemma-4-31b:free',         'Gemma 4 31B (Free)',      262_000, 'free',    ['code-generation','documentation','multimodal'],                             0, 0),
  m('google/gemma-4-26b-moe:free',     'Gemma 4 26B MoE (Free)',  262_000, 'free',    ['code-generation','fast'],                                                   0, 0),
  m('deepseek/deepseek-v4-pro',        'DeepSeek V4 Pro',         128_000, 'premium', ['code-generation','debugging','reasoning'],                                  0.14, 0.28),
  m('deepseek/deepseek-coder-v3',      'DeepSeek Coder V3',       128_000, 'premium', ['code-generation','debugging'],                                              0.14, 0.28),
  m('mistralai/codestral-latest',      'Codestral',               256_000, 'premium', ['code-generation','debugging'],                                              0.3, 0.9),
  m('mistralai/mistral-large-latest',  'Mistral Large',           131_000, 'premium', ['code-generation','reasoning'],                                              3, 9),
  m('x-ai/grok-4',                     'Grok 4',                  256_000, 'premium', ['code-generation','reasoning','game-design'],                               3, 15),
  m('x-ai/grok-4-mini',                'Grok 4 Mini',             256_000, 'premium', ['code-generation','fast'],                                                   0.3, 0.5),
  m('nvidia/nemotron-3-ultra:free',    'Nemotron 3 Ultra 550B',   1_048_576,'free',   ['code-generation','game-design','reasoning','documentation'],                0, 0),
  m('nvidia/nemotron-super-120b:free', 'Nemotron Super 120B',     1_048_576,'free',   ['code-generation','reasoning'],                                              0, 0),
  m('nvidia/nemotron-nano-30b:free',   'Nemotron Nano 30B',       256_000, 'free',    ['code-generation','fast'],                                                   0, 0),
  m('qwen/qwen3-coder-480b:free',      'Qwen3 Coder 480B (Free)', 1_000_000,'free',  ['code-generation','debugging'],                                              0, 0),
  m('qwen/qwen3-next-80b:free',        'Qwen3 Next 80B (Free)',   262_000, 'free',    ['code-generation','reasoning'],                                              0, 0),
  m('poolside/laguna-s-2.1:free',      'Laguna S 2.1 (Free)',     262_000, 'free',    ['code-generation','fast'],                                                   0, 0),
  m('poolside/laguna-xs-2.1:free',     'Laguna XS 2.1 (Free)',    262_000, 'free',    ['code-generation','fast'],                                                   0, 0),
  m('cohere/north-mini-code:free',     'North Mini Code (Free)',  256_000, 'free',    ['code-generation','fast'],                                                   0, 0),
  m('meta-llama/llama-4-400b:free',    'Llama 4 400B (Free)',     256_000, 'free',    ['code-generation','reasoning'],                                              0, 0),
  m('meta-llama/llama-3.3-70b:free',   'Llama 3.3 70B (Free)',   131_000, 'free',    ['code-generation','documentation'],                                          0, 0),
];

const NVIDIA_MODELS: ModelSpec[] = [
  m('nvidia/nemotron-3-ultra-550b',    'Nemotron 3 Ultra 550B', 1_048_576, 'free', ['code-generation','game-design','reasoning','documentation'], 0, 0),
  m('nvidia/nemotron-super-120b',      'Nemotron Super 120B',   1_048_576, 'free', ['code-generation','reasoning'], 0, 0),
  m('nvidia/nemotron-nano-30b',        'Nemotron Nano 30B',       256_000, 'free', ['code-generation','fast'], 0, 0),
  m('nvidia/nemotron-omni-7b',         'Nemotron Omni 7B',         32_000, 'free', ['asset-generation','multimodal'], 0, 0, { supportsVision: true }),
];

const ANTHROPIC_MODELS: ModelSpec[] = [
  m('claude-opus-4-8-20260201',   'Claude Opus 4.8',    200_000, 'premium', ['code-generation','game-design','reasoning','debugging'],    15, 75, { supportsTools: true }),
  m('claude-sonnet-4-5-20260201', 'Claude Sonnet 4.5',  200_000, 'premium', ['code-generation','game-design','debugging'],               3, 15, { supportsTools: true }),
  m('claude-haiku-4-0-20260201',  'Claude Haiku 4.0',   200_000, 'premium', ['code-generation','fast'],                                  0.25, 1.25, { supportsTools: true }),
];

const OPENAI_MODELS: ModelSpec[] = [
  m('gpt-5.5',       'GPT-5.5',        128_000, 'premium', ['code-generation','reasoning','game-design'], 10, 30, { supportsTools: true }),
  m('gpt-5.4',       'GPT-5.4',        128_000, 'premium', ['code-generation','reasoning'],                5, 15, { supportsTools: true }),
  m('gpt-oss-120b',  'GPT-OSS 120B',   131_000, 'free',    ['code-generation','documentation'],            0, 0, { supportsTools: true }),
];

const GOOGLE_MODELS: ModelSpec[] = [
  m('gemini-3-pro',       'Gemini 3 Pro',       1_000_000, 'premium', ['code-generation','3d-modeling','asset-generation','multimodal'], 1.25, 5, { supportsVision: true, supportsTools: true }),
  m('gemini-3-flash',     'Gemini 3 Flash',     1_000_000, 'premium', ['code-generation','fast'],      0.1, 0.4, { supportsTools: true }),
  m('gemma-4-31b',        'Gemma 4 31B',          262_000, 'free',    ['code-generation','documentation','multimodal'], 0, 0),
];

const DEEPSEEK_MODELS: ModelSpec[] = [
  m('deepseek-v4-pro',    'DeepSeek V4 Pro',     64_000, 'premium', ['code-generation','debugging','reasoning'], 0.14, 0.28),
  m('deepseek-coder-v3',  'DeepSeek Coder V3',   64_000, 'premium', ['code-generation','debugging'],             0.14, 0.28),
];

const GROQ_MODELS: ModelSpec[] = [
  m('llama-4-400b-preview', 'Llama 4 400B (Groq)', 256_000, 'free', ['code-generation','reasoning','fast'], 0, 0),
  m('llama-3.3-70b-versatile', 'Llama 3.3 70B',    32_768, 'free', ['code-generation','fast'], 0, 0),
  m('deepseek-r1-distill-llama-70b', 'DeepSeek R1 Distill 70B', 32_768, 'free', ['reasoning','debugging'], 0, 0),
];

const MISTRAL_MODELS: ModelSpec[] = [
  m('mistral-large-latest', 'Mistral Large',    131_000, 'premium', ['code-generation','reasoning'],    3, 9),
  m('codestral-latest',     'Codestral',        256_000, 'premium', ['code-generation','debugging'],    0.3, 0.9),
  m('mistral-small-latest', 'Mistral Small',    128_000, 'premium', ['code-generation','fast'],          0.1, 0.3),
];

const XAI_MODELS: ModelSpec[] = [
  m('grok-4',       'Grok 4',      256_000, 'premium', ['code-generation','reasoning','game-design'], 3, 15),
  m('grok-4-mini',  'Grok 4 Mini', 256_000, 'premium', ['code-generation','fast'],                    0.3, 0.5),
];

const COHERE_MODELS: ModelSpec[] = [
  m('command-r-plus', 'Command R+',         128_000, 'premium', ['code-generation','reasoning'], 2.5, 10),
  m('north-mini-code', 'North Mini Code',   256_000, 'free',    ['code-generation','fast'],       0, 0),
];

const CEREBRAS_MODELS: ModelSpec[] = [
  m('llama-4-400b',    'Llama 4 400B (Cerebras)', 256_000, 'free', ['code-generation','fast'], 0, 0),
  m('llama-3.3-70b',   'Llama 3.3 70B (Cerebras)', 128_000, 'free', ['code-generation','fast'], 0, 0),
];

const POOLSIDE_MODELS: ModelSpec[] = [
  m('laguna-s-2.1',  'Laguna S 2.1',  262_000, 'free', ['code-generation','fast'], 0, 0),
  m('laguna-xs-2.1', 'Laguna XS 2.1', 262_000, 'free', ['code-generation','fast'], 0, 0),
];

const QWEN_MODELS: ModelSpec[] = [
  m('qwen3-coder-480b', 'Qwen3 Coder 480B', 1_000_000, 'free', ['code-generation','debugging'], 0, 0),
  m('qwen3-next-80b',   'Qwen3 Next 80B',    262_000,  'free', ['code-generation','reasoning'],  0, 0),
  m('qwen3-235b-a22b',  'Qwen3 235B A22B',   262_000, 'premium', ['code-generation','reasoning'], 0.5, 1.5),
];

const OLLAMA_MODELS: ModelSpec[] = [
  m('llama3.3',      'Llama 3.3',      128_000, 'local', ['code-generation','reasoning'], 0, 0),
  m('qwen3:8b',      'Qwen3 8B',         32_000, 'local', ['code-generation','fast'],      0, 0),
  m('deepseek-r1',   'DeepSeek R1',      64_000, 'local', ['reasoning','debugging'],       0, 0),
  m('codellama',     'Code Llama',       16_000, 'local', ['code-generation'],              0, 0),
  m('gemma3:9b',     'Gemma 3 9B',       128_000,'local', ['code-generation'],              0, 0),
  m('custom',        'Custom Ollama Model', 32_000, 'local', ['code-generation'],           0, 0),
];

const LMSTUDIO_MODELS: ModelSpec[] = [
  m('local-model',   'Local Model (LM Studio)', 32_000, 'local', ['code-generation'], 0, 0),
];

const HF_MODELS: ModelSpec[] = [
  m('microsoft/DialoGPT-medium', 'DialoGPT Medium',   4_096, 'free', ['documentation'], 0, 0),
  m('bigcode/starcoder2-15b',    'StarCoder2 15B',   16_384, 'free', ['code-generation'], 0, 0),
];

const SAMBANOVA_MODELS: ModelSpec[] = [
  m('Meta-Llama-3.3-70B-Instruct', 'Llama 3.3 70B (SambaNova)', 131_072, 'free', ['code-generation','fast'], 0, 0),
];

const SILICONFLOW_MODELS: ModelSpec[] = [
  m('Qwen/Qwen3-8B', 'Qwen3 8B (SiliconFlow)', 32_768, 'free', ['code-generation','fast'], 0, 0),
  m('deepseek-ai/DeepSeek-V3', 'DeepSeek V3 (SiliconFlow)', 65_536, 'free', ['code-generation','debugging'], 0, 0),
];

const CLOUDFLARE_MODELS: ModelSpec[] = [
  m('@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'Llama 3.3 70B FP8', 128_000, 'free', ['code-generation','fast'], 0, 0),
  m('@cf/qwen/qwen3-8b', 'Qwen3 8B (CF)', 32_768, 'free', ['code-generation'], 0, 0),
];

const GITHUB_MODELS: ModelSpec[] = [
  m('gpt-4o',           'GPT-4o (GitHub)',          128_000, 'free', ['code-generation','reasoning'], 0, 0),
  m('Meta-Llama-3.3-70B-Instruct', 'Llama 3.3 70B (GitHub)', 128_000, 'free', ['code-generation'], 0, 0),
];

const MODELSCOPE_MODELS: ModelSpec[] = [
  m('Qwen/Qwen3-Coder-480B-Instruct', 'Qwen3 Coder 480B (ModelScope)', 1_000_000, 'free', ['code-generation','debugging'], 0, 0),
];

const NEBIUS_MODELS: ModelSpec[] = [
  m('meta-llama/Meta-Llama-3.3-70B-Instruct', 'Llama 3.3 70B (Nebius)', 131_072, 'premium', ['code-generation'], 0.13, 0.4),
];

const ZAI_MODELS: ModelSpec[] = [
  m('glm-4-flash', 'GLM-4 Flash', 128_000, 'free', ['code-generation','fast'], 0, 0),
  m('glm-z1-flash', 'GLM-Z1 Flash', 128_000, 'free', ['code-generation','reasoning'], 0, 0),
];

const KILO_MODELS: ModelSpec[] = [
  m('kilo-code-gateway', 'Kilo Code Gateway', 200_000, 'free', ['code-generation','debugging','reasoning'], 0, 0),
];

// ---------------------------------------------------------------------------
// Provider Registry
// ---------------------------------------------------------------------------

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    models: OPENROUTER_MODELS,
    supportsStreaming: true,
    supportsTools: true,
    hasFreeModels: true,
    rateLimitRPM: 200,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyEnv: 'NVIDIA_API_KEY',
    models: NVIDIA_MODELS,
    supportsStreaming: true,
    supportsTools: false,
    hasFreeModels: true,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    models: ANTHROPIC_MODELS,
    supportsStreaming: true,
    supportsTools: true,
    hasFreeModels: false,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    models: OPENAI_MODELS,
    supportsStreaming: true,
    supportsTools: true,
    hasFreeModels: true,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'google',
    name: 'Google AI',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GOOGLE_API_KEY',
    models: GOOGLE_MODELS,
    supportsStreaming: true,
    supportsTools: true,
    hasFreeModels: true,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    models: DEEPSEEK_MODELS,
    supportsStreaming: true,
    supportsTools: true,
    hasFreeModels: false,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    models: GROQ_MODELS,
    supportsStreaming: true,
    supportsTools: true,
    hasFreeModels: true,
    rateLimitRPM: 30,
    rateLimitTPM: 6000,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
    models: MISTRAL_MODELS,
    supportsStreaming: true,
    supportsTools: true,
    hasFreeModels: false,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    apiKeyEnv: 'XAI_API_KEY',
    models: XAI_MODELS,
    supportsStreaming: true,
    supportsTools: true,
    hasFreeModels: false,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'cohere',
    name: 'Cohere',
    baseUrl: 'https://api.cohere.ai/v2',
    apiKeyEnv: 'COHERE_API_KEY',
    models: COHERE_MODELS,
    supportsStreaming: true,
    supportsTools: true,
    hasFreeModels: true,
    rateLimitRPM: 40,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    models: CEREBRAS_MODELS,
    supportsStreaming: true,
    supportsTools: false,
    hasFreeModels: true,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'poolside',
    name: 'Poolside',
    baseUrl: 'https://api.poolside.ai/v1',
    apiKeyEnv: 'POOLSIDE_API_KEY',
    models: POOLSIDE_MODELS,
    supportsStreaming: true,
    supportsTools: false,
    hasFreeModels: true,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'qwen',
    name: 'Qwen (Alibaba)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    models: QWEN_MODELS,
    supportsStreaming: true,
    supportsTools: true,
    hasFreeModels: true,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434/v1',
    apiKeyEnv: '',
    models: OLLAMA_MODELS,
    supportsStreaming: true,
    supportsTools: false,
    hasFreeModels: true,
    authType: 'none',
    enabled: true,
  },
  {
    id: 'lmstudio',
    name: 'LM Studio (Local)',
    baseUrl: 'http://localhost:1234/v1',
    apiKeyEnv: '',
    models: LMSTUDIO_MODELS,
    supportsStreaming: true,
    supportsTools: false,
    hasFreeModels: true,
    authType: 'none',
    enabled: true,
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    baseUrl: 'https://api-inference.huggingface.co/v1',
    apiKeyEnv: 'HF_API_KEY',
    models: HF_MODELS,
    supportsStreaming: true,
    supportsTools: false,
    hasFreeModels: true,
    rateLimitRPM: 30,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'sambanova',
    name: 'SambaNova',
    baseUrl: 'https://api.sambanova.ai/v1',
    apiKeyEnv: 'SAMBANOVA_API_KEY',
    models: SAMBANOVA_MODELS,
    supportsStreaming: true,
    supportsTools: false,
    hasFreeModels: true,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKeyEnv: 'SILICONFLOW_API_KEY',
    models: SILICONFLOW_MODELS,
    supportsStreaming: true,
    supportsTools: false,
    hasFreeModels: true,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1',
    apiKeyEnv: 'CLOUDFLARE_API_KEY',
    models: CLOUDFLARE_MODELS,
    supportsStreaming: true,
    supportsTools: false,
    hasFreeModels: true,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'github',
    name: 'GitHub Models',
    baseUrl: 'https://models.inference.ai.azure.com',
    apiKeyEnv: 'GITHUB_TOKEN',
    models: GITHUB_MODELS,
    supportsStreaming: true,
    supportsTools: true,
    hasFreeModels: true,
    rateLimitRPM: 15,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'modelscope',
    name: 'ModelScope',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    apiKeyEnv: 'MODELSCOPE_API_KEY',
    models: MODELSCOPE_MODELS,
    supportsStreaming: true,
    supportsTools: false,
    hasFreeModels: true,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'nebius',
    name: 'Nebius',
    baseUrl: 'https://api.studio.nebius.com/v1',
    apiKeyEnv: 'NEBIUS_API_KEY',
    models: NEBIUS_MODELS,
    supportsStreaming: true,
    supportsTools: false,
    hasFreeModels: false,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'zai',
    name: 'Z AI (Zhipu)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKeyEnv: 'ZHIPU_API_KEY',
    models: ZAI_MODELS,
    supportsStreaming: true,
    supportsTools: true,
    hasFreeModels: true,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'kilo',
    name: 'Kilo Code Gateway',
    baseUrl: 'https://api.kilo.codes/v1',
    apiKeyEnv: 'KILO_CODE_API_KEY',
    models: KILO_MODELS,
    supportsStreaming: true,
    supportsTools: true,
    hasFreeModels: true,
    rateLimitRPM: 60,
    authType: 'api-key',
    enabled: true,
  },
  {
    id: 'custom',
    name: 'Custom OpenAI-Compatible',
    baseUrl: 'http://localhost:8000/v1',
    apiKeyEnv: 'CUSTOM_API_KEY',
    models: [m('custom-model', 'Custom Model', 32_000, 'local', ['code-generation'], 0, 0)],
    supportsStreaming: true,
    supportsTools: false,
    hasFreeModels: true,
    authType: 'api-key',
    enabled: false,
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const providerMap = new Map<ProviderID, ProviderConfig>(
  PROVIDERS.map((p) => [p.id, p]),
);

export function getAllProviders(): ProviderConfig[] {
  return PROVIDERS;
}

export function getProvider(id: ProviderID): ProviderConfig | undefined {
  return providerMap.get(id);
}

export function getEnabledProviders(): ProviderConfig[] {
  return PROVIDERS.filter((p) => p.enabled);
}

export function getFreeProviders(): ProviderConfig[] {
  return PROVIDERS.filter((p) => p.hasFreeModels && p.enabled);
}

export function getFreeModels(): Array<{ modelId: string; providerId: ProviderID }> {
  const result: Array<{ modelId: string; providerId: ProviderID }> = [];
  for (const provider of getFreeProviders()) {
    for (const model of provider.models) {
      if (model.tier === 'free' || model.tier === 'local') {
        result.push({ modelId: model.id, providerId: provider.id });
      }
    }
  }
  return result;
}

export function getModelSpec(providerId: ProviderID, modelId: string): ModelSpec | undefined {
  return providerMap.get(providerId)?.models.find((m) => m.id === modelId);
}

export function searchModels(query: string): Array<{ model: ModelSpec; providerId: ProviderID }> {
  const q = query.toLowerCase();
  const results: Array<{ model: ModelSpec; providerId: ProviderID }> = [];
  for (const provider of PROVIDERS) {
    for (const model of provider.models) {
      if (model.id.toLowerCase().includes(q) || model.name.toLowerCase().includes(q)) {
        results.push({ model, providerId: provider.id });
      }
    }
  }
  return results;
}

export { PROVIDERS };
