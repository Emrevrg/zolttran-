import type { CompletionRequest, CompletionResponse, StreamChunk } from '../../types/index.js';
import { BaseAdapter, type AdapterCredentials } from './base-adapter.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GoogleAdapter extends BaseAdapter {
  constructor(creds: AdapterCredentials) { super(creds); }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const url = `${BASE}/models/${req.model}:generateContent?key=${this.credentials.apiKey ?? ''}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.buildBody(req)) });
    if (!res.ok) throw new Error(`Google [${res.status}]: ${(await res.text()).slice(0, 300)}`);
    return this.parseResp(await res.json() as Record<string, unknown>, req.model);
  }

  async *stream(req: CompletionRequest): AsyncGenerator<StreamChunk> {
    const url = `${BASE}/models/${req.model}:streamGenerateContent?alt=sse&key=${this.credentials.apiKey ?? ''}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.buildBody(req)) });
    if (!res.ok) { yield { type: 'error', error: `Google [${res.status}]` }; return; }
    let pTok = 0, cTok = 0;
    for await (const chunk of this.parseSSE(res)) {
      const cands = chunk['candidates'] as Array<Record<string, unknown>> | undefined;
      const parts = ((cands?.[0]?.['content'] as Record<string, unknown> | undefined)?.['parts'] as Array<Record<string, unknown>>) ?? [];
      for (const p of parts) if (p['text']) yield { type: 'delta', content: String(p['text']) };
      const meta = chunk['usageMetadata'] as Record<string, unknown> | undefined;
      if (meta) { pTok = Number(meta['promptTokenCount'] ?? 0); cTok = Number(meta['candidatesTokenCount'] ?? 0); }
      const fin = String(cands?.[0]?.['finishReason'] ?? '');
      if (fin === 'STOP' || fin === 'MAX_TOKENS') {
        yield { type: 'done', finishReason: fin === 'MAX_TOKENS' ? 'length' : 'stop', usage: { promptTokens: pTok, completionTokens: cTok, totalTokens: pTok + cTok, estimatedCostUsd: 0 } };
        return;
      }
    }
  }

  private buildBody(req: CompletionRequest): Record<string, unknown> {
    const sys = req.messages.find((m) => m.role === 'system');
    const chat = req.messages.filter((m) => m.role !== 'system');
    return {
      ...(sys ? { systemInstruction: { parts: [{ text: sys.content }] } } : {}),
      contents: chat.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: typeof m.content === 'string' ? [{ text: m.content }] : m.content })),
      generationConfig: { temperature: req.temperature ?? 0.7, maxOutputTokens: req.maxTokens ?? 8192 },
    };
  }

  private parseResp(json: Record<string, unknown>, model: string): CompletionResponse {
    const cand = (json['candidates'] as Array<Record<string, unknown>>)[0]!;
    const parts = ((cand['content'] as Record<string, unknown>)?.['parts'] as Array<Record<string, unknown>>) ?? [];
    const text = parts.map((p) => String(p['text'] ?? '')).join('');
    const meta = (json['usageMetadata'] as Record<string, unknown>) ?? {};
    const p = Number(meta['promptTokenCount'] ?? 0), c = Number(meta['candidatesTokenCount'] ?? 0);
    return { id: '', content: text, model, finishReason: 'stop', usage: { promptTokens: p, completionTokens: c, totalTokens: p + c, estimatedCostUsd: 0 } };
  }
}
