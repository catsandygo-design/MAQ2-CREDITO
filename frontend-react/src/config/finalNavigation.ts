export type FinalModuleStatus = 'react-ready' | 'react-structure' | 'legacy-bridge'

export interface FinalModuleDefinition {
  key: string
  label: string
  path: string
  legacyPath?: string
  status: FinalModuleStatus
  owner: string
  purpose: string
  userValue: string
  implementationNotes: string[]
}

// Mapa oficial da navegacao final. Cada modulo aqui representa uma area de negocio
// que deve existir em React antes da tela HTML equivalente ser removida do menu.
export const FINAL_MODULES: FinalModuleDefinition[] = [
  {
    key: 'inicio',
    label: 'Inicio',
    path: '/inicio',
    status: 'react-structure',
    owner: 'todos',
    purpose: 'Mostrar o que precisa de atencao agora.',
    userValue: 'O usuario entra sabendo o que resolver primeiro.',
    implementationNotes: [
      'Unificar tarefas do dia, alertas do Frankstein e atalhos por perfil.',
      'Consumir agenda, processos em risco e pendencias recentes.',
      'Nao expor regras tecnicas; mostrar proxima acao em linguagem operacional.',
    ],
  },
  {
    key: 'central',
    label: 'Central Operacional',
    path: '/analista',
    legacyPath: '/app/analista',
    status: 'react-ready',
    owner: 'analista',
    purpose: 'Ser a fila diaria do credito, comercial e repasse.',
    userValue: 'Concentra carteira, filtros, gargalos, SLA e proxima acao.',
    implementationNotes: [
      'A primeira versao React ja usa /app/api/processos e planejamento.',
      'Proximas entregas: mover acompanhamento, operacional e arquivados para abas internas.',
      'Manter RD, pendencias, Agehab, sinal, fiador e SLA como leitura principal.',
    ],
  },
  {
    key: 'analise',
    label: 'Analise do Cliente',
    path: '/analise',
    legacyPath: '/app/analise',
    status: 'legacy-bridge',
    owner: 'analista',
    purpose: 'Concentrar decisao do processo individual.',
    userValue: 'O usuario ve dados, documentos, bloqueios e Frankstein no mesmo lugar.',
    implementationNotes: [
      'Criar contrato ProcessoFull antes de substituir o HTML.',
      'Adicionar painel lateral do Frankstein com regra, motivo, campo e acao sugerida.',
      'Preservar retorno do analista, checklist documental e historico.',
    ],
  },
  {
    key: 'importacao',
    label: 'Importacao',
    path: '/importacao',
    legacyPath: '/app/analista/importacao',
    status: 'legacy-bridge',
    owner: 'analista',
    purpose: 'Entrada oficial de planilhas e dados de carteira.',
    userValue: 'Reduz erro antes de gravar processos no banco.',
    implementationNotes: [
      'Migrar upload, preview, validacao por linha e historico do lote.',
      'Manter endpoint de tabela de precos e importacao como fonte unica.',
      'Mostrar erros corrigiveis antes de confirmar a gravacao.',
    ],
  },
  {
    key: 'repasse',
    label: 'Repasse',
    path: '/repasse',
    legacyPath: '/app/analista/repasse',
    status: 'legacy-bridge',
    owner: 'cca/repasse',
    purpose: 'Controlar fila tecnica de CCA, Agehab, sinal, fiador e assinatura.',
    userValue: 'Mostra se o processo pode avancar para assinatura sem procurar em varias telas.',
    implementationNotes: [
      'Migrar kanban/fila de repasse com regras de assinatura autorizada.',
      'Exibir bloqueios objetivos do Frankstein antes do usuario tentar avancar.',
      'Manter caminho de volta para legado ate paridade funcional.',
    ],
  },
  {
    key: 'gestor',
    label: 'Gestor',
    path: '/gestor',
    legacyPath: '/app/gestor',
    status: 'react-ready',
    owner: 'gestor',
    purpose: 'Dar visao executiva de carteira, gargalos e produtividade.',
    userValue: 'Transforma a base operacional em leitura gerencial.',
    implementationNotes: [
      'A dashboard React ja consome dados reais do backend.',
      'Proximas entregas: indicadores de acuracia do Frankstein e retrabalho evitado.',
      'Manter filtros por periodo, obra, corretor, imobiliaria e CCA.',
    ],
  },
  {
    key: 'frankstein',
    label: 'Frankstein',
    path: '/frankstein',
    status: 'react-structure',
    owner: 'admin/gestor',
    purpose: 'Centralizar regras, feedback humano e autonomia supervisionada.',
    userValue: 'Mostra por que uma decisao foi sugerida ou bloqueada.',
    implementationNotes: [
      'Criar tela para regras disparadas, feedback e backtesting simples.',
      'Separar regra objetiva, sugestao e aprendizado estatistico.',
      'Toda acao sensivel deve manter auditoria e confirmacao humana.',
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    path: '/admin',
    legacyPath: '/app/admin',
    status: 'legacy-bridge',
    owner: 'admin',
    purpose: 'Administrar usuarios, ambiente, e-mail, logs e manutencao.',
    userValue: 'Permite configurar o sistema sem mexer no codigo.',
    implementationNotes: [
      'Migrar blocos do admin por ordem de risco: status, e-mail, logs, manutencao.',
      'Manter segredos apenas no Render e nunca expor valores sensiveis na tela.',
      'Criar componentes reutilizaveis para cards de configuracao.',
    ],
  },
]

export const FINAL_MODULE_BY_KEY: Record<string, FinalModuleDefinition> = Object.fromEntries(
  FINAL_MODULES.map((module) => [module.key, module]),
)
