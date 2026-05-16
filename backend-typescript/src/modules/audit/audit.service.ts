import { Injectable } from '@nestjs/common';

import type { AuditEvent } from './domain/audit-event';

@Injectable()
export class AuditService {
  createEvent(event: AuditEvent): AuditEvent {
    return event;
  }
}
