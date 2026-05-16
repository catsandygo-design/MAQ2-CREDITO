import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dirs = [
  'src/app',
  'src/app/(public)',
  'src/app/(auth)',
  'src/app/(dashboard)',
  'src/app/(dashboard)/analista',
  'src/app/(dashboard)/analista/kanban',
  'src/app/(dashboard)/analista/repasse',
  'src/app/(dashboard)/analista/importacao',
  'src/app/api',
  'src/components',
  'src/components/ui',
  'src/components/layout',
  'src/components/forms',
  'src/components/dashboard',
  'src/components/kanban',
  'src/components/credito',
  'src/components/frankenstein',
  'src/features',
  'src/features/clientes',
  'src/features/clientes/components',
  'src/features/clientes/services',
  'src/features/clientes/types',
  'src/features/credito',
  'src/features/credito/rules',
  'src/features/credito/services',
  'src/features/credito/types',
  'src/features/kanban',
  'src/features/kanban/components',
  'src/features/kanban/services',
  'src/features/kanban/types',
  'src/features/rating-caixa',
  'src/features/rating-caixa/rules',
  'src/features/rating-caixa/services',
  'src/features/rating-caixa/types',
  'src/features/akinator-credito',
  'src/features/akinator-credito/questions',
  'src/features/akinator-credito/rules',
  'src/features/akinator-credito/services',
  'src/lib',
  'src/lib/supabase',
  'src/lib/validators',
  'src/lib/utils',
  'src/hooks',
  'src/stores',
  'src/types',
  'src/styles',
  'src/config',
  'docs',
  'tests',
];

for (const dir of dirs) {
  mkdirSync(dir, { recursive: true });
  const keep = join(dir, '.gitkeep');
  if (!existsSync(keep)) writeFileSync(keep, '');
}

const files = {
  'src/lib/utils/cn.ts': `import { clsx, type ClassValue } from 'clsx';\nimport { twMerge } from 'tailwind-merge';\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}\n`,
  'src/features/rating-caixa/types/rating-caixa.types.ts': `export type StatusAderencia = 'ok' | 'alerta' | 'critico';\n\nexport interface EntradaAderenciaCaixa {\n  comprometimentoRendaPercentual: number;\n  fezPortabilidade: boolean;\n  fezPixCpfCaixa: boolean;\n  fezOpenFinance: boolean;\n  possuiRendaSuporte?: boolean;\n}\n\nexport interface ResultadoAderenciaCaixa {\n  percentual: number;\n  status: StatusAderencia;\n  mensagens: string[];\n}\n`,
  'src/features/rating-caixa/rules/calcular-aderencia-caixa.ts': `import type { EntradaAderenciaCaixa, ResultadoAderenciaCaixa } from '../types/rating-caixa.types';\n\nexport function calcularAderenciaCaixa(input: EntradaAderenciaCaixa): ResultadoAderenciaCaixa {\n  const mensagens: string[] = [];\n  let percentual = 0;\n\n  if (!input.fezPortabilidade) {\n    mensagens.push('Portabilidade não realizada: aderência zerada.');\n    return { percentual: 0, status: 'critico', mensagens };\n  }\n\n  percentual += 20;\n\n  if (input.fezPixCpfCaixa) percentual += 30;\n  else mensagens.push('PIX CPF não portado para CAIXA: risco alto.');\n\n  if (input.fezOpenFinance) percentual += 50;\n  else mensagens.push('Open Finance não realizado: perda de força no rating.');\n\n  if (input.comprometimentoRendaPercentual > 40) {\n    mensagens.push('Comprometimento acima de 40%: exige tratativa/renda suporte.');\n    if (!input.possuiRendaSuporte) percentual = Math.min(percentual, 50);\n  }\n\n  const status = percentual >= 80 ? 'ok' : percentual >= 50 ? 'alerta' : 'critico';\n\n  return { percentual, status, mensagens };\n}\n`,
};

for (const [path, content] of Object.entries(files)) {
  if (!existsSync(path)) writeFileSync(path, content);
}

console.log('Estrutura criada com segurança. Nenhum arquivo existente foi sobrescrito.');
