export enum RuleSeverity {
  OK = 'OK',
  ATTENTION = 'ATTENTION',
  BLOCK = 'BLOCK',
}

export interface RuleHit {
  code: string;
  title: string;
  category: string;
  severity: RuleSeverity;
  autonomyLevel: 0 | 1 | 2 | 3 | 4;
  message: string;
  affectedField?: string;
  suggestedAction?: string;
}
