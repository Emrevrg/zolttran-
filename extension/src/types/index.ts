// =============================================================================
// ZOLTTRAN — Master Type Definitions
// =============================================================================

// ---------------------------------------------------------------------------
// PROVIDER TYPES
// ---------------------------------------------------------------------------

export type ProviderID =
  | 'openrouter' | 'nvidia' | 'anthropic' | 'openai' | 'google'
  | 'deepseek' | 'groq' | 'mistral' | 'xai' | 'cohere' | 'cerebras'
  | 'poolside' | 'qwen' | 'ollama' | 'lmstudio' | 'huggingface'
  | 'sambanova' | 'siliconflow' | 'cloudflare' | 'github'
  | 'modelscope' | 'nebius' | 'zai' | 'kilo' | 'custom';

export type ModelTier = 'premium' | 'free' | 'local';

export type ModelCapability =
  | 'code-generation'
  | 'game-design'
  | '3d-modeling'
  | 'debugging'
  | 'asset-generation'
  | 'documentation'
  | 'reasoning'
  | 'multimodal'
  | 'fast';

export interface ModelSpec {
  id: string;
  name: string;
  contextWindow: number;
  tier: ModelTier;
  capabilities: ModelCapability[];
  costInput: number;   // USD per 1M input tokens
  costOutput: number;  // USD per 1M output tokens
  maxOutputTokens?: number;
  supportsVision?: boolean;
  supportsTools?: boolean;
}

export interface ProviderConfig {
  id: ProviderID;
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  models: ModelSpec[];
  supportsStreaming: boolean;
  supportsTools: boolean;
  hasFreeModels: boolean;
  rateLimitRPM?: number;
  rateLimitTPM?: number;
  authType: 'api-key' | 'oauth' | 'none';
  enabled: boolean;
}

export interface ProviderCredentials {
  providerId: ProviderID;
  apiKey?: string;
  baseUrl?: string;
  headers?: Record<string, string>;
}

export interface RateLimitState {
  providerId: ProviderID;
  modelId: string;
  requestsThisMinute: number;
  tokensThisMinute: number;
  lastResetTime: number;
  isLimited: boolean;
  retryAfter?: number;
}

export interface FreeModelState {
  currentIndex: number;
  models: FreeModelEntry[];
  lastRotation: number;
}

export interface FreeModelEntry {
  modelId: string;
  providerId: ProviderID;
  tier: 1 | 2 | 3 | 4;
  available: boolean;
  failCount: number;
  lastFailTime?: number;
}

// ---------------------------------------------------------------------------
// AI MESSAGE / CONVERSATION TYPES
// ---------------------------------------------------------------------------

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string | ContentPart[];
  timestamp: number;
  model?: string;
  providerId?: ProviderID;
  usage?: TokenUsage;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } };

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface CompletionRequest {
  messages: ChatMessage[];
  model: string;
  providerId: ProviderID;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
  systemPrompt?: string;
}

export interface CompletionResponse {
  id: string;
  content: string;
  model: string;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'error';
  usage: TokenUsage;
  toolCalls?: ToolCall[];
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export type StreamChunk =
  | { type: 'delta'; content: string }
  | { type: 'tool_call'; toolCall: Partial<ToolCall> }
  | { type: 'done'; usage: TokenUsage; finishReason: string }
  | { type: 'error'; error: string };

// ---------------------------------------------------------------------------
// AGENT TYPES
// ---------------------------------------------------------------------------

export type AgentType = 'architect' | 'coder' | 'artist' | 'debugger' | 'devops';
export type OrchestratorMode = 'architect' | 'code' | 'debug' | 'ask' | 'orchestrator';

export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'waiting'
  | 'completed'
  | 'failed';

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  preferredModels: string[];
  fallbackModels: string[];
  systemPrompt: string;
  tools: string[];
  maxIterations: number;
  temperature: number;
}

export interface AgentTask {
  id: string;
  agentType: AgentType;
  title: string;
  description: string;
  input: unknown;
  output?: unknown;
  status: AgentStatus;
  progress: number;
  logs: AgentLog[];
  startTime?: number;
  endTime?: number;
  parentTaskId?: string;
  childTaskIds?: string[];
}

export interface AgentLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: unknown;
}

// ---------------------------------------------------------------------------
// MEMORY BANK TYPES
// ---------------------------------------------------------------------------

export interface ProjectContext {
  projectId: string;
  projectName: string;
  gameType: GameType;
  techStack: string[];
  description: string;
  godotVersion: string;
  targetPlatforms: Platform[];
  createdAt: number;
  updatedAt: number;
}

export interface MemoryEntry {
  id: string;
  category: 'decision' | 'learning' | 'context' | 'task';
  key: string;
  value: unknown;
  tags: string[];
  timestamp: number;
  relevanceScore?: number;
}

export interface TaskHistoryEntry {
  id: string;
  agentType: AgentType;
  description: string;
  outcome: 'success' | 'failure' | 'partial';
  filesModified: string[];
  timestamp: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// GODOT TYPES
// ---------------------------------------------------------------------------

export type GodotBridgeMethod = 'mcp' | 'tcp' | 'cli';

export interface GodotBridgeConfig {
  method: GodotBridgeMethod;
  godotPath: string;
  projectPath: string;
  port: number;
  connected: boolean;
}

export interface GodotNode {
  name: string;
  type: string;
  path: string;
  children: GodotNode[];
  properties: Record<string, unknown>;
  scripts: string[];
}

export interface GodotScene {
  name: string;
  path: string;
  rootNode: GodotNode;
  resourcePath: string;
}

export interface GodotProject {
  name: string;
  path: string;
  godotVersion: string;
  scenes: GodotScene[];
  scripts: GodotScript[];
  assets: GodotAsset[];
  exportPresets: ExportPreset[];
}

export interface GodotScript {
  path: string;
  language: 'gdscript' | 'csharp';
  attachedTo?: string;
  content: string;
  errors: GodotError[];
}

export interface GodotError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface GodotAsset {
  path: string;
  type: 'texture' | 'model' | 'sound' | 'shader' | 'material' | 'scene' | 'script' | 'other';
  size: number;
  importSettings?: Record<string, unknown>;
}

export interface GodotBridgeCommand {
  command: string;
  args: Record<string, unknown>;
  timeout?: number;
}

export interface GodotBridgeResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  logs?: string[];
}

// ---------------------------------------------------------------------------
// GAME DESIGN DOCUMENT (GDD)
// ---------------------------------------------------------------------------

export type GameType =
  | 'bullet-heaven'
  | 'platformer'
  | 'top-down-rpg'
  | 'fps'
  | 'roguelike'
  | 'farm-sim'
  | 'strategy'
  | 'custom';

export interface GameDesignDocument {
  id: string;
  title: string;
  gameType: GameType;
  description: string;
  genre: string[];
  targetPlatforms: Platform[];
  mechanics: GameMechanic[];
  systems: GameSystem[];
  scenes: SceneSpec[];
  entities: EntitySpec[];
  ui: UISpec;
  audioSpec: AudioSpec;
  techRequirements: TechRequirements;
  createdAt: number;
  updatedAt: number;
}

export interface GameMechanic {
  name: string;
  description: string;
  priority: 'core' | 'secondary' | 'optional';
}

export interface GameSystem {
  name: string;
  type: string;
  description: string;
  dependencies: string[];
}

export interface SceneSpec {
  name: string;
  type: 'main' | 'level' | 'ui' | 'player' | 'enemy' | 'environment' | 'npc';
  nodeStructure: string;
  scripts: string[];
}

export interface EntitySpec {
  name: string;
  type: 'player' | 'enemy' | 'npc' | 'item' | 'environment';
  properties: Record<string, unknown>;
  behaviors: string[];
  sprite?: string;
}

export interface UISpec {
  mainMenu: boolean;
  hud: boolean;
  pauseMenu: boolean;
  gameOver: boolean;
  settings: boolean;
  elements: string[];
}

export interface AudioSpec {
  bgm: string[];
  sfx: string[];
  ambience: string[];
}

export interface TechRequirements {
  physics: '2d' | '3d' | 'both';
  multiplayer: boolean;
  saveSystem: boolean;
  localisation: boolean;
  minGodotVersion: string;
}

// ---------------------------------------------------------------------------
// BUILD / DEPLOY TYPES
// ---------------------------------------------------------------------------

export type Platform =
  | 'web'
  | 'windows'
  | 'macos'
  | 'linux'
  | 'android'
  | 'ios'
  | 'steamdeck';

export type BuildStatus = 'idle' | 'pending' | 'building' | 'success' | 'failed';

export interface ExportPreset {
  platform: Platform;
  name: string;
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface BuildResult {
  platform: Platform;
  status: BuildStatus;
  outputPath?: string;
  fileSize?: number;
  version: string;
  timestamp: number;
  error?: string;
  logs: string[];
}

export interface DeployTarget {
  platform: Platform;
  hosting: HostingService;
  url?: string;
  credentials?: Record<string, string>;
}

export type HostingService =
  | 'itch-io'
  | 'github-pages'
  | 'steam'
  | 'google-play'
  | 'app-store'
  | 'custom';

export interface DeployResult {
  hosting: HostingService;
  platform: Platform;
  url?: string;
  version: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
  toString(): string;
}

// ---------------------------------------------------------------------------
// LIVE PREVIEW TYPES
// ---------------------------------------------------------------------------

export interface PreviewState {
  running: boolean;
  url?: string;
  port: number;
  fps?: number;
  memoryMb?: number;
  drawCalls?: number;
  wsConnected: boolean;
}

// ---------------------------------------------------------------------------
// UI / WEBVIEW TYPES
// ---------------------------------------------------------------------------

export type PanelTab = 'chat' | 'agent' | 'builder' | 'deploy' | 'settings';

export interface WebviewMessage {
  type: string;
  payload?: unknown;
}

// Messages: webview → extension
export type WebviewToExtension =
  | { type: 'ready' }
  | { type: 'chat-message'; payload: { content: string; attachments?: string[] } }
  | { type: 'set-provider'; payload: { providerId: ProviderID; model: string } }
  | { type: 'set-api-key'; payload: { providerId: ProviderID; key: string } }
  | { type: 'test-provider'; payload: { providerId: ProviderID } }
  | { type: 'toggle-free-mode'; payload: { enabled: boolean } }
  | { type: 'new-game'; payload: { prompt: string; gameType: GameType } }
  | { type: 'run-preview' }
  | { type: 'stop-preview' }
  | { type: 'reload-preview' }
  | { type: 'build-platform'; payload: { platform: Platform } }
  | { type: 'build-all' }
  | { type: 'deploy'; payload: { platform: Platform; hosting: HostingService } }
  | { type: 'open-file'; payload: { path: string } }
  | { type: 'cancel-agent'; payload: { taskId: string } }
  | { type: 'set-orchestrator-mode'; payload: { mode: OrchestratorMode } }
  | { type: 'set-godot-path'; payload: { path: string } }
  | { type: 'run-godot-bridge' }
  | { type: 'get-state' };

// Messages: extension → webview
export type ExtensionToWebview =
  | { type: 'state-update'; payload: Partial<AppState> }
  | { type: 'chat-response'; payload: { message: ChatMessage; streaming: boolean } }
  | { type: 'chat-stream-chunk'; payload: { chunk: string; done: boolean } }
  | { type: 'agent-update'; payload: { task: AgentTask } }
  | { type: 'build-update'; payload: { result: BuildResult } }
  | { type: 'preview-update'; payload: { state: PreviewState } }
  | { type: 'provider-status'; payload: { providerId: ProviderID; status: 'ok' | 'error'; error?: string } }
  | { type: 'godot-status'; payload: { connected: boolean; method?: GodotBridgeMethod } }
  | { type: 'error'; payload: { message: string; code?: string } }
  | { type: 'notification'; payload: { level: 'info' | 'warn' | 'error'; message: string } }
  | { type: 'toast'; payload: { message: string; type: 'success' | 'error' | 'info' | 'warning'; duration?: number } };

// ---------------------------------------------------------------------------
// APP STATE (Zustand root store shape)
// ---------------------------------------------------------------------------

export interface AppState {
  ready: boolean;
  locale: 'en' | 'tr';

  // Provider
  activeProviderId: ProviderID;
  activeModelId: string;
  freeMode: boolean;
  providerStatuses: Partial<Record<ProviderID, 'connected' | 'error' | 'unconfigured'>>;
  costToday: number;
  costTotal: number;

  // Chat
  messages: ChatMessage[];
  isStreaming: boolean;
  currentStreamContent: string;
  contextWindowUsage: number;
  contextWindowMax: number;

  // Agent / Orchestrator
  orchestratorMode: OrchestratorMode;
  activeTasks: AgentTask[];
  completedTasks: AgentTask[];
  agentStatuses: Record<AgentType, AgentStatus>;

  // Godot
  godotConnected: boolean;
  godotBridgeMethod?: GodotBridgeMethod;
  currentProject?: GodotProject;
  currentGdd?: GameDesignDocument;

  // Build
  buildResults: Partial<Record<Platform, BuildResult>>;
  isBuildingAll: boolean;

  // Preview
  preview: PreviewState;

  // UI
  activeTab: PanelTab;
  sidebarCollapsed: boolean;

  // Toasts
  toasts: Toast[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

// ---------------------------------------------------------------------------
// GAME TEMPLATE TYPE
// ---------------------------------------------------------------------------

export interface GameTemplate {
  id: GameType;
  name: string;
  description: string;
  thumbnail: string;
  features: string[];
  defaultGdd: Partial<GameDesignDocument>;
  sceneStructure: string[];
  baseScripts: Record<string, string>;
}
