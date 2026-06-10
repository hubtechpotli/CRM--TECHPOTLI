import { ConfigService } from '@nestjs/config';

export function bullConnectionFactory(config: ConfigService) {
  const url = config.get<string>('REDIS_URL');
  return { connection: url ? { url } : { host: '127.0.0.1', port: 6379 } };
}
