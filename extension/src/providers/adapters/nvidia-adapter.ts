import { OpenAIAdapter } from './openai-adapter.js';
import type { AdapterCredentials } from './base-adapter.js';

export class NvidiaAdapter extends OpenAIAdapter {
  constructor(creds: AdapterCredentials) {
    super(creds, 'https://integrate.api.nvidia.com/v1');
  }
}
