import type { CompletionRequest, CompletionResponse, StreamChunk } from '../../types/index.js';
import { BaseAdapter, type AdapterCredentials } from './base-adapter.js';

const BASE = 'https://api.anthropic.com/v1';
const VERSION = '2023-06-01';

export class AnthropicAdapter extends BaseAdapter {
  constructor(creds: AdapterCredentials) { super(creds); }

  protected override buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.credentials.apiKey ?? '',
      'anthropic-version': VERSION,
      'anthropic-beta': 'tools-2024-05-16',
    };
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const res = await fetch(`${BASE}/messages`, {
      method: 'POST', headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(req, false)),
    });
    if (!res.ok) throw new Error(`Anthropic [${res.status}]: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json() as Record<string, unknown>;
    const blocks = (json['content'] as Array<Record<string, unknown>>)
      .filter((b) => b['type'] === 'text').map((b) => String(b['text'] ?? '')).join('');
    const u = (json['usage'] as Record<string, unknown>) ?? {};
    const p = Number(u['input_tokens'] ?? 0), c = Number(u['output_tokens'] ?? 0);
    return {
      id: String(json['id'] ?? ''),
      content: blocks,
      model: String(json['model'] ?? req.model),
      finishReason: this.mapStop(String(json['stop_reason'] ?? '')),
      usage: { promptTokens: p, completionTokens: c, totalTokens: p + c, estimatedCostUsd: 0 },
    };
  }

  async *stream(req: CompletionRequest): AsyncGenerator<StreamChunk> {
    const res = await fetch(`${BASE}/messages`, {
      method: 'POST', headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(req, true)),
    });
    if (!res.ok) { yield { type: 'error', error: `Anthropic [${res.status}]` }; return; }
    let inTok = 0, outTok = 0;
    for await (const ev of this.parseSSE(res)) {
      const t = ev['type'] as string;
      if (t === 'content_block_delta') {
        const d = ev['delta'] as Record<string, unknown>;
        if (d['type'] === 'text_delta') yield { type: 'delta', content: String(d['text'] ?? '') };
      } else if (t === 'message_start') {
        const u = (ev['message'] as Record<string, unknown>)?.['usage'] as Record<string, unknown> | undefined;
        inTok = Number(u?.['input_tokens'] ?? 0);
      } else if (t === 'message_delta') {
        const u = ev['usage'] as Record<string, unknown> | undefined;
        outTok = Number(u?.['output_tokens'] ?? 0);
        const stop = String((ev['delta'] as Record<string, unknown>)?.['stop_reason'] ?? '');
        if (stop) yield { type: 'done', finishReason: this.mapStop(stop), usage: { promptTokens: inTok, completionTokens: outTok, totalTokens: inTok + outTok, estimatedCostUsd: 0 } };
      } else if (t === 'error') {
        yield { type: 'error', error: String((ev['error'] as Record<string, unknown>)?.['message'] ?? 'Anthropic error') };
      }
    }
  }

  private buildBody(req: CompletionRequest, stream: boolean): Record<string, unknown> {
    const msgs = req.messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content }));
    const sys = req.systemPrompt ?? req.messages.find((m) => m.role === 'system')?.content;
    return { model: req.model, messages: msgs, ...(sys ? { system: sys } : {}), max_tokens: req.maxTokens ?? 8192, temperature: req.temperature ?? 0.7, stream, ...(req.tools?.length ? { tools: req.tools.map((t) => t.function) } : {}) };
  }

  private mapStop(r: string): CompletionResponse['finishReason'] {
    return r === 'max_tokens' ? 'length' : r === 'tool_use' ? 'tool_calls' : 'stop';
  }
}
