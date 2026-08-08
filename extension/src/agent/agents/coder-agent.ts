/**
 * Coder Agent — generates and fixes GDScript/C# files for Godot 4.
 */
import type {
  AgentType,
  AgentConfig,
  AgentTask,
  ChatMessage,
  GameDesignDocument,
} from '../../types/index.js';
import { BaseAgent } from './base-agent.js';
import { memoryBank } from '../memory-bank.js';
import { AGENT_SYSTEM_PROMPTS, CODE_GENERATION_PROMPT_TEMPLATE } from '../prompts/system-prompts.js';

export interface CoderInput {
  scriptName: string;
  className: string;
  description: string;
  nodeType: string;
  signals?: string;
  exports?: string;
  dependencies?: string;
  gdd?: GameDesignDocument;
  existingContent?: string;
  errorLog?: string;
}

export interface CoderOutput {
  scriptPath: string;
  content: string;
  language: 'gdscript' | 'csharp';
  errors: string[];
}

export class CoderAgent extends BaseAgent {
  readonly type: AgentType = 'coder';
  readonly config: AgentConfig = {
    type: 'coder',
    name: 'Coder',
    description: 'GDScript/C# code generation specialist',
    preferredModels: ['claude-sonnet-4-5-20260201', 'deepseek-coder-v3'],
    fallbackModels: ['qwen/qwen3-coder-480b:free', 'poolside/laguna-s-2.1:free'],
    systemPrompt: AGENT_SYSTEM_PROMPTS.coder,
    tools: [],
    maxIterations: 5,
    temperature: 0.3,
  };

  async execute(task: AgentTask): Promise<CoderOutput> {
    const input = task.input as CoderInput;
    this.log('info', `Generating script: ${input.scriptName}`);

    const gdd = input.gdd ?? memoryBank.getGdd();
    const gddContext = gdd
      ? `Title: ${gdd.title}\nType: ${gdd.gameType}\nMechanics: ${gdd.mechanics.map((m) => m.name).join(', ')}`
      : 'No GDD available.';

    // If there is an error to fix, use the fix prompt
    if (input.errorLog && input.existingContent) {
      return this.fixScript(input, task);
    }

    const prompt = CODE_GENERATION_PROMPT_TEMPLATE
      .replace('{GDD_CONTEXT}', gddContext)
      .replace('{SCRIPT_NAME}', input.scriptName)
      .replace('{DESCRIPTION}', input.description)
      .replace('{NODE_TYPE}', input.nodeType)
      .replace('{SIGNALS}', input.signals ?? 'none')
      .replace('{EXPORTS}', input.exports ?? 'none')
      .replace('{DEPENDENCIES}', input.dependencies ?? 'none')
      .replace('{CLASS_NAME}', input.className);

    const messages: ChatMessage[] = this.buildContextMessages(prompt);
    let code = '';

    for (let attempt = 0; attempt < this.config.maxIterations; attempt++) {
      this.log('info', `Code generation attempt ${attempt + 1}`);
      try {
        const output = await this.runCompletion(
          attempt === 0 ? messages : [
            ...messages,
            { id: crypto.randomUUID(), role: 'assistant', content: code, timestamp: Date.now() },
            { id: crypto.randomUUID(), role: 'user', content: 'Fix any syntax errors and return the complete corrected script.', timestamp: Date.now() },
          ],
          'code-generation',
        );
        code = this.extractCode(output, 'gdscript') || this.extractCode(output, '');
        if (this.looksValid(code)) break;
      } catch (err) {
        this.log('warn', `Attempt ${attempt + 1} failed: ${String(err)}`);
      }
    }

    if (!code) throw new Error(`Failed to generate ${input.scriptName}`);

    const result: CoderOutput = {
      scriptPath: `scripts/${input.scriptName}`,
      content: code,
      language: 'gdscript',
      errors: [],
    };

    memoryBank.setContextFile(`scripts/${input.scriptName}`, code);
    task.output = result;
    return result;
  }

  private async fixScript(input: CoderInput, task: AgentTask): Promise<CoderOutput> {
    this.log('info', `Fixing script: ${input.scriptName}`);
    const fixPrompt = `Fix the following Godot 4 GDScript error.\n\nError:\n${input.errorLog}\n\nCurrent script (${input.scriptName}):\n${input.existingContent}\n\nReturn ONLY the corrected GDScript, no explanations.`;
    const messages: ChatMessage[] = [{
      id: crypto.randomUUID(),
      role: 'user',
      content: fixPrompt,
      timestamp: Date.now(),
    }];

    let fixed = input.existingContent ?? '';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const output = await this.runCompletion(messages, 'debugging');
        fixed = this.extractCode(output, 'gdscript') || this.extractCode(output, '');
        if (this.looksValid(fixed)) break;
      } catch (err) {
        this.log('warn', `Fix attempt ${attempt + 1} failed`);
      }
    }

    const result: CoderOutput = {
      scriptPath: `scripts/${input.scriptName}`,
      content: fixed,
      language: 'gdscript',
      errors: [],
    };
    task.output = result;
    return result;
  }

  private looksValid(code: string): boolean {
    if (!code.trim()) return false;
    // Basic sanity: GDScript files don't start with { or [
    if (code.trim().startsWith('{') || code.trim().startsWith('[')) return false;
    // Must have at least one func or var
    return /\b(func|var|class_name|extends)\b/.test(code);
  }
}
