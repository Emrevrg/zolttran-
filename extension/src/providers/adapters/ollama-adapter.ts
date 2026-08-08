import type { CompletionRequest, CompletionResponse, StreamChunk } from '../../types/index.js';
import { OpenAIAdapter } from './openai-adapter.js';
import type { AdapterCredentials } from './base-adapter.js';

export class OllamaAdapter extends OpenAIAdapter {
  private ollamaBase: string;

  constructor(creds: AdapterCredentials = {}, baseUrl = 'http://localhost:11434/v1') {
    super({ ...creds, apiKey: 'ollama' }, baseUrl);
    this.ollamaBase = baseUrl.replace('/v1', '');
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.ollamaBase}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return [];
      const json = await res.json() as { models?: Array<{ name: string }> };
      return (json.models ?? []).map((m) => m.name);
    } catch { return []; }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.ollamaBase}/`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch { return false; }
  }

  override async complete(req: CompletionRequest): Promise<CompletionResponse> {
    if (!await this.isAvailable()) throw new Error('Ollama çalışmıyor. Başlatmak için: ollama serve');
    return super.complete(req);
  }

  override async *stream(req: CompletionRequest): AsyncGenerator<StreamChunk> {
    if (!await this.isAvailable()) { yield { type: 'error', error: 'Ollama çalışmıyor. Başlatmak için: ollama serve' }; return; }
    yield* super.stream(req);
  }
}
