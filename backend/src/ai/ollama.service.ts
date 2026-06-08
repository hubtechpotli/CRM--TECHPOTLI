import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import CircuitBreaker from 'opossum';

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly embedModel: string;
  private readonly breaker: CircuitBreaker<[string, string?], string>;

  constructor(config: ConfigService) {
    this.baseUrl = config.get('OLLAMA_BASE_URL') || 'http://localhost:11434';
    this.model = config.get('OLLAMA_MODEL') || 'llama3.2';
    this.embedModel = config.get('OLLAMA_EMBED_MODEL') || 'nomic-embed-text';
    this.breaker = new CircuitBreaker(this.callGenerate.bind(this), {
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 60000,
    });
    this.breaker.fallback(() => '');
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async callGenerate(prompt: string, system?: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: system ? `${system}\n\n${prompt}` : prompt,
        stream: false,
        options: { temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    const data = (await res.json()) as { response?: string };
    return data.response?.trim() || '';
  }

  async generate(prompt: string, system?: string): Promise<string> {
    const start = Date.now();
    try {
      const result = await this.breaker.fire(prompt, system);
      this.logger.debug(`Ollama generate ${Date.now() - start}ms`);
      return result;
    } catch (err) {
      this.logger.warn(`Ollama unavailable: ${(err as Error).message}`);
      return '';
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.embedModel, prompt: text }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { embedding?: number[] };
      return data.embedding || [];
    } catch {
      return [];
    }
  }
}
