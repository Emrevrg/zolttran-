/**
 * Base adapter — shared SSE parsing + tool-call accumulation.
 */
import type { CompletionRequest, CompletionResponse, StreamChunk, TokenUsage, ToolCall } from '../../types/index.js';

export interface AdapterCredentials {
  apiKey?: string;
  baseUrl?: string;
  headers?: Record<string, string>;
}

export abstract class BaseAdapter {
  protected credentials: AdapterCredentials;

  constructor(credentials: AdapterCredentials = {}) {
    this.credentials = credentials;
  }

  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;
  abstract stream(request: CompletionRequest): AsyncGenerator<StreamChunk>;

  protected buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extra,
      ...(this.credentials.headers ?? {}),
    };
    if (this.credentials.apiKey) {
      headers['Authorization'] = `Bearer ${this.credentials.apiKey}`;
    }
    return headers;
  }

  protected parseToolCallsFromDelta(
    accumulated: Map<string, ToolCall>,
    delta: Record<string, unknown>,
  ): void {
    const calls = delta['tool_calls'] as Array<{
      index: number;
      id?: string;
      function?: { name?: string; arguments?: string };
    }> | undefined;
    if (!calls) return;
    for (const call of calls) {
      const idx = String(call.index);
      if (!accumulated.has(idx)) {
        accumulated.set(idx, { id: call.id ?? idx, type: 'function', function: { name: '', arguments: '' } });
      }
      const existing = accumulated.get(idx)!;
      if (call.function?.name) existing.function.name += call.function.name;
      if (call.function?.arguments) existing.function.arguments += call.function.arguments;
    }
  }

  protected buildUsage(raw: Record<string, unknown>): TokenUsage {
    const prompt = Number(raw['prompt_tokens'] ?? raw['input_tokens'] ?? 0);
    const completion = Number(raw['completion_tokens'] ?? raw['output_tokens'] ?? 0);
    return {
      promptTokens: prompt,
      completionTokens: completion,
      totalTokens: prompt + completion,
      estimatedCostUsd: 0,
    };
  }

  protected async *parseSSE(response: Response): AsyncGenerator<Record<string, unknown>> {
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          try { yield JSON.parse(data) as Record<string, unknown>; } catch { /* skip malformed */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
