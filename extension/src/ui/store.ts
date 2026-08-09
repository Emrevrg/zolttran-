/**
 * Zolttran Zustand Store
 * acquireVsCodeApi() is called ONCE and cached — calling it multiple times crashes the webview.
 */
import { create } from 'zustand';
import type {
  AppState, ChatMessage, AgentTask, AgentType, AgentStatus,
  BuildResult, PanelTab, OrchestratorMode, ProviderID,
  GameDesignDocument, GodotProject, GodotBridgeMethod, PreviewState, Toast,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// VS Code API — singleton, called exactly once
// ---------------------------------------------------------------------------
type VsCodeApi = { postMessage(msg: unknown): void };
let _vscodeApi: VsCodeApi | null = null;
function getVsCodeApi(): VsCodeApi | null {
  if (_vscodeApi) return _vscodeApi;
  // @ts-expect-error — injected by VS Code webview runtime
  if (typeof acquireVsCodeApi !== 'undefined') {
    // @ts-expect-error
    _vscodeApi = acquireVsCodeApi() as VsCodeApi;
  }
  return _vscodeApi;
}

// ---------------------------------------------------------------------------
// Actions interface
// ---------------------------------------------------------------------------
interface AppActions {
  postMessage: (msg: { type: string; payload?: unknown }) => void;

  // UI
  setActiveTab: (tab: PanelTab) => void;
  setSidebarCollapsed: (v: boolean) => void;

  // Provider
  setActiveProvider: (id: ProviderID, model: string) => void;
  setFreeMode: (v: boolean) => void;
  toggleFreeExclusion: (id: ProviderID) => void;
  setProviderStatus: (id: ProviderID, status: 'connected' | 'error' | 'unconfigured') => void;
  setCost: (today: number, total: number) => void;

  // Chat
  addMessage: (msg: ChatMessage) => void;
  updateStreamChunk: (chunk: string) => void;
  finalizeStream: (content: string) => void;
  clearMessages: () => void;
  setStreaming: (v: boolean) => void;

  // Agents
  setOrchestratorMode: (mode: OrchestratorMode) => void;
  upsertTask: (task: AgentTask) => void;
  setAgentStatus: (type: AgentType, status: AgentStatus) => void;

  // Godot
  setGodotConnected: (v: boolean, method?: GodotBridgeMethod) => void;
  setCurrentProject: (p: GodotProject | undefined) => void;
  setStageModel: (m: { url: string; ext?: string; name: string } | null) => void;
  setCurrentGdd: (gdd: GameDesignDocument | undefined) => void;

  // Build
  setBuildResult: (result: BuildResult) => void;
  setIsBuildingAll: (v: boolean) => void;

  // Preview
  setPreview: (state: PreviewState) => void;

  // Toasts
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Full hydrate from extension
  hydrate: (state: Partial<AppState>) => void;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
const INITIAL_AGENT_STATUSES: Record<AgentType, AgentStatus> = {
  architect: 'idle', coder: 'idle', artist: 'idle', debugger: 'idle', devops: 'idle',
};

const INITIAL_STATE: AppState = {
  ready: false,
  locale: 'tr',
  activeProviderId: 'openrouter',
  activeModelId: 'auto',
  freeMode: true,
  providerStatuses: {},
  freeExcluded: [],
  costToday: 0,
  costTotal: 0,
  messages: [],
  isStreaming: false,
  currentStreamContent: '',
  contextWindowUsage: 0,
  contextWindowMax: 200_000,
  orchestratorMode: 'orchestrator',
  activeTasks: [],
  completedTasks: [],
  agentStatuses: INITIAL_AGENT_STATUSES,
  godotConnected: false,
  buildResults: {},
  isBuildingAll: false,
  preview: { running: false, port: 8080, wsConnected: false },
  activeTab: 'chat',
  sidebarCollapsed: false,
  toasts: [],
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useStore = create<AppState & AppActions>((set, get) => ({
  ...INITIAL_STATE,

  postMessage(msg) {
    getVsCodeApi()?.postMessage(msg);
  },

  // UI
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  // Provider
  setActiveProvider: (id, model) => {
    set({ activeProviderId: id, activeModelId: model });
    get().postMessage({ type: 'set-provider', payload: { providerId: id, model } });
  },
  setFreeMode: (v) => {
    set({ freeMode: v });
    get().postMessage({ type: 'toggle-free-mode', payload: { enabled: v } });
  },
  toggleFreeExclusion: (id) => {
    const cur = get().freeExcluded;
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    set({ freeExcluded: next });
    get().postMessage({ type: 'set-free-exclusions', payload: { providerIds: next } });
  },
  setProviderStatus: (id, status) =>
    set((s) => ({ providerStatuses: { ...s.providerStatuses, [id]: status } })),
  setCost: (today, total) => set({ costToday: today, costTotal: total }),

  // Chat
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setStreaming: (v) => set({ isStreaming: v }),
  updateStreamChunk: (chunk) =>
    set((s) => ({ currentStreamContent: s.currentStreamContent + chunk, isStreaming: true })),
  finalizeStream: (content) => {
    const msg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content, timestamp: Date.now() };
    set((s) => ({ messages: [...s.messages, msg], isStreaming: false, currentStreamContent: '' }));
  },
  clearMessages: () => set({ messages: [], currentStreamContent: '', isStreaming: false }),

  // Agents
  setOrchestratorMode: (mode) => {
    set({ orchestratorMode: mode });
    get().postMessage({ type: 'set-orchestrator-mode', payload: { mode } });
  },
  upsertTask: (task) =>
    set((s) => {
      const isActive = ['executing', 'thinking', 'waiting'].includes(task.status);
      const isDone   = ['completed', 'failed'].includes(task.status);
      return {
        activeTasks:    isActive ? [...s.activeTasks.filter((t) => t.id !== task.id), task] : s.activeTasks.filter((t) => t.id !== task.id),
        completedTasks: isDone   ? [task, ...s.completedTasks.filter((t) => t.id !== task.id)].slice(0, 50) : s.completedTasks,
      };
    }),
  setAgentStatus: (type, status) =>
    set((s) => ({ agentStatuses: { ...s.agentStatuses, [type]: status } })),

  // Godot
  setGodotConnected: (v, method) => set({ godotConnected: v, godotBridgeMethod: method }),
  setCurrentProject: (p) => set({ currentProject: p }),
  setStageModel: (m) => set({ stageModel: m }),
  setCurrentGdd: (gdd) => set({ currentGdd: gdd }),

  // Build
  setBuildResult: (result) =>
    set((s) => ({ buildResults: { ...s.buildResults, [result.platform]: result } })),
  setIsBuildingAll: (v) => set({ isBuildingAll: v }),

  // Preview
  setPreview: (state) => set({ preview: state }),

  // Toasts
  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => get().removeToast(id), toast.duration ?? 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // Hydrate
  hydrate: (partial) => set((s) => ({ ...s, ...partial, ready: true })),
}));
