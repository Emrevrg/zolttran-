/**
 * OpenAI-compatible adapter.
 * Works for: OpenAI, Groq, Mistral, DeepSeek, xAI, Cerebras, SambaNova,
 * SiliconFlow, GitHub Models, Qwen, Nebius, ZAI, Kilo, Custom.
 */
import type { CompletionRequest, CompletionResponse, StreamChunk, ToolCall } from '../../types/index.js';
import { BaseAdapter, type AdapterCredentials } from './base-adapter.js';

export class OpenAIAdapter extends BaseAdapter {
  protected baseUrl: string;

  constructor(credentials: AdapterCredentials, baseUrl: string) {
    super(credentials);
    this.baseUrl = (credentials.baseUrl ?? baseUrl).replace(/\/$/, '');
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(request, false)),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[${res.status}] ${err.slice(0, 300)}`);
    }
    const json = await res.json() as Record<string, unknown>;
    const choices = json['choices'] as Array<Record<string, unknown>>;
    const choice = choices[0]!;
    const message = choice['message'] as Record<string, unknown>;
    const usage = this.buildUsage((json['usage'] as Record<string, unknown>) ?? {});
    return {
      id: String(json['id'] ?? crypto.randomUUID()),
      content: String(message['content'] ?? ''),
      model: String(json['model'] ?? request.model),
      finishReason: (choice['finish_reason'] as CompletionResponse['finishReason']) ?? 'stop',
      usage,
      toolCalls: message['tool_calls'] as ToolCall[] | undefined,
    };
  }

  async *stream(request: CompletionRequest): AsyncGenerator<StreamChunk> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(request, true)),
    });
    if (!res.ok) {
      const err = await res.text();
      yield { type: 'error', error: `[${res.status}] ${err.slice(0, 300)}` };
      return;
    }
    const pendingToolCalls = new Map<string, ToolCall>();
    for await (const chunk of this.parseSSE(res)) {
      const choices = chunk['choices'] as Array<Record<string, unknown>> | undefined;
      if (!choices?.length) {
        const usage = chunk['usage'] as Record<string, unknown> | undefined;
        if (usage) yield { type: 'done', usage: this.buildUsage(usage), finishReason: 'stop' };
        continue;
      }
      const choice = choices[0]!;
      const delta = (choice['delta'] as Record<string, unknown>) ?? {};
      const finishReason = choice['finish_reason'] as string | null;
      if (delta['content']) yield { type: 'delta', content: String(delta['content']) };
      if (delta['tool_calls']) {
        this.parseToolCallsFromDelta(pendingToolCalls, delta);
        for (const tc of pendingToolCalls.values()) yield { type: 'tool_call', toolCall: tc };
      }
      if (finishReason) {
        yield { type: 'done', usage: this.buildUsage({}), finishReason };
        return;
      }
    }
  }

  protected buildBody(request: CompletionRequest, stream: boolean): Record<string, unknown> {
    const messages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
        ...(m.toolCalls ? { tool_calls: m.toolCalls } : {}),
      }));

    if (request.systemPrompt) messages.unshift({ role: 'system', content: request.systemPrompt });

    return {
      model: request.model,
      messages,
      temperature: request.temperature ?? 0.7,
      ...(request.maxTokens ? { max_tokens: request.maxTokens } : {}),
      stream,
      ...(stream ? { stream_options: { include_usage: true } } : {}),
      ...(request.tools?.length ? { tools: request.tools } : {}),
    };
  }
}
