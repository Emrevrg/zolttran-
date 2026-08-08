import { OpenAIAdapter } from './openai-adapter.js';
import type { AdapterCredentials } from './base-adapter.js';

export class OpenRouterAdapter extends OpenAIAdapter {
  constructor(creds: AdapterCredentials) {
    super(creds, 'https://openrouter.ai/api/v1');
  }
  protected override buildHeaders(): Record<string, string> {
    return {
      ...super.buildHeaders(),
      'HTTP-Referer': 'https://github.com/zolttran/zolttran',
      'X-Title': 'Zolttran AI Game Studio',
    };
  }
}
