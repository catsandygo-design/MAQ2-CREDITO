export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  entityType: 'process' | 'document' | 'rule' | 'foguetinho';
  entityId: string;
  occurredAt: Date;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
}
