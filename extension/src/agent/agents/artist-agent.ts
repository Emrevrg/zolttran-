/**
 * Artist Agent — generates game asset specs, shaders, and resource files.
 */
import type {
  AgentType,
  AgentConfig,
  AgentTask,
  ChatMessage,
} from '../../types/index.js';
import { BaseAgent } from './base-agent.js';
import { memoryBank } from '../memory-bank.js';
import { AGENT_SYSTEM_PROMPTS } from '../prompts/system-prompts.js';

export interface ArtistInput {
  type: 'sprite' | 'shader' | 'theme' | 'material' | 'effect';
  name: string;
  description: string;
  style?: string;
  dimensions?: { width: number; height: number };
  palette?: string[];
}

export interface ArtistOutput {
  type: ArtistInput['type'];
  name: string;
  /** For shaders/themes: the actual file content */
  content?: string;
  /** For raster assets: the generation prompt to be used with an image API */
  imagePrompt?: string;
  /** Target file path in Godot project */
  filePath: string;
  resourceContent?: string;
}

export class ArtistAgent extends BaseAgent {
  readonly type: AgentType = 'artist';
  readonly config: AgentConfig = {
    type: 'artist',
    name: 'Artist',
    description: 'Game asset generation specialist',
    preferredModels: ['gemini-3-pro', 'claude-sonnet-4-5-20260201'],
    fallbackModels: ['nvidia/nemotron-omni-7b', 'google/gemma-4-31b:free'],
    systemPrompt: AGENT_SYSTEM_PROMPTS.artist,
    tools: [],
    maxIterations: 2,
    temperature: 0.9,
  };

  async execute(task: AgentTask): Promise<ArtistOutput> {
    const input = task.input as ArtistInput;
    this.log('info', `Generating ${input.type}: ${input.name}`);

    switch (input.type) {
      case 'shader':   return this.generateShader(input, task);
      case 'theme':    return this.generateTheme(input, task);
      case 'material': return this.generateMaterial(input, task);
      default:         return this.generateImagePrompt(input, task);
    }
  }

  private async generateShader(input: ArtistInput, task: AgentTask): Promise<ArtistOutput> {
    const gdd = memoryBank.getGdd();
    const prompt = `Write a Godot 4 shader (.gdshader) for: ${input.name}
Description: ${input.description}
Style: ${input.style ?? 'pixel art, 2D'}
${gdd ? `Game genre: ${gdd.genre.join(', ')}` : ''}

Requirements:
- Use Godot 4 shader language (not GLSL directly)
- Include shader_type (canvas_item for 2D, spatial for 3D)
- Add uniform variables for designer tweaking
- Include helpful comments

Return ONLY the shader code.`;

    const messages: ChatMessage[] = [{ id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: Date.now() }];
    const output = await this.runCompletion(messages, 'asset-generation');
    const content = this.extractCode(output, 'glsl') || this.extractCode(output, '');

    const result: ArtistOutput = {
      type: 'shader',
      name: input.name,
      content,
      filePath: `assets/shaders/${input.name}.gdshader`,
    };
    task.output = result;
    return result;
  }

  private async generateTheme(input: ArtistInput, task: AgentTask): Promise<ArtistOutput> {
    const palette = input.palette ?? ['#6366f1', '#8b5cf6', '#06b6d4', '#1e1b4b', '#ffffff'];
    const prompt = `Generate a Godot 4 UI Theme (.tres) for: ${input.name}
Description: ${input.description}
Color palette: ${palette.join(', ')}

Return a valid Godot .tres resource file for a Theme resource.
Use this format:
[gd_resource type="Theme" ...]
[resource]
...`;

    const messages: ChatMessage[] = [{ id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: Date.now() }];
    const output = await this.runCompletion(messages, 'asset-generation');
    const content = this.extractCode(output, '') || output;

    const result: ArtistOutput = {
      type: 'theme',
      name: input.name,
      content,
      filePath: `assets/themes/${input.name}.tres`,
    };
    task.output = result;
    return result;
  }

  private async generateMaterial(input: ArtistInput, task: AgentTask): Promise<ArtistOutput> {
    const prompt = `Generate a Godot 4 StandardMaterial3D or ORMMaterial3D .tres file for: ${input.name}
Description: ${input.description}

Return a valid Godot .tres resource file.`;

    const messages: ChatMessage[] = [{ id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: Date.now() }];
    const output = await this.runCompletion(messages, 'asset-generation');

    const result: ArtistOutput = {
      type: 'material',
      name: input.name,
      content: output,
      filePath: `assets/materials/${input.name}.tres`,
    };
    task.output = result;
    return result;
  }

  private async generateImagePrompt(input: ArtistInput, task: AgentTask): Promise<ArtistOutput> {
    const gdd = memoryBank.getGdd();
    const prompt = `Create an optimal image generation prompt for: ${input.name}
Type: ${input.type} (for a game sprite/asset)
Description: ${input.description}
Style: ${input.style ?? 'pixel art, 16-bit, clean outlines, transparent background'}
${gdd ? `Game: ${gdd.title} (${gdd.genre.join(', ')})` : ''}
${input.dimensions ? `Size hint: ${input.dimensions.width}x${input.dimensions.height}px` : ''}

Return JSON: { "prompt": string, "negativePrompt": string, "style": string }`;

    const messages: ChatMessage[] = [{ id: crypto.randomUUID(), role: 'user', content: prompt, timestamp: Date.now() }];
    const output = await this.runCompletion(messages, 'asset-generation');

    let imagePrompt = input.description;
    try {
      const parsed = this.parseJson<{ prompt: string }>(output);
      imagePrompt = parsed.prompt;
    } catch {
      imagePrompt = output.trim();
    }

    const ext = input.type === 'sprite' ? 'png' : 'png';
    const folder = input.type === 'sprite' ? 'sprites' : 'ui';

    const result: ArtistOutput = {
      type: input.type,
      name: input.name,
      imagePrompt,
      filePath: `assets/${folder}/${input.name}.${ext}`,
    };
    task.output = result;
    return result;
  }
}
