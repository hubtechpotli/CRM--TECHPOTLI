import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { KafkaService } from '../events/kafka.service';
import { OllamaService } from '../ai/ollama.service';
import { ClickHouseService } from '../analytics/clickhouse.service';
import { Public, Roles } from '../common/decorators/metadata.decorator';
import { RolesGuard } from '../common/guards/auth.guards';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private kafka: KafkaService,
    private ollama: OllamaService,
    private clickhouse: ClickHouseService,
  ) {}

  @Public()
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('details')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async details() {
    let db = false;
    let redisOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    redisOk = await this.redis.ping();
    const [kafkaOk, ollamaOk, clickhouseOk] = await Promise.all([
      this.kafka.ping(),
      this.ollama.ping(),
      this.clickhouse.ping(),
    ]);

    const services = {
      database: db,
      redis: redisOk,
      kafka: this.kafka.isEnabled() ? kafkaOk : 'disabled',
      ollama: ollamaOk,
      clickhouse: this.clickhouse.isEnabled() ? clickhouseOk : 'disabled',
    };

    const criticalOk = db && (redisOk || !process.env.ENABLE_CRON_JOBS);
    return {
      status: criticalOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
