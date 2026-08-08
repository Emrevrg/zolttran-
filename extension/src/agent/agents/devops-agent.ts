/**
 * DevOps Agent — build configurations, export presets, and deploy instructions.
 */
import type {
  AgentType,
  AgentConfig,
  AgentTask,
  ChatMessage,
  Platform,
  HostingService,
} from '../../types/index.js';
import { BaseAgent } from './base-agent.js';
import { AGENT_SYSTEM_PROMPTS } from '../prompts/system-prompts.js';

export interface DevOpsInput {
  action: 'generate-preset' | 'generate-ci' | 'generate-deploy-config' | 'generate-version';
  platforms?: Platform[];
  hosting?: HostingService;
  projectName?: string;
  currentVersion?: string;
  changeType?: 'patch' | 'minor' | 'major';
}

export interface DevOpsOutput {
  action: DevOpsInput['action'];
  content: string;
  filePath: string;
  instructions?: string;
}

export class DevOpsAgent extends BaseAgent {
  readonly type: AgentType = 'devops';
  readonly config: AgentConfig = {
    type: 'devops',
    name: 'DevOps',
    description: 'Build, deploy, and CI/CD specialist',
    preferredModels: ['openai/gpt-oss-120b:free', 'claude-sonnet-4-5-20260201'],
    fallbackModels: ['nvidia/nemotron-nano-30b', 'google/gemma-4-31b:free'],
    systemPrompt: AGENT_SYSTEM_PROMPTS.devops,
    tools: [],
    maxIterations: 2,
    temperature: 0.3,
  };

  async execute(task: AgentTask): Promise<DevOpsOutput> {
    const input = task.input as DevOpsInput;
    this.log('info', `DevOps action: ${input.action}`);

    switch (input.action) {
      case 'generate-preset': return this.generateExportPreset(input, task);
      case 'generate-ci':     return this.generateCIConfig(input, task);
      case 'generate-deploy-config': return this.generateDeployConfig(input, task);
      case 'generate-version': return this.bumpVersion(input, task);
      default: throw new Error(`Unknown DevOps action: ${input.action}`);
    }
  }

  private async generateExportPreset(input: DevOpsInput, task: AgentTask): Promise<DevOpsOutput> {
    const platforms = input.platforms ?? ['web', 'windows', 'android'];
    const prompt = `Generate a Godot 4 export_presets.cfg file for project: ${input.projectName ?? 'MyGame'}

Target platforms: ${platforms.join(', ')}

Requirements:
- Web: HTML5 export with Compatibility renderer, VRAM compression OFF
- Windows: x86_64, PCK embedded
- Android: ARM64, use Gradle build
- macOS: Universal binary (Apple Silicon + Intel)
- Linux: x86_64 AppImage

Return ONLY the export_presets.cfg content.`;

    const messages: ChatMessage[] = [{ id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: Date.now() }];
    const output = await this.runCompletion(messages, 'documentation');

    const result: DevOpsOutput = {
      action: 'generate-preset',
      content: this.extractCode(output, '') || output,
      filePath: 'export_presets.cfg',
      instructions: 'Place this file in the root of your Godot project.',
    };
    task.output = result;
    return result;
  }

  private async generateCIConfig(input: DevOpsInput, task: AgentTask): Promise<DevOpsOutput> {
    const platforms = input.platforms ?? ['web', 'windows'];
    const prompt = `Generate a GitHub Actions workflow (.github/workflows/build.yml) that:
1. Exports a Godot 4 project for: ${platforms.join(', ')}
2. Uses abaiolex/godot-ci Docker image
3. Uploads artifacts for each platform
4. Triggers on push to main branch

Project name: ${input.projectName ?? 'MyGame'}

Return ONLY the YAML content.`;

    const messages: ChatMessage[] = [{ id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: Date.now() }];
    const output = await this.runCompletion(messages, 'documentation');

    const result: DevOpsOutput = {
      action: 'generate-ci',
      content: this.extractCode(output, 'yaml') || this.extractCode(output, '') || output,
      filePath: '.github/workflows/build.yml',
      instructions: 'Add GODOT_VERSION, ITCHIO_API_KEY secrets in your GitHub repository settings.',
    };
    task.output = result;
    return result;
  }

  private async generateDeployConfig(input: DevOpsInput, task: AgentTask): Promise<DevOpsOutput> {
    const hosting = input.hosting ?? 'itch-io';
    const prompt = `Generate deployment configuration for ${hosting}.
Project: ${input.projectName ?? 'MyGame'}
Hosting: ${hosting}

Include:
- Required credentials/secrets
- CLI commands to deploy
- File structure requirements
- Step-by-step instructions

Format as a shell script with comments.`;

    const messages: ChatMessage[] = [{ id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: Date.now() }];
    const output = await this.runCompletion(messages, 'documentation');

    const result: DevOpsOutput = {
      action: 'generate-deploy-config',
      content: this.extractCode(output, 'bash') || this.extractCode(output, 'sh') || output,
      filePath: `deploy-${hosting}.sh`,
    };
    task.output = result;
    return result;
  }

  private async bumpVersion(_input: DevOpsInput, task: AgentTask): Promise<DevOpsOutput> {
    const current = _input.currentVersion ?? '0.1.0';
    const type = _input.changeType ?? 'patch';
    const parts = current.split('.').map(Number);
    let [major = 0, minor = 0, patch = 0] = parts;

    if (type === 'major') { major++; minor = 0; patch = 0; }
    else if (type === 'minor') { minor++; patch = 0; }
    else { patch++; }

    const newVersion = `${major}.${minor}.${patch}`;
    this.log('info', `Version bump: ${current} → ${newVersion}`);

    const result: DevOpsOutput = {
      action: 'generate-version',
      content: newVersion,
      filePath: 'version.txt',
      instructions: `Update project.godot: config/version="${newVersion}"`,
    };
    task.output = result;
    return result;
  }
}
