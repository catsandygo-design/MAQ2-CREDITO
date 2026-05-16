import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuditModule } from './modules/audit/audit.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { FoguetinhoModule } from './modules/foguetinho/foguetinho.module';
import { HealthModule } from './modules/health/health.module';
import { ProcessesModule } from './modules/processes/processes.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { validateEnvironment } from './shared/config/environment';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    HealthModule,
    AuditModule,
    ProcessesModule,
    DocumentsModule,
    WorkflowModule,
    FoguetinhoModule,
  ],
})
export class AppModule {}
