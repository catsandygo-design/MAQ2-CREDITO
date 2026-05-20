'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type DocStatus = 'Aguardando' | 'Pendente' | 'Aprovado' | 'NÃ£o se Aplica' | 'Bloqueado';
type RelStatus = 'NÃ£o se Aplica' | 'sim' | 'nao';

const docStatuses: DocStatus[] = ['Aguardando', 'Pendente', 'Aprovado', 'NÃ£o se Aplica', 'Bloqueado'];
const relStatuses: RelStatus[] = ['NÃ£o se Aplica', 'sim', 'nao'];

const agenciasVinculadas = ['1856', '0972'];

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
      ['cheque-especial', 'Cheque Especial', 'Formulario para contratacao do cheque especial junto ao banco. Sujeito a analise do banco.'],
      ['cartao-credito', 'Cartao de Credito', 'Formulario de contratacao de cartao de credito. Sujeito a aprovacao do banco.'],
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
  if (['aprovado', 'nÃ£o se aplica', 'sim'].includes(normalized)) return 'ok';
  if (['pendente', 'bloqueado', 'nao'].includes(normalized)) return 'bad';
  return 'warn';
}

function normalizeCaixaStatus(status: string | null) {
  const normalized = (status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (!normalized) return 'reserva';
  if (normalized === 'emitir formularios' || normalized === 'emitindo formularios') return 'emitindo_formularios';
  if (normalized === 'em analise credito') return 'em_analise_credito';
  if (normalized === 'formularios em assinatura') return 'formularios_em_assinatura';
  if (normalized === 'formularios assinados') return 'formularios_assinados';
  if (normalized === 'envio a conformidade') return 'envio_conformidade';
  if (normalized === 'reserva') return 'reserva';
  return status || 'reserva';
}

function StageTimeline({
  label,
  value,
  stages,
  tone,
}: {
  label: string;
  value: string;
  stages: readonly (readonly [string, string])[];
  tone: 'caixa' | 'agehab';
}) {
  const currentIndex = Math.max(0, stages.findIndex(([stage]) => stage === value));
  const progress = ((currentIndex + 1) / stages.length) * 100;

  return (
    <div className="react-stage">
      <div className="react-stage-head">
        <strong>{label}</strong>
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
  const [caixa, setCaixa] = useState(normalizeCaixaStatus(params.get('caixa')));
  const [agehab, setAgehab] = useState('reserva');
  const [perfilRenda, setPerfilRenda] = useState('clt');
  const [tipoDependente, setTipoDependente] = useState(params.get('dependente') || 'filho-maior');
  const [docMap, setDocMap] = useState<Record<string, DocStatus>>({});
  const [relMap, setRelMap] = useState<Record<string, RelStatus>>({});
  const [uploadsEnviados, setUploadsEnviados] = useState<Record<string, boolean>>({});

  const cliente = params.get('cliente') || '';
  const reserva = params.get('reserva') || '';
  const cidade = params.get('cidade') || '';
  const empreendimento = params.get('empreendimento') || '';
  const corretor = params.get('corretor') || '';
  const sinal = params.get('sinal') || 'Nao tem';
  const fiador = params.get('fiador') || 'Nao tem';
  const produto = params.get('produto') || 'Pago';

  const temDocumentoEnviado = params.get('upload') === '1' || params.get('documento') === 'enviado';

  useEffect(() => {
    if (!reserva) return;
    const statusCaixa = localStorage.getItem(`maq2_caixa_status_${reserva}`);
    const statusAgehab = localStorage.getItem(`maq2_agehab_status_${reserva}`);
    if (statusCaixa) setCaixa(normalizeCaixaStatus(statusCaixa));
    if (statusAgehab) setAgehab(statusAgehab);
    const uploadsSalvos = sections
      .find((section) => section.key === 'caixa')
      ?.docs.reduce<Record<string, boolean>>((acc, [id]) => {
        const key = `caixa.${id}`;
        acc[key] = localStorage.getItem(`maq2_cca_upload_${reserva}_${key}`) === '1';
        return acc;
      }, {});
    setUploadsEnviados((current) => ({ ...current, ...uploadsSalvos }));
  }, [reserva]);

  const visibleSections = useMemo(() => sections.filter((section) => {
    if (section.key === 'depmenor') return tipoDependente === 'filho-menor';
    if (section.key === 'depmaior') return tipoDependente !== 'nao-definido' && tipoDependente !== 'filho-menor';
    if (section.key === 'rendaclt') return perfilRenda === 'clt';
    if (section.key === 'rendainf') return perfilRenda === 'informal';
    return true;
  }), [perfilRenda, tipoDependente]);

  const allDocs = visibleSections.flatMap((section) => section.docs.map(([id]) => `${section.key}.${id}`));
  const doneDocs = allDocs.filter((key) => ['Aprovado', 'NÃ£o se Aplica'].includes(docMap[key] || 'Aguardando')).length;

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
          <a className="react-back-button" href="/cca/acompanhamento">Voltar</a>
        </aside>
      </header>

      <section className="react-stage-grid">
        <StageTimeline label="Kit Caixa" value={caixa} stages={caixaStages} tone="caixa" />
        <StageTimeline label="Kit Agehab" value={agehab} stages={agehabStages} tone="agehab" />
      </section>

      <section className="react-card">
        <div className="react-section-head">
          <span>Proponente</span>
          <b>Identificacao do processo</b>
        </div>
        <div className="react-form-grid">
          <label>Nome completo<input value={cliente} readOnly placeholder="Nome do proponente" /></label>
          <label>NÂº da reserva<input value={reserva} readOnly placeholder="Ex: 458712" /></label>
          <label>Cidade<input value={cidade} readOnly placeholder="Ex: Aguas Lindas de Goias" /></label>
          <label>Empreendimento<input value={empreendimento} readOnly placeholder="Nome do empreendimento" /></label>
          <label>Corretor responsavel<input value={corretor} readOnly placeholder="Nome do corretor" /></label>
          <label>Sinal ok?<select className="is-readonly-select" value={sinal} disabled><option>Nao tem</option><option>Sim</option><option>Nao</option></select></label>
          <label>Fiador ok?<select className="is-readonly-select" value={fiador} disabled><option>Nao tem</option><option>Sim</option><option>Nao</option></select></label>
          <label>Produto?<select className="is-readonly-select" value={produto} disabled><option>PP</option><option>PN</option><option>PA</option><option>Pago</option><option>Negociado</option><option>Em aberto</option></select></label>
          <label>Estado civil<select className="is-readonly-select" disabled><option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viuvo(a)</option><option>Uniao estavel</option></select></label>
          <label>Tipo de renda
            <select className="is-readonly-select" value={perfilRenda} disabled onChange={(event) => setPerfilRenda(event.target.value)}>
              <option value="clt">CLT / Formal</option>
              <option value="informal">Informal / Autonomo</option>
              <option value="aposentado">Aposentado / Pensionista</option>
              <option value="domestico">Domestico / eSocial</option>
            </select>
          </label>
          <label>Tipo de dependente
            <select className="is-readonly-select" value={tipoDependente} disabled onChange={(event) => setTipoDependente(event.target.value)}>
              {dependentes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>Dependente casado?<select className="is-readonly-select" disabled><option>Nao</option><option>Sim</option></select></label>
        </div>
      </section>

      <div className="react-checklist-layout">
        <section className="react-card">
          {visibleSections.map((section) => {
            const total = section.docs.length;
            const approved = section.docs.filter(([id]) => ['Aprovado', 'NÃ£o se Aplica'].includes(docMap[`${section.key}.${id}`] || 'Aguardando')).length;

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
                      const uploadEnviado = Boolean(uploadsEnviados[key]);
                      return (
                        <tr key={key}>
                          <td><strong>{name}</strong></td>
                          <td>{desc}</td>
                          <td>
                            <select className={classForStatus(status)} value={status} onChange={(event) => updateDoc(key, event.target.value as DocStatus)}>
                              {docStatuses.map((item) => <option value={item} key={item}>{item}</option>)}
                            </select>
                            {section.key === 'caixa' && caixa === 'emitindo_formularios' ? (
                              <label className="react-doc-upload">
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!reserva || !file) return;
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      if (typeof reader.result === 'string') {
                                        localStorage.setItem(`maq2_cca_upload_data_${reserva}_${key}`, reader.result);
                                        localStorage.setItem(`maq2_cca_upload_${reserva}`, '1');
                                        localStorage.setItem(`maq2_cca_upload_${reserva}_${key}`, '1');
                                        localStorage.setItem(`maq2_cca_upload_nome_${reserva}_${key}`, file.name);
                                        setUploadsEnviados((current) => ({ ...current, [key]: true }));
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }}
                                />
                                {uploadEnviado ? 'Enviado' : 'Upload'}
                              </label>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </article>
            );
          })}

        </section>

        <aside className="react-card react-return">
          <h2>Retorno do Analista</h2>
          <p>Atualize observacoes e copie o resumo das pendencias visiveis.</p>
          <div className="react-cca-vinculado">
            <label>Agencia Vinculada
              <select defaultValue="">
                <option value="" disabled>Selecione...</option>
                {agenciasVinculadas.map((agencia) => <option value={agencia} key={agencia}>{agencia}</option>)}
              </select>
            </label>
            <button type="button" hidden={!temDocumentoEnviado}>Abrir</button>
          </div>
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
