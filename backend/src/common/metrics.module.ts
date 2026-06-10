import { Global, Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { RequestTimingMetrics } from './request-timing.metrics';

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [RequestTimingMetrics],
  exports: [RequestTimingMetrics],
})
export class MetricsModule {}
