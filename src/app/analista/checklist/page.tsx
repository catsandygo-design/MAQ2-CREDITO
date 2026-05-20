'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type DocStatus = 'Aguardando' | 'Pendente' | 'Aprovado' | 'Não se Aplica' | 'Bloqueado';
type RelStatus = 'Não se Aplica' | 'sim' | 'nao';

const docStatuses: DocStatus[] = ['Aguardando', 'Pendente', 'Aprovado', 'Não se Aplica', 'Bloqueado'];
const relStatuses: RelStatus[] = ['Não se Aplica', 'sim', 'nao'];

const caixaStages = [
  ['reserva', 'Reserva'],
  ['em_analise_credito', 'Em Analise Credito'],
  ['emitindo_formularios', 'Emitindo Formularios'],
  ['formularios_em_assinatura', 'Formularios Em Assinatura'],
  ['formularios_assinados', 'Formularios Assinados'],
  ['envio_conformidade', 'Envio a conformidade'],
] as const;

const agehabStages = [
  ['reserva', 'Reserva'],
  ['em_analise_credito', 'Em Analise Credito'],
  ['ficha_emitida', 'Ficha emitida'],
  ['ficha_recebida', 'Ficha Recebida'],
  ['em_validacao_agehab', 'Em Validacao Agehab'],
  ['agehab_validada', 'Agehab Validada'],
] as const;

const dependentes = [
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

const sections = [
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
    ],
  },
  {
    key: 'agehab',
    title: 'Documentos Agehab',
    subtitle: 'Padroes Agehab: GOV.BR ou Clicksign quando aplicavel.',
    docs: [
      ['decl-end', 'Declaracao de endereco', 'Quando necessario. Assinada via GOV.BR ou Clicksign.'],
      ['decl-renda', 'Declaracao renda informal', 'Assinada pelo dependente via GOV.BR/Clicksign.'],
      ['decl-naorenda', 'Declaracao de nao renda', 'Para dependentes sem renda.'],
      ['vinculo', 'Vinculo >= 3 anos', 'Documento com fe publica comprovando vinculo minimo.'],
      ['check', 'Checklist Agehab', 'Preenchido e assinado GOV.BR.'],
      ['ficha', 'Ficha Agehab', 'Preenchida pelo Assistente de Credito.'],
    ],
  },
];

const relacionamento = [
  ['portabilidade-caixa', 'Cliente ciente da portabilidade para a agencia Caixa que vai assinar o contrato?', 'Relacionamento Caixa'],
  ['open-finance-caixa', 'Cliente ciente que sera preciso fazer Open Finance com a agencia Caixa?', 'Relacionamento Caixa'],
  ['cpf-pix-caixa', 'Cliente ciente que sera necessario cadastrar o CPF como Pix na agencia Caixa?', 'Relacionamento Caixa'],
  ['fgts-futuro-orientado', 'Se o cliente ja trabalhou mais de 3 anos, ele pode ganhar mais financiamento devido ao desconto de 0,5% na taxa de juros.', 'Relacionamento FGTS'],
  ['fgts-compra-cliente', 'Sugerir para o cliente utilizar seu FGTS para melhorar o garantido.', 'Relacionamento FGTS'],
  ['produto-orientado', 'Cliente foi orientado sobre o produto?', 'Produto'],
] as const;

function classForStatus(status: string) {
  const normalized = status.toLowerCase();
  if (['aprovado', 'não se aplica', 'sim'].includes(normalized)) return 'ok';
  if (['pendente', 'bloqueado', 'nao'].includes(normalized)) return 'bad';
  return 'warn';
}

function StageTimeline({
  label,
  value,
  onChange,
  stages,
  tone,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  stages: readonly (readonly [string, string])[];
  tone: 'caixa' | 'agehab';
}) {
  const currentIndex = Math.max(0, stages.findIndex(([stage]) => stage === value));
  const progress = ((currentIndex + 1) / stages.length) * 100;

  return (
    <div className="react-stage">
      <div className="react-stage-head">
        <strong>{label}</strong>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {stages.map(([stage, text]) => (
            <option value={stage} key={stage}>{text}</option>
          ))}
        </select>
      </div>
      <div className={`react-stage-dots ${tone}`}>
        {stages.map(([stage], index) => (
          <span className={index === currentIndex ? 'active' : index < currentIndex ? 'done' : ''} key={stage} />
        ))}
      </div>
      <div className="react-stage-progress"><i style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

function AnalistaChecklistContent() {
  const params = useSearchParams();
  const [caixa, setCaixa] = useState('reserva');
  const [agehab, setAgehab] = useState('reserva');
  const [perfilRenda, setPerfilRenda] = useState('clt');
  const [tipoDependente, setTipoDependente] = useState('nao-definido');
  const [docMap, setDocMap] = useState<Record<string, DocStatus>>({});
  const [relMap, setRelMap] = useState<Record<string, RelStatus>>({});

  const cliente = params.get('cliente') || '';
  const reserva = params.get('reserva') || '';

  const visibleSections = useMemo(() => sections.filter((section) => {
    if (section.key === 'depmenor') return tipoDependente === 'filho-menor';
    if (section.key === 'depmaior') return tipoDependente !== 'nao-definido' && tipoDependente !== 'filho-menor';
    if (section.key === 'rendaclt') return perfilRenda === 'clt';
    if (section.key === 'rendainf') return perfilRenda === 'informal';
    return true;
  }), [perfilRenda, tipoDependente]);

  const allDocs = visibleSections.flatMap((section) => section.docs.map(([id]) => `${section.key}.${id}`));
  const doneDocs = allDocs.filter((key) => ['Aprovado', 'Não se Aplica'].includes(docMap[key] || 'Aguardando')).length;

  function updateDoc(key: string, value: DocStatus) {
    setDocMap((current) => ({ ...current, [key]: value }));
  }

  function updateRel(key: string, value: RelStatus) {
    setRelMap((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="analista-checklist-react">
      <header className="react-checklist-hero">
        <div>
          <h1>Checklist de Documentos</h1>
          <span>Analise de documentos</span>
          <p>Checklist do analista com conferencia documental, pendencias, status Caixa/Agehab e retorno operacional.</p>
        </div>
        <aside>
          <b>Total de documentos: {allDocs.length}</b>
          <b>Status: {doneDocs} enviados</b>
        </aside>
      </header>

      <section className="react-stage-grid">
        <StageTimeline label="Kit Caixa" value={caixa} onChange={setCaixa} stages={caixaStages} tone="caixa" />
        <StageTimeline label="Kit Agehab" value={agehab} onChange={setAgehab} stages={agehabStages} tone="agehab" />
      </section>

      <section className="react-card">
        <div className="react-section-head">
          <span>Proponente</span>
          <b>Identificacao do processo</b>
        </div>
        <div className="react-form-grid">
          <label>Nome completo<input value={cliente} readOnly placeholder="Nome do proponente" /></label>
          <label>Nº da reserva<input value={reserva} readOnly placeholder="Ex: 458712" /></label>
          <label>Cidade<input placeholder="Ex: Aguas Lindas de Goias" /></label>
          <label>Empreendimento<input placeholder="Nome do empreendimento" /></label>
          <label>Corretor responsavel<input placeholder="Nome do corretor" /></label>
          <label>Sinal ok?<select><option>Nao tem</option><option>Sim</option><option>Nao</option></select></label>
          <label>Fiador ok?<select><option>Nao tem</option><option>Sim</option><option>Nao</option></select></label>
          <label>Produto?<select><option>Pago</option><option>Negociado</option><option>Em aberto</option></select></label>
          <label>Estado civil<select><option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viuvo(a)</option><option>Uniao estavel</option></select></label>
          <label>Tipo de renda
            <select value={perfilRenda} onChange={(event) => setPerfilRenda(event.target.value)}>
              <option value="clt">CLT / Formal</option>
              <option value="informal">Informal / Autonomo</option>
              <option value="aposentado">Aposentado / Pensionista</option>
              <option value="domestico">Domestico / eSocial</option>
            </select>
          </label>
          <label>Tipo de dependente
            <select value={tipoDependente} onChange={(event) => setTipoDependente(event.target.value)}>
              {dependentes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>Dependente casado?<select><option>Nao</option><option>Sim</option></select></label>
        </div>
      </section>

      <div className="react-checklist-layout">
        <section className="react-card">
          {visibleSections.map((section) => {
            const total = section.docs.length;
            const approved = section.docs.filter(([id]) => ['Aprovado', 'Não se Aplica'].includes(docMap[`${section.key}.${id}`] || 'Aguardando')).length;

            return (
              <article className="react-doc-section" key={section.key}>
                <div className="react-doc-head">
                  <div><h2>{section.title}</h2><p>{section.subtitle}</p></div>
                  <span>{approved}/{total} concluidos</span>
                </div>
                <table>
                  <thead><tr><th>Documento</th><th>O que e aceito</th><th>Status</th></tr></thead>
                  <tbody>
                    {section.docs.map(([id, name, desc]) => {
                      const key = `${section.key}.${id}`;
                      const status = docMap[key] || 'Aguardando';
                      return (
                        <tr key={key}>
                          <td><strong>{name}</strong></td>
                          <td>{desc}</td>
                          <td>
                            <select className={classForStatus(status)} value={status} onChange={(event) => updateDoc(key, event.target.value as DocStatus)}>
                              {docStatuses.map((item) => <option value={item} key={item}>{item}</option>)}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </article>
            );
          })}

          <article className="react-doc-section">
            <div className="react-doc-head">
              <div><h2>Relacionamento com o banco e produto</h2><p>Confirmacoes operacionais registradas com Sim, Nao ou N/A.</p></div>
            </div>
            <table>
              <thead><tr><th>Pergunta</th><th>Categoria</th><th>Status</th></tr></thead>
              <tbody>
                {relacionamento.map(([id, question, category]) => {
                  const status = relMap[id] || 'Não se Aplica';
                  return (
                    <tr key={id}>
                      <td><strong>{question}</strong></td>
                      <td>{category}</td>
                      <td>
                        <select className={classForStatus(status)} value={status} onChange={(event) => updateRel(id, event.target.value as RelStatus)}>
                          {relStatuses.map((item) => <option value={item} key={item}>{item === 'sim' ? 'Sim' : item === 'nao' ? 'Nao' : 'N/A'}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </article>
        </section>

        <aside className="react-card react-return">
          <h2>Retorno do Analista</h2>
          <p>Atualize observacoes e copie o resumo das pendencias visiveis.</p>
          <label>Observacao do analista<textarea placeholder="Ex.: falta extrato bancario, IRPF ilegivel..." /></label>
          <label>Resumo automatico<textarea readOnly value={`${doneDocs}/${allDocs.length} documentos concluidos nas secoes visiveis.`} /></label>
          <button type="button">Salvar tudo</button>
        </aside>
      </div>
    </main>
  );
}

export default function AnalistaChecklistPage() {
  return (
    <Suspense fallback={<main className="analista-checklist-react">Carregando checklist do analista...</main>}>
      <AnalistaChecklistContent />
    </Suspense>
  );
}
