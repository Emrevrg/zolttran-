/**
 * Architect Agent — produces Game Design Documents from natural language prompts.
 */
import type {
  AgentType,
  AgentConfig,
  AgentTask,
  ChatMessage,
  GameDesignDocument,
  GameType,
  Platform,
} from '../../types/index.js';
import { BaseAgent } from './base-agent.js';
import { memoryBank } from '../memory-bank.js';
import { AGENT_SYSTEM_PROMPTS, GAME_DESIGN_PROMPT_TEMPLATE } from '../prompts/system-prompts.js';
import { GAME_TEMPLATES } from '../prompts/game-templates.js';

export interface ArchitectInput {
  prompt: string;
  gameTypeHint?: GameType;
  targetPlatforms?: Platform[];
  constraints?: string;
}

export class ArchitectAgent extends BaseAgent {
  readonly type: AgentType = 'architect';
  readonly config: AgentConfig = {
    type: 'architect',
    name: 'Architect',
    description: 'Game designer and systems architect',
    preferredModels: ['claude-opus-4-8-20260201', 'gemini-3-pro', 'gpt-5.5'],
    fallbackModels: ['nvidia/nemotron-3-ultra-550b:free', 'google/gemma-4-31b:free'],
    systemPrompt: AGENT_SYSTEM_PROMPTS.architect,
    tools: [],
    maxIterations: 3,
    temperature: 0.8,
  };

  async execute(task: AgentTask): Promise<GameDesignDocument> {
    const input = task.input as ArchitectInput;
    this.log('info', `Designing game: "${input.prompt}"`);

    // Check for matching template
    const templateGdd = this.getTemplateGdd(input.gameTypeHint);

    const userPrompt = GAME_DESIGN_PROMPT_TEMPLATE
      .replace('{CONCEPT}', input.prompt)
      .replace('{PLATFORMS}', (input.targetPlatforms ?? ['web', 'windows']).join(', '))
      .replace('{GAME_TYPE}', input.gameTypeHint ?? 'auto-detect from concept')
      .replace('{CONSTRAINTS}', input.constraints ?? 'none');

    const messages: ChatMessage[] = [
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: templateGdd
          ? `Base template:\n${JSON.stringify(templateGdd, null, 2)}\n\n${userPrompt}`
          : userPrompt,
        timestamp: Date.now(),
      },
    ];

    let gdd: GameDesignDocument | null = null;
    let lastError: string | null = null;

    for (let attempt = 0; attempt < this.config.maxIterations; attempt++) {
      this.log('info', `GDD generation attempt ${attempt + 1}`);

      const msgList: ChatMessage[] = attempt === 0
        ? messages
        : [
            ...messages,
            { id: crypto.randomUUID(), role: 'assistant', content: lastError ?? '', timestamp: Date.now() },
            { id: crypto.randomUUID(), role: 'user', content: `The JSON was invalid: ${lastError}. Please fix it and return only valid JSON.`, timestamp: Date.now() },
          ];

      try {
        const output = await this.runCompletion(msgList, 'game-design');
        gdd = this.parseJson<GameDesignDocument>(output);
        gdd.id = crypto.randomUUID();
        gdd.createdAt = Date.now();
        gdd.updatedAt = Date.now();
        this.log('info', `GDD created: "${gdd.title}" (${gdd.gameType})`);
        break;
      } catch (err) {
        lastError = String(err);
        this.log('warn', `JSON parse failed on attempt ${attempt + 1}: ${lastError}`);
      }
    }

    if (!gdd) throw new Error('Failed to generate GDD after max attempts');

    // Persist to memory bank
    memoryBank.setGdd(gdd);
    memoryBank.addDecision(
      `Game concept: ${gdd.title}`,
      `Type: ${gdd.gameType}, Mechanics: ${gdd.mechanics.map((m) => m.name).join(', ')}`,
    );

    task.output = gdd;
    return gdd;
  }

  private getTemplateGdd(gameType?: GameType): Partial<GameDesignDocument> | null {
    if (!gameType || gameType === 'custom') return null;
    return GAME_TEMPLATES[gameType]?.defaultGdd ?? null;
  }
}
