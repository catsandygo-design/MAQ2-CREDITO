import { Controller, Get } from '@nestjs/common';

import type { DocumentChecklistItemProps } from './domain/document-checklist-item.entity';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('example')
  example(): DocumentChecklistItemProps {
    return this.documentsService.createExampleDocument().snapshot;
  }
}
