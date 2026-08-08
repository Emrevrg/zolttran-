/**
 * Base Agent — shared loop: think → act → observe → repeat.
 */
import type {
  AgentType,
  AgentConfig,
  AgentTask,
  AgentLog,
  ChatMessage,
  StreamChunk,
  ModelCapability,
} from '../../types/index.js';
import { providerManager } from '../../providers/provider-manager.js';
import { intelligentRouter } from '../../providers/intelligent-router.js';
import { memoryBank } from '../memory-bank.js';

export type AgentStreamCallback = (chunk: string) => void;
export type AgentLogCallback = (log: AgentLog) => void;

export abstract class BaseAgent {
  abstract readonly type: AgentType;
  abstract readonly config: AgentConfig;

  protected onStream?: AgentStreamCallback;
  protected onLog?: AgentLogCallback;

  setCallbacks(onStream?: AgentStreamCallback, onLog?: AgentLogCallback): void {
    this.onStream = onStream;
    this.onLog = onLog;
  }

  // -----------------------------------------------------------------------
  // Core: run a single-turn completion with streaming
  // -----------------------------------------------------------------------

  protected async runCompletion(
    messages: ChatMessage[],
    capability: ModelCapability,
    systemOverride?: string,
  ): Promise<string> {
    const request = intelligentRouter.resolveRequest({
      messages,
      capability,
      systemPrompt: systemOverride ?? this.config.systemPrompt,
      temperature: this.config.temperature,
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of providerManager.stream(request)) {
      if (chunk.type === 'delta') {
        fullContent += chunk.content;
        this.onStream?.(chunk.content);
      } else if (chunk.type === 'error') {
        this.log('error', `Stream error: ${chunk.error}`);
        throw new Error(chunk.error);
      }
    }

    return fullContent;
  }

  // -----------------------------------------------------------------------
  // Agentic loop — think → act → repeat up to maxIterations
  // -----------------------------------------------------------------------

  protected async agentLoop(
    task: AgentTask,
    capability: ModelCapability,
    buildMessages: (iteration: number, lastOutput: string) => ChatMessage[],
    extractResult: (output: string, iteration: number) => { done: boolean; result?: unknown },
  ): Promise<unknown> {
    let lastOutput = '';
    let iteration = 0;

    while (iteration < this.config.maxIterations) {
      this.log('info', `Iteration ${iteration + 1}/${this.config.maxIterations}`);
      const messages = buildMessages(iteration, lastOutput);

      try {
        lastOutput = await this.runCompletion(messages, capability);
        const { done, result } = extractResult(lastOutput, iteration);

        if (done) {
          this.log('info', 'Task completed successfully');
          return result ?? lastOutput;
        }
      } catch (err) {
        this.log('error', `Iteration ${iteration + 1} failed: ${String(err)}`);
        if (iteration >= this.config.maxIterations - 1) throw err;
      }

      iteration++;
    }

    return lastOutput;
  }

  // -----------------------------------------------------------------------
  // Abstract: subclasses implement this
  // -----------------------------------------------------------------------

  abstract execute(task: AgentTask): Promise<unknown>;

  // -----------------------------------------------------------------------
  // Utilities
  // -----------------------------------------------------------------------

  protected log(level: AgentLog['level'], message: string, data?: unknown): void {
    const entry: AgentLog = { timestamp: Date.now(), level, message, data };
    this.onLog?.(entry);
    if (level === 'error') {
      console.error(`[${this.type.toUpperCase()}]`, message, data);
    } else {
      console.log(`[${this.type.toUpperCase()}]`, message);
    }
  }

  protected buildContextMessages(taskDescription: string): ChatMessage[] {
    const context = memoryBank.buildAgentContext();
    const messages: ChatMessage[] = [];

    if (context) {
      messages.push({
        id: crypto.randomUUID(),
        role: 'user',
        content: `Project context:\n${context}\n\nTask: ${taskDescription}`,
        timestamp: Date.now(),
      });
    } else {
      messages.push({
        id: crypto.randomUUID(),
        role: 'user',
        content: taskDescription,
        timestamp: Date.now(),
      });
    }

    return messages;
  }

  /** Parse JSON from a model response, stripping markdown fences. */
  protected parseJson<T>(raw: string): T {
    const cleaned = raw
      .replace(/^```(?:json)?\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim();
    return JSON.parse(cleaned) as T;
  }

  /** Extract a code block from a model response. */
  protected extractCode(raw: string, lang = ''): string {
    const fenceRe = new RegExp(`\`\`\`${lang}[\\s\\S]*?\n([\\s\\S]*?)\`\`\``, 'i');
    const match = fenceRe.exec(raw);
    return match?.[1]?.trim() ?? raw.trim();
  }
}
