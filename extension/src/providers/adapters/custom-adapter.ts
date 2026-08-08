import { OpenAIAdapter } from './openai-adapter.js';
import type { AdapterCredentials } from './base-adapter.js';

export class CustomAdapter extends OpenAIAdapter {
  constructor(creds: AdapterCredentials) {
    super(creds, creds.baseUrl ?? 'http://localhost:8000/v1');
  }
}
