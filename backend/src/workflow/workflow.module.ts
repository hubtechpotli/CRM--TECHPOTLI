import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowConsumersService } from './workflow-consumers.service';

@Injectable()
class WorkflowBootstrap implements OnModuleInit {
  constructor(private workflow: WorkflowService) {}
  async onModuleInit() {
    await this.workflow.seedDefaults();
  }
}

@Module({
  providers: [WorkflowService, WorkflowConsumersService, WorkflowBootstrap],
  exports: [WorkflowService],
})
export class WorkflowModule {}
