/**
 * Debugger Agent — reads Godot error logs, runs GUT tests, applies fixes.
 */
import type {
  AgentType,
  AgentConfig,
  AgentTask,
  ChatMessage,
} from '../../types/index.js';
import { BaseAgent } from './base-agent.js';
import { memoryBank } from '../memory-bank.js';
import { AGENT_SYSTEM_PROMPTS, DEBUG_PROMPT_TEMPLATE } from '../prompts/system-prompts.js';

export interface DebuggerInput {
  errorLog: string;
  filePath: string;
  fileContent: string;
  additionalContext?: string;
}

export interface DebuggerOutput {
  fixedContent: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  testsToAdd?: string;
}

export interface TestGenInput {
  scriptPath: string;
  scriptContent: string;
  testDescription: string;
}

export interface TestGenOutput {
  testPath: string;
  testContent: string;
}

export class DebuggerAgent extends BaseAgent {
  readonly type: AgentType = 'debugger';
  readonly config: AgentConfig = {
    type: 'debugger',
    name: 'Debugger',
    description: 'Godot error analysis, testing, and bug fixing',
    preferredModels: ['claude-sonnet-4-5-20260201', 'deepseek-v4-pro'],
    fallbackModels: ['qwen/qwen3-coder-480b:free', 'openai/gpt-oss-120b:free'],
    systemPrompt: AGENT_SYSTEM_PROMPTS.debugger,
    tools: [],
    maxIterations: 4,
    temperature: 0.2,
  };

  async execute(task: AgentTask): Promise<DebuggerOutput | TestGenOutput> {
    const input = task.input as (DebuggerInput | TestGenInput);

    if ('testDescription' in input) {
      return this.generateTest(input as TestGenInput, task);
    }
    return this.fixError(input as DebuggerInput, task);
  }

  private async fixError(input: DebuggerInput, task: AgentTask): Promise<DebuggerOutput> {
    this.log('info', `Fixing error in: ${input.filePath}`);

    const projectContext = memoryBank.buildAgentContext();
    const prompt = DEBUG_PROMPT_TEMPLATE
      .replace('{ERROR_LOG}', input.errorLog)
      .replace('{FILE_PATH}', input.filePath)
      .replace('{FILE_CONTENT}', input.fileContent)
      .replace('{PROJECT_CONTEXT}', projectContext || 'No context available.');

    const messages: ChatMessage[] = [{ id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: Date.now() }];

    let result: DebuggerOutput = {
      fixedContent: input.fileContent,
      explanation: 'Could not determine fix.',
      confidence: 'low',
    };

    for (let attempt = 0; attempt < this.config.maxIterations; attempt++) {
      try {
        const output = await this.runCompletion(messages, 'debugging');
        const parsed = this.parseJson<DebuggerOutput>(output);
        if (parsed.fixedContent && parsed.explanation) {
          result = parsed;
          break;
        }
      } catch {
        // Try to extract the code directly
        const code = this.extractCode(await this.runCompletion(messages, 'debugging'), 'gdscript');
        if (code) {
          result = { fixedContent: code, explanation: 'Applied fix.', confidence: 'medium' };
          break;
        }
      }
    }

    this.log('info', `Fix confidence: ${result.confidence} — ${result.explanation}`);

    // Update memory
    memoryBank.setContextFile(input.filePath, result.fixedContent);
    memoryBank.addLearning(
      `Bug in ${input.filePath}: ${result.explanation}`,
      ['bug-fix', input.filePath.split('/').pop() ?? ''],
    );

    task.output = result;
    return result;
  }

  private async generateTest(input: TestGenInput, task: AgentTask): Promise<TestGenOutput> {
    this.log('info', `Generating GUT test for: ${input.scriptPath}`);

    const prompt = `Generate a GUT (Godot Unit Testing) test file for:
Script: ${input.scriptPath}
Test description: ${input.testDescription}

Script content:
${input.scriptContent}

GUT test format:
extends GutTest

func before_each():
    # setup

func test_<name>():
    # assertions using assert_eq, assert_true, assert_not_null, etc.

Return ONLY the GDScript test file.`;

    const messages: ChatMessage[] = [{ id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: Date.now() }];
    const output = await this.runCompletion(messages, 'debugging');
    const testContent = this.extractCode(output, 'gdscript') || output;

    const scriptBaseName = input.scriptPath.split('/').pop()?.replace('.gd', '') ?? 'script';
    const result: TestGenOutput = {
      testPath: `tests/test_${scriptBaseName}.gd`,
      testContent,
    };
    task.output = result;
    return result;
  }
}
