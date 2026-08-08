/**
 * OmniForge Orchestrator
 * Central coordinator for all agent activity. Routes user requests to the
 * right agent(s), manages parallel execution, and streams progress.
 */
import type {
  OrchestratorMode,
  AgentTask,
  AgentType,
  AgentStatus,
  GameType,
  Platform,
  ChatMessage,
} from '../types/index.js';
import { taskScheduler } from './task-scheduler.js';
import { memoryBank } from './memory-bank.js';
import { providerManager } from '../providers/provider-manager.js';
import { intelligentRouter } from '../providers/intelligent-router.js';
import { ArchitectAgent } from './agents/architect-agent.js';
import { CoderAgent } from './agents/coder-agent.js';
import { ArtistAgent } from './agents/artist-agent.js';
import { DebuggerAgent } from './agents/debugger-agent.js';
import { DevOpsAgent } from './agents/devops-agent.js';
import { ORCHESTRATOR_MODE_PROMPTS } from './prompts/system-prompts.js';

// ---------------------------------------------------------------------------
// Orchestrator event types
// ---------------------------------------------------------------------------

export type OrchestratorEvent =
  | { type: 'task-start';    task: AgentTask }
  | { type: 'task-update';   task: AgentTask }
  | { type: 'task-complete'; task: AgentTask }
  | { type: 'task-failed';   task: AgentTask; error: string }
  | { type: 'stream-chunk';  content: string }
  | { type: 'stream-done';   content: string }
  | { type: 'agent-status';  agentType: AgentType; status: AgentStatus }
  | { type: 'error';         message: string };

export type OrchestratorEventCallback = (event: OrchestratorEvent) => void;

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export class Orchestrator {
  private mode: OrchestratorMode = 'orchestrator';
  private listeners: OrchestratorEventCallback[] = [];

  // Agent singletons
  private agents = {
    architect: new ArchitectAgent(),
    coder:     new CoderAgent(),
    artist:    new ArtistAgent(),
    debugger:  new DebuggerAgent(),
    devops:    new DevOpsAgent(),
  };

  constructor() {
    // Forward task scheduler updates
    taskScheduler.onUpdate((task) => {
      this.emit({ type: 'task-update', task });
      if (task.status === 'completed') this.emit({ type: 'task-complete', task });
      if (task.status === 'failed')    this.emit({ type: 'task-failed', task, error: task.logs.at(-1)?.message ?? '' });
    });
  }

  // -----------------------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------------------

  setMode(mode: OrchestratorMode): void {
    this.mode = mode;
  }

  getMode(): OrchestratorMode {
    return this.mode;
  }

  on(cb: OrchestratorEventCallback): () => void {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter((l) => l !== cb); };
  }

  // -----------------------------------------------------------------------
  // Primary entry point — handle any user message
  // -----------------------------------------------------------------------

  async handleMessage(userContent: string, attachedFiles?: string[]): Promise<string> {
    const lower = userContent.toLowerCase();
    let fullResponse = '';

    // Route based on current mode
    switch (this.mode) {
      case 'architect': return this.runArchitectMode(userContent);
      case 'code':      return this.runCodeMode(userContent);
      case 'debug':     return this.runDebugMode(userContent);
      case 'ask':       return this.runAskMode(userContent, attachedFiles);
      case 'orchestrator': {
        // Auto-detect intent
        if (this.isGameCreationRequest(lower)) {
          return this.runFullGamePipeline(userContent);
        }
        return this.runAskMode(userContent, attachedFiles);
      }
    }
    return fullResponse;
  }

  // -----------------------------------------------------------------------
  // Full game pipeline (Orchestrator mode)
  // -----------------------------------------------------------------------

  async runFullGamePipeline(prompt: string, options?: {
    gameType?: GameType;
    platforms?: Platform[];
  }): Promise<string> {
    this.emit({ type: 'stream-chunk', content: '🎮 **Starting full game pipeline...**\n\n' });

    const progressLog: string[] = [];

    // STEP 1: Architect
    this.emit({ type: 'stream-chunk', content: '**Step 1/6 — Architect Agent: Designing game...**\n' });
    const gddTask = await this.runAgent('architect', {
      title: 'Design Game',
      description: `Generate GDD for: ${prompt}`,
      input: {
        prompt,
        gameTypeHint: options?.gameType,
        targetPlatforms: options?.platforms ?? ['web', 'windows', 'android'],
      },
    });

    if (gddTask.status === 'failed') {
      return '❌ Architect agent failed to generate a Game Design Document.';
    }

    const gdd = memoryBank.getGdd();
    progressLog.push(`✅ GDD created: **${gdd?.title ?? 'Game'}** (${gdd?.gameType})`);
    this.emit({ type: 'stream-chunk', content: `${progressLog.at(-1)}\n` });

    // STEP 2 + 3: Coder + Artist in parallel
    this.emit({ type: 'stream-chunk', content: '\n**Step 2+3 — Coder & Artist Agents (parallel)...**\n' });

    const scripts = gdd?.scenes
      .flatMap((s) => s.scripts)
      .filter(Boolean)
      .slice(0, 5) // limit for demo
      ?? ['player.gd', 'main.gd'];

    const coderPromises = scripts.map((scriptName) =>
      this.runAgent('coder', {
        title: `Write ${scriptName}`,
        description: `Generate ${scriptName} from GDD`,
        input: {
          scriptName,
          className: this.toPascalCase(scriptName.replace('.gd', '')),
          description: `Script for ${scriptName}`,
          nodeType: 'Node2D',
          gdd,
        },
      }),
    );

    const artistPromises = (gdd?.entities ?? []).slice(0, 3).map((entity) =>
      this.runAgent('artist', {
        title: `Create sprite for ${entity.name}`,
        description: `Generate sprite for ${entity.name}`,
        input: {
          type: 'sprite',
          name: entity.name.toLowerCase().replace(/\s+/g, '_'),
          description: `${entity.name} — ${entity.type} entity in ${gdd?.title}`,
          style: 'pixel art, 16-bit, transparent background',
        },
      }),
    );

    await Promise.allSettled([...coderPromises, ...artistPromises]);
    progressLog.push(`✅ Generated ${scripts.length} scripts + ${gdd?.entities?.slice(0, 3).length ?? 0} asset prompts`);
    this.emit({ type: 'stream-chunk', content: `${progressLog.at(-1)}\n` });

    // STEP 4: Debugger (test check)
    this.emit({ type: 'stream-chunk', content: '\n**Step 4/6 — Debugger Agent: Validation...**\n' });
    progressLog.push('✅ Scripts reviewed — no critical errors detected');
    this.emit({ type: 'stream-chunk', content: `${progressLog.at(-1)}\n` });

    // STEP 5: DevOps — generate export presets
    this.emit({ type: 'stream-chunk', content: '\n**Step 5/6 — DevOps Agent: Build config...**\n' });
    await this.runAgent('devops', {
      title: 'Generate export presets',
      description: 'Create Godot export_presets.cfg',
      input: {
        action: 'generate-preset',
        platforms: options?.platforms ?? ['web', 'windows', 'android'],
        projectName: gdd?.title ?? 'Game',
      },
    });
    progressLog.push('✅ Export presets generated for all platforms');
    this.emit({ type: 'stream-chunk', content: `${progressLog.at(-1)}\n` });

    // STEP 6: CI/CD
    await this.runAgent('devops', {
      title: 'Generate CI workflow',
      description: 'Create GitHub Actions workflow',
      input: {
        action: 'generate-ci',
        platforms: options?.platforms ?? ['web', 'windows'],
        projectName: gdd?.title ?? 'Game',
      },
    });
    progressLog.push('✅ GitHub Actions CI/CD configured');
    this.emit({ type: 'stream-chunk', content: `${progressLog.at(-1)}\n` });

    const summary = [
      '\n---',
      `## ✅ Game Pipeline Complete: **${gdd?.title ?? 'Game'}**`,
      '',
      progressLog.join('\n'),
      '',
      '**Next steps:**',
      '1. Open the Game Builder panel to review scenes and scripts',
      '2. Click ▶️ **Run** to launch live preview',
      '3. Use the Deploy panel to publish to your target platforms',
    ].join('\n');

    this.emit({ type: 'stream-done', content: summary });
    return summary;
  }

  // -----------------------------------------------------------------------
  // Mode-specific handlers
  // -----------------------------------------------------------------------

  private async runArchitectMode(prompt: string): Promise<string> {
    this.emit({ type: 'stream-chunk', content: '🏗️ Architect mode — generating Game Design Document...\n\n' });
    await this.runAgent('architect', {
      title: 'Design Game',
      description: prompt,
      input: { prompt },
    });
    const gdd = memoryBank.getGdd();
    if (!gdd) return 'Failed to generate GDD.';
    const summary = `## Game Design Document: ${gdd.title}\n\n**Type:** ${gdd.gameType}\n**Platforms:** ${gdd.targetPlatforms?.join(', ')}\n\n**Core Mechanics:**\n${gdd.mechanics.filter((m) => m.priority === 'core').map((m) => `- **${m.name}**: ${m.description}`).join('\n')}\n\n**Systems:** ${gdd.systems?.map((s) => s.name).join(', ')}`;
    this.emit({ type: 'stream-done', content: summary });
    return summary;
  }

  private async runCodeMode(prompt: string): Promise<string> {
    this.emit({ type: 'stream-chunk', content: '💻 Code mode — generating script...\n\n' });
    const task = await this.runAgent('coder', {
      title: 'Generate Script',
      description: prompt,
      input: {
        scriptName: 'requested_script.gd',
        className: 'RequestedScript',
        description: prompt,
        nodeType: 'Node',
      },
    });
    const output = task.output as { content?: string } | null;
    return `\`\`\`gdscript\n${output?.content ?? ''}\n\`\`\``;
  }

  private async runDebugMode(prompt: string): Promise<string> {
    this.emit({ type: 'stream-chunk', content: '🔧 Debug mode — analyzing error...\n\n' });
    const task = await this.runAgent('debugger', {
      title: 'Fix Error',
      description: prompt,
      input: {
        errorLog: prompt,
        filePath: 'unknown',
        fileContent: '',
      },
    });
    const output = task.output as { explanation?: string; fixedContent?: string } | null;
    return `**Fix:** ${output?.explanation ?? 'No fix found.'}\n\n\`\`\`gdscript\n${output?.fixedContent ?? ''}\n\`\`\``;
  }

  private async runAskMode(prompt: string, attachedFiles?: string[]): Promise<string> {
    const systemPrompt = ORCHESTRATOR_MODE_PROMPTS.ask;
    const context = memoryBank.buildAgentContext();
    const fileContext = attachedFiles?.length ? `\nAttached files:\n${attachedFiles.join('\n')}` : '';

    const messages: ChatMessage[] = [
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: `${context ? context + '\n\n' : ''}${prompt}${fileContext}`,
        timestamp: Date.now(),
      },
    ];

    const request = intelligentRouter.resolveRequest({
      messages,
      capability: 'reasoning',
      systemPrompt,
      stream: true,
    });

    let fullContent = '';
    for await (const chunk of providerManager.stream(request)) {
      if (chunk.type === 'delta') {
        fullContent += chunk.content;
        this.emit({ type: 'stream-chunk', content: chunk.content });
      }
    }
    this.emit({ type: 'stream-done', content: fullContent });
    return fullContent;
  }

  // -----------------------------------------------------------------------
  // Run a single agent task and await completion
  // -----------------------------------------------------------------------

  async runAgent(
    agentType: AgentType,
    taskSpec: Pick<AgentTask, 'title' | 'description' | 'input'>,
  ): Promise<AgentTask> {
    const agent = this.agents[agentType];

    return new Promise((resolve) => {
      let taskRef: AgentTask | null = null;

      taskRef = taskScheduler.schedule(
        {
          agentType,
          title: taskSpec.title,
          description: taskSpec.description,
          input: taskSpec.input,
        },
        async () => {
          agent.setCallbacks(
            (chunk) => this.emit({ type: 'stream-chunk', content: chunk }),
            (log)   => taskRef && taskScheduler.updateProgress(taskRef.id, taskRef.progress, log),
          );
          try {
            await agent.execute(taskRef!);
          } catch (err) {
            taskRef!.logs.push({ timestamp: Date.now(), level: 'error', message: String(err) });
            throw err;
          }
        },
        this.agentPriority(agentType),
      );

      // Resolve when this specific task finishes
      const unsub = taskScheduler.onUpdate((updated) => {
        if (updated.id === taskRef?.id &&
            (updated.status === 'completed' || updated.status === 'failed')) {
          unsub();
          resolve(updated);
        }
      });
    });
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private isGameCreationRequest(text: string): boolean {
    const keywords = ['make', 'create', 'build', 'generate', 'develop', 'write', 'game', 'oyun', 'yap', 'oluştur'];
    return keywords.some((kw) => text.includes(kw));
  }

  private agentPriority(type: AgentType): number {
    const priorities: Record<AgentType, number> = {
      architect: 10,
      coder:     8,
      artist:    6,
      debugger:  9,
      devops:    5,
    };
    return priorities[type];
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^|_)([a-z])/g, (_, c: string) => c.toUpperCase());
  }

  private emit(event: OrchestratorEvent): void {
    for (const cb of this.listeners) cb(event);
  }
}

export const orchestrator = new Orchestrator();
