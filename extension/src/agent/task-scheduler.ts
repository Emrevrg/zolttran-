/**
 * Zolttran Task Scheduler
 * Parallel priority queue for agent task execution.
 */
import type { AgentTask, AgentType, AgentStatus, AgentLog } from '../types/index.js';

export type TaskUpdateCallback = (task: AgentTask) => void;

interface QueueEntry {
  task: AgentTask;
  execute: () => Promise<void>;
  priority: number;
}

export class TaskScheduler {
  // Public so extension.ts can set it directly
  public maxParallel: number;
  private queue: QueueEntry[] = [];
  private running = new Map<string, AgentTask>();
  private completed = new Map<string, AgentTask>();
  private updateCallbacks: TaskUpdateCallback[] = [];
  private agentStatuses: Record<AgentType, AgentStatus> = {
    architect: 'idle', coder: 'idle', artist: 'idle', debugger: 'idle', devops: 'idle',
  };

  constructor(maxParallel = 3) {
    this.maxParallel = maxParallel;
  }

  schedule(
    task: Omit<AgentTask, 'id' | 'status' | 'progress' | 'logs' | 'startTime' | 'endTime'>,
    execute: () => Promise<void>,
    priority = 5,
  ): AgentTask {
    const full: AgentTask = { ...task, id: crypto.randomUUID(), status: 'waiting', progress: 0, logs: [] };
    this.queue.push({ task: full, execute, priority });
    this.queue.sort((a, b) => b.priority - a.priority);
    this.emit(full);
    this.tick();
    return full;
  }

  cancel(taskId: string): void {
    this.queue = this.queue.filter((e) => e.task.id !== taskId);
    const running = this.running.get(taskId);
    if (running) {
      running.status = 'failed';
      running.endTime = Date.now();
      this.running.delete(taskId);
      this.completed.set(taskId, running);
      this.emit(running);
    }
  }

  cancelAll(): void {
    this.queue = [];
    for (const task of this.running.values()) {
      task.status = 'failed';
      task.endTime = Date.now();
      this.completed.set(task.id, task);
      this.emit(task);
    }
    this.running.clear();
    for (const key of Object.keys(this.agentStatuses) as AgentType[]) {
      this.agentStatuses[key] = 'idle';
    }
  }

  updateProgress(taskId: string, progress: number, log?: AgentLog): void {
    const task = this.running.get(taskId);
    if (!task) return;
    task.progress = Math.min(100, Math.max(0, progress));
    if (log) task.logs.push(log);
    this.emit(task);
  }

  getRunning(): AgentTask[] { return Array.from(this.running.values()); }
  getCompleted(): AgentTask[] { return Array.from(this.completed.values()); }
  getQueuedCount(): number { return this.queue.length; }
  getAgentStatus(type: AgentType): AgentStatus { return this.agentStatuses[type]; }
  getAllAgentStatuses(): Record<AgentType, AgentStatus> { return { ...this.agentStatuses }; }

  onUpdate(cb: TaskUpdateCallback): () => void {
    this.updateCallbacks.push(cb);
    return () => { this.updateCallbacks = this.updateCallbacks.filter((c) => c !== cb); };
  }

  private tick(): void {
    while (this.running.size < this.maxParallel && this.queue.length > 0) {
      const entry = this.queue.shift()!;
      const { task, execute } = entry;
      task.status = 'executing';
      task.startTime = Date.now();
      this.running.set(task.id, task);
      this.agentStatuses[task.agentType] = 'executing';
      this.emit(task);

      execute()
        .then(() => {
          task.status = 'completed';
          task.progress = 100;
          task.endTime = Date.now();
          this.running.delete(task.id);
          this.completed.set(task.id, task);
          this.agentStatuses[task.agentType] = 'idle';
          this.emit(task);
          this.tick();
        })
        .catch((err: unknown) => {
          task.status = 'failed';
          task.endTime = Date.now();
          task.logs.push({ timestamp: Date.now(), level: 'error', message: String(err) });
          this.running.delete(task.id);
          this.completed.set(task.id, task);
          this.agentStatuses[task.agentType] = 'idle';
          this.emit(task);
          this.tick();
        });
    }
  }

  private emit(task: AgentTask): void {
    for (const cb of this.updateCallbacks) cb({ ...task, logs: [...task.logs] });
  }
}

export const taskScheduler = new TaskScheduler();
