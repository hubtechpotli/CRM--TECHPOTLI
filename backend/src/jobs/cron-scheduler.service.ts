import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CronSchedulerService implements OnModuleInit {
  constructor(@InjectQueue('cron') private queue: Queue) {}

  async onModuleInit() {
    const jobs = [
      { name: 'renewal-check', pattern: '0 8 * * *' },
      { name: 'payment-overdue-check', pattern: '0 9 * * *' },
      { name: 'lead-followup-reminder', pattern: '0 8 * * *' },
      { name: 'eod-lead-update-reminder', pattern: '30 17 * * *' },
      { name: 'work-order-escalation', pattern: '*/30 * * * *' },
      { name: 'quotation-expiry-check', pattern: '0 9 * * *' },
      { name: 'dashboard-snapshot', pattern: '*/5 * * * *' },
      { name: 'customer-summary-refresh', pattern: '*/5 * * * *' },
      { name: 'search-index-rebuild', pattern: '0 2 * * *' },
    ];
    for (const j of jobs) {
      try {
        await this.queue.add(j.name, {}, { repeat: { pattern: j.pattern }, jobId: j.name });
      } catch {
        /* repeat job may already exist */
      }
    }
  }
}
