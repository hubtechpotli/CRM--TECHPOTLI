import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClickHouseService {
  private readonly logger = new Logger(ClickHouseService.name);
  private readonly baseUrl: string;
  private enabled = false;

  constructor(config: ConfigService) {
    const host = config.get('CLICKHOUSE_URL') || 'http://clickhouse:8123';
    this.baseUrl = host.replace(/\/$/, '');
    this.enabled = config.get('ENABLE_CLICKHOUSE') === 'true';
  }

  isEnabled() {
    return this.enabled;
  }

  async ping(): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      const res = await fetch(`${this.baseUrl}/?query=SELECT%201`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async insertEvent(table: string, row: Record<string, unknown>) {
    if (!this.enabled) return;
    const columns = Object.keys(row).join(',');
    const values = Object.values(row)
      .map((v) => (typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v))
      .join(',');
    const query = `INSERT INTO ${table} (${columns}) VALUES (${values})`;
    try {
      await fetch(`${this.baseUrl}/?query=${encodeURIComponent(query)}`, { method: 'POST' });
    } catch (err) {
      this.logger.warn(`ClickHouse insert failed: ${(err as Error).message}`);
    }
  }
}
