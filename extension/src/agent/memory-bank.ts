/**
 * OmniForge Memory Bank
 * Persistent cross-session project memory using VS Code global state (IndexedDB equivalent).
 * Stores project context, task history, architectural decisions, and learnings.
 */
import type {
  ProjectContext,
  MemoryEntry,
  TaskHistoryEntry,
  GameDesignDocument,
  AgentType,
} from '../types/index.js';

export interface MemoryBankData {
  projectContext: ProjectContext | null;
  memoryEntries: MemoryEntry[];
  taskHistory: TaskHistoryEntry[];
  currentGdd: GameDesignDocument | null;
  contextFiles: Record<string, string>;
  decisions: Array<{ id: string; title: string; rationale: string; timestamp: number }>;
  learnings: Array<{ id: string; insight: string; tags: string[]; timestamp: number }>;
}

/** Storage backend — injected so extension code can use VS Code Memento */
export interface StorageBackend {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): Promise<void>;
}

const STORAGE_KEY = 'omniforge.memory-bank';
const MAX_TASK_HISTORY = 200;
const MAX_MEMORY_ENTRIES = 500;

export class MemoryBank {
  private data: MemoryBankData;
  private storage: StorageBackend | null = null;

  constructor() {
    this.data = this.empty();
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  setStorage(backend: StorageBackend): void {
    this.storage = backend;
    const saved = backend.get<MemoryBankData>(STORAGE_KEY);
    if (saved) {
      this.data = { ...this.empty(), ...saved };
    }
  }

  async persist(): Promise<void> {
    if (this.storage) {
      await this.storage.update(STORAGE_KEY, this.data);
    }
  }

  clear(): void {
    this.data = this.empty();
  }

  // -----------------------------------------------------------------------
  // Project Context
  // -----------------------------------------------------------------------

  setProjectContext(ctx: ProjectContext): void {
    this.data.projectContext = ctx;
    void this.persist();
  }

  getProjectContext(): ProjectContext | null {
    return this.data.projectContext;
  }

  setGdd(gdd: GameDesignDocument): void {
    this.data.currentGdd = gdd;
    void this.persist();
  }

  getGdd(): GameDesignDocument | null {
    return this.data.currentGdd;
  }

  // -----------------------------------------------------------------------
  // Task History
  // -----------------------------------------------------------------------

  recordTask(entry: Omit<TaskHistoryEntry, 'id'>): void {
    const full: TaskHistoryEntry = { id: crypto.randomUUID(), ...entry };
    this.data.taskHistory.unshift(full);
    if (this.data.taskHistory.length > MAX_TASK_HISTORY) {
      this.data.taskHistory = this.data.taskHistory.slice(0, MAX_TASK_HISTORY);
    }
    void this.persist();
  }

  getTaskHistory(agentType?: AgentType, limit = 20): TaskHistoryEntry[] {
    const filtered = agentType
      ? this.data.taskHistory.filter((t) => t.agentType === agentType)
      : this.data.taskHistory;
    return filtered.slice(0, limit);
  }

  getSuccessRate(agentType?: AgentType): number {
    const tasks = this.getTaskHistory(agentType, MAX_TASK_HISTORY);
    if (tasks.length === 0) return 1;
    const successes = tasks.filter((t) => t.outcome === 'success').length;
    return successes / tasks.length;
  }

  // -----------------------------------------------------------------------
  // Memory Entries (key-value store with tags)
  // -----------------------------------------------------------------------

  remember(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): void {
    // Deduplicate by key within category
    this.data.memoryEntries = this.data.memoryEntries.filter(
      (e) => !(e.category === entry.category && e.key === entry.key),
    );
    const full: MemoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...entry,
    };
    this.data.memoryEntries.unshift(full);
    if (this.data.memoryEntries.length > MAX_MEMORY_ENTRIES) {
      this.data.memoryEntries = this.data.memoryEntries.slice(0, MAX_MEMORY_ENTRIES);
    }
    void this.persist();
  }

  recall(key: string, category?: MemoryEntry['category']): MemoryEntry | null {
    return this.data.memoryEntries.find(
      (e) => e.key === key && (!category || e.category === category),
    ) ?? null;
  }

  search(tags: string[], limit = 10): MemoryEntry[] {
    return this.data.memoryEntries
      .filter((e) => tags.some((t) => e.tags.includes(t)))
      .slice(0, limit);
  }

  // -----------------------------------------------------------------------
  // Context Files (file path → last known content)
  // -----------------------------------------------------------------------

  setContextFile(path: string, content: string): void {
    this.data.contextFiles[path] = content;
    void this.persist();
  }

  getContextFile(path: string): string | undefined {
    return this.data.contextFiles[path];
  }

  getContextFileList(): string[] {
    return Object.keys(this.data.contextFiles);
  }

  // -----------------------------------------------------------------------
  // Decisions
  // -----------------------------------------------------------------------

  addDecision(title: string, rationale: string): void {
    this.data.decisions.push({ id: crypto.randomUUID(), title, rationale, timestamp: Date.now() });
    void this.persist();
  }

  getDecisions(): typeof this.data.decisions {
    return this.data.decisions;
  }

  // -----------------------------------------------------------------------
  // Learnings
  // -----------------------------------------------------------------------

  addLearning(insight: string, tags: string[]): void {
    this.data.learnings.push({ id: crypto.randomUUID(), insight, tags, timestamp: Date.now() });
    void this.persist();
  }

  getLearnings(tags?: string[]): typeof this.data.learnings {
    if (!tags?.length) return this.data.learnings;
    return this.data.learnings.filter((l) => tags.some((t) => l.tags.includes(t)));
  }

  // -----------------------------------------------------------------------
  // Context summary for agent injection
  // -----------------------------------------------------------------------

  buildAgentContext(): string {
    const parts: string[] = [];
    const ctx = this.data.projectContext;
    const gdd = this.data.currentGdd;

    if (ctx) {
      parts.push(`## Project: ${ctx.projectName}`);
      parts.push(`Game type: ${ctx.gameType} | Platforms: ${ctx.targetPlatforms.join(', ')}`);
      parts.push(`Description: ${ctx.description}`);
    }

    if (gdd) {
      parts.push(`\n## Current GDD: ${gdd.title}`);
      parts.push(`Core mechanics: ${gdd.mechanics.filter((m) => m.priority === 'core').map((m) => m.name).join(', ')}`);
    }

    const recentDecisions = this.data.decisions.slice(0, 5);
    if (recentDecisions.length) {
      parts.push('\n## Recent Decisions:');
      for (const d of recentDecisions) {
        parts.push(`- ${d.title}: ${d.rationale}`);
      }
    }

    const recentTasks = this.getTaskHistory(undefined, 5);
    if (recentTasks.length) {
      parts.push('\n## Recent Tasks:');
      for (const t of recentTasks) {
        parts.push(`- [${t.outcome}] ${t.agentType}: ${t.description}`);
      }
    }

    return parts.join('\n');
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private empty(): MemoryBankData {
    return {
      projectContext: null,
      memoryEntries: [],
      taskHistory: [],
      currentGdd: null,
      contextFiles: {},
      decisions: [],
      learnings: [],
    };
  }
}

export const memoryBank = new MemoryBank();
