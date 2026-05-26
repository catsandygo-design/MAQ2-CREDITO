// Contrato compartilhado dos checklists (sem regra de tela).
export type DocStatus = 'Aguardando' | 'Enviado' | 'Pendente' | 'Aprovado' | 'Não se Aplica' | 'Bloqueado';
export type RelStatus = 'Não se Aplica' | 'sim' | 'nao';
export type PendenciaDoc = { descricao: string; prazo: string };

export const docStatuses: DocStatus[] = ['Aguardando', 'Enviado', 'Pendente', 'Aprovado', 'Não se Aplica', 'Bloqueado'];
export const relStatuses: RelStatus[] = ['Não se Aplica', 'sim', 'nao'];

export const dependentes = [
  ['nao-definido', 'Nao definido'],
  ['conjuge', 'Conjuge'],
  ['filho-menor', 'Filho menor de 18'],
  ['filho-maior', 'Filho maior de 18'],
  ['pai-mae', 'Pai/Mae'],
  ['irmaos-maiores', 'Irmaos maiores de 18'],
  ['tios-maiores', 'Tios e tias maiores de 18'],
  ['avos', 'Avos'],
  ['sobrinhos-maiores', 'Sobrinhos maiores de 18'],
  ['bisavos', 'Bizavos'],
] as const;

export const sections = [
  {
    key: 'proponente',
    title: 'Proponente',
    subtitle: 'Documentos pessoais e base cadastral.',
    docs: [
      ['identidade', 'RG/CNH', 'Documento com foto dentro da validade.'],
      ['cpf', 'CPF', 'CPF legivel ou documento oficial que contenha CPF.'],
      ['estado-civil', 'Comprovante de estado civil', 'Certidao conforme estado civil do proponente.'],
      ['residencia', 'Comprovante de residencia', 'Agua, luz, telefone, internet ou equivalente.'],
      ['fgts', 'Extrato FGTS', 'App FGTS, site Caixa ou agencia.'],
    ],
  },
  {
    key: 'depmenor',
    title: 'Dependente - Filhos menores de 18 anos',
    subtitle: 'Aparece quando o tipo de dependente for filho menor.',
    docs: [
      ['certidao', 'Certidao de nascimento', 'Certidao do dependente menor.'],
      ['cpf', 'CPF do dependente', 'CPF do filho menor quando houver.'],
    ],
  },
  {
    key: 'depmaior',
    title: 'Dependente - Maiores e parentes',
    subtitle: 'Aparece para conjuge, filhos maiores e parentes informados.',
    docs: [
      ['identidade', 'Identidade e CPF', 'CNH, RG, identidade militar, passaporte brasileiro ou carteira funcional.'],
      ['estado-civil', 'Comprovante de estado civil', 'Certidao conforme estado civil do dependente.'],
      ['parentesco', 'Declaracao de parentesco', 'Declaracao conforme regras Caixa, vinculando dependente ao proponente.'],
    ],
  },
  {
    key: 'rendaclt',
    title: 'Renda formal (CLT / vinculo)',
    subtitle: 'Aparece quando perfil de renda = CLT.',
    docs: [
      ['holerite', 'Holerites', '3 ultimos holerites/contracheques.'],
      ['carteira', 'Carteira de trabalho', 'Dados da carteira digital ou fisica.'],
    ],
  },
  {
    key: 'rendainf',
    title: 'Renda informal / autonomo',
    subtitle: 'Aparece quando perfil de renda = informal.',
    docs: [
      ['extrato', 'Extrato bancario', '3 ultimos meses, preferir mes fechado.'],
      ['declaracao', 'Declaracao de renda', 'Declaracao assinada conforme modelo operacional.'],
    ],
  },
  {
    key: 'caixa',
    title: 'Documentos Caixa',
    subtitle: 'Kit Caixa e formularios de contratacao.',
    docs: [
      ['damp', 'DAMP', 'Preenchida e assinada digitalmente.'],
      ['ficha', 'Ficha de cadastro Caixa', 'Preenchida e assinada digitalmente.'],
      ['abertura', 'Abertura de conta', 'Assinada digitalmente; fisico precisa aprovacao.'],
      ['mo', 'MO', 'Assinatura correta. Casal: assinatura de ambos.'],
      ['cheque-especial', 'Cheque Especial', 'Formulario para contratacao do cheque especial junto ao banco. Sujeito a analise do banco.'],
      ['cartao-credito', 'Cartao de Credito', 'Formulario de contratacao de cartao de credito. Sujeito a aprovacao do banco.'],
    ],
  },
] as const;

export const relacionamento = [
  ['portabilidade-caixa', 'Cliente ciente da portabilidade para a agencia Caixa que vai assinar o contrato?', 'Relacionamento Caixa'],
  ['open-finance-caixa', 'Cliente ciente que sera preciso fazer Open Finance com a agencia Caixa?', 'Relacionamento Caixa'],
  ['cpf-pix-caixa', 'Cliente ciente que sera necessario cadastrar o CPF como Pix na agencia Caixa?', 'Relacionamento Caixa'],
  ['fgts-futuro-orientado', 'Se o cliente ja trabalhou mais de 3 anos, ele pode ganhar mais financiamento devido ao desconto de 0,5% na taxa de juros.', 'Relacionamento FGTS'],
  ['fgts-compra-cliente', 'Sugerir para o cliente utilizar seu FGTS para melhorar o garantido.', 'Relacionamento FGTS'],
  ['produto-orientado', 'Cliente foi orientado sobre o produto?', 'Produto'],
] as const;
