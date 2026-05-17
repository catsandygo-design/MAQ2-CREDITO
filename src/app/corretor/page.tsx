'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  FolderOpen,
  LogOut,
  Paperclip,
  PiggyBank,
  Save,
  UploadCloud,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';

const documentosBase = [
  { id: 'rg-cpf', titulo: 'RG e CPF do proponente', desc: 'Documento oficial com foto e CPF legivel.', icon: UserCircle2 },
  { id: 'comprovante-residencia', titulo: 'Comprovante de residencia', desc: 'Conta de consumo recente ou declaracao aceita pela politica.', icon: Building2 },
  { id: 'certidao-nascimento', titulo: 'Certidao de nascimento / casamento', desc: 'Obrigatorio conforme estado civil e composicao familiar.', icon: FileText },
  { id: 'declaracao-parentesco', titulo: 'Declaracao de parentesco', desc: 'Exigida para dependente maior ou parente ate 3o grau.', icon: Users },
  { id: 'nao-renda-agehab', titulo: 'Declaracao de Nao Renda Agehab', desc: 'Obrigatoria quando a renda for informal.', icon: AlertTriangle, rendaInformal: true },
  { id: 'checklist-caixa', titulo: 'Checklist Caixa', desc: 'Conferencia do kit documental exigido pela Caixa.', icon: FileCheck2 },
  { id: 'checklist-agehab', titulo: 'Checklist Agehab', desc: 'Conferencia dos documentos exigidos pela Agehab.', icon: FileCheck2 },
  { id: 'extrato-fgts', titulo: 'Extrato de FGTS', desc: 'Obrigatorio para renda formal ou mista.', icon: PiggyBank },
];

const empreendimentos = ['MAQ Jardim', 'MAQ Parque', 'MAQ Vista', 'MAQ Prime'];
const statusLabel: Record<string, string> = {
  'nao-enviado': 'Anexar',
  'em-analise': 'Em analise',
  pendenciado: 'Pendente',
  reprovado: 'Reprovado',
};

export default function CorretorPage() {
  const [form, setForm] = useState({
    nome: '',
    reserva: '',
    cidade: '',
    empreendimento: '',
    corretor: 'Rebeca Carvalho',
    estadoCivil: '',
    tipoRenda: '',
    tipoDependente: '',
    dependenteCasado: 'nao',
  });
  const [saved, setSaved] = useState(false);
  const [modalDoc, setModalDoc] = useState<(typeof documentosBase)[number] | null>(null);
  const [fileName, setFileName] = useState('');
  const [notice, setNotice] = useState<{ title: string; text: string } | null>(null);
  const [status, setStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cliente = params.get('cliente');
    const reserva = params.get('reserva');

    if (!cliente && !reserva) return;

    setForm((current) => ({
      ...current,
      nome: cliente || current.nome,
      reserva: reserva || current.reserva,
    }));
  }, []);

  const documentos = useMemo(() => documentosBase.filter((doc) => !doc.rendaInformal || form.tipoRenda === 'informal'), [form.tipoRenda]);

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const notify = (title: string, text: string) => {
    setNotice({ title, text });
    window.setTimeout(() => setNotice(null), 3600);
  };

  const salvar = () => {
    const obrigatorios = ['nome', 'reserva', 'cidade', 'empreendimento', 'estadoCivil', 'tipoRenda'] as const;
    if (obrigatorios.some((field) => !form[field].trim())) {
      notify('Atencao', 'Preencha os dados obrigatorios do proponente antes de enviar documentos.');
      return;
    }
    setSaved(true);
    notify('Sucesso', `Proponente ${form.nome} salvo. Documentos liberados para envio.`);
  };

  const abrirUpload = (doc: (typeof documentosBase)[number]) => {
    if (!saved) {
      notify('Atencao', 'Salve os dados do proponente antes de anexar documentos.');
      return;
    }
    if (status[doc.id] === 'em-analise') {
      notify('Bloqueado', 'Documento ja enviado. Aguarde a analise ou pendencia.');
      return;
    }
    setFileName('');
    setModalDoc(doc);
  };

  const enviarDocumento = () => {
    if (!modalDoc || !fileName) return;
    setStatus((current) => ({ ...current, [modalDoc.id]: 'em-analise' }));
    notify('Sucesso', `${modalDoc.titulo} enviado e em analise.`);
    setModalDoc(null);
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notify('Erro', 'O arquivo excede o limite de 5MB.');
      return;
    }
    setFileName(file.name);
  };

  const rendaHint = form.tipoRenda === 'informal'
    ? 'Renda informal exige Declaracao de Nao Renda para Agehab.'
    : form.tipoRenda === 'formal'
      ? 'Renda formal exige extrato de FGTS atualizado.'
      : 'Selecione o tipo de renda para liberar regras documentais.';

  return (
    <main className="broker-doc-page">
      <style>{`
        .broker-doc-page { height: 100vh; overflow-y: auto; background: #ffffff; color: #e5e7eb; padding: 24px 16px 40px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
        .broker-doc-page::-webkit-scrollbar { width: 12px; } .broker-doc-page::-webkit-scrollbar-thumb { background: #334155; border-radius: 999px; border: 3px solid #020617; } .broker-doc-page::-webkit-scrollbar-track { background: #020617; }
        .shell { max-width: 1120px; margin: 0 auto; display: grid; gap: 20px; }
        .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .title h1 { margin: 0; font-size: 28px; display: flex; gap: 12px; align-items: center; } .title svg { color: #22c55e; }
        .badge { display: inline-flex; margin-top: 8px; border: 1px solid rgba(34,197,94,.45); color: #22c55e; background: rgba(34,197,94,.14); border-radius: 999px; padding: 6px 14px; font-size: 12px; font-weight: 800; letter-spacing: .08em; }
        .subtitle, .soft { color: #9ca3af; font-size: 13px; line-height: 1.45; margin-top: 6px; }
        .sla-mini { background: rgba(30,41,59,.55); border: 1px solid rgba(148,163,184,.16); border-radius: 12px; padding: 12px 16px; color: #9ca3af; font-size: 13px; display: grid; gap: 4px; } .sla-mini strong { color: #22c55e; }
        .grid { display: grid; grid-template-columns: 2fr 1.35fr; gap: 20px; align-items: start; }
        .card { background: radial-gradient(circle at top left, rgba(34,197,94,.09), transparent 55%), radial-gradient(circle at bottom right, rgba(59,130,246,.16), transparent 60%), #0b1120; border: 1px solid rgba(148,163,184,.18); border-radius: 16px; padding: 20px 24px; box-shadow: 0 20px 35px rgba(15,23,42,.72); }
        .card h2 { margin: 0 0 6px; font-size: 19px; display: flex; gap: 10px; align-items: center; } .card h2 svg { color: #22c55e; }
        .section { margin-top: 20px; padding-top: 16px; border-top: 1px dashed rgba(148,163,184,.35); }
        .section-title { color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; font-weight: 800; display: flex; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
        .pill { border: 1px solid rgba(148,163,184,.35); color: #9ca3af; background: rgba(15,23,42,.5); border-radius: 999px; padding: 4px 10px; text-transform: none; letter-spacing: 0; white-space: nowrap; }
        .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 16px; }
        .form-group { display: grid; gap: 6px; } label { color: #9ca3af; font-size: 13px; font-weight: 650; }
        input, select { width: 100%; background: #020617; border: 1px solid #1f2937; border-radius: 10px; color: #e5e7eb; padding: 10px 12px; font-size: 13px; outline: none; } input:focus, select:focus { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.18); }
        .hint { color: #9ca3af; font-size: 12px; line-height: 1.55; margin-top: 6px; } .hint strong { color: #22c55e; }
        .rules { background: rgba(15,23,42,.55); border-left: 3px solid #22c55e; border-radius: 10px; padding: 14px; color: #d1d5db; font-size: 13px; } .rules li { margin-bottom: 6px; }
        .button-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px; }
        .btn-primary, .btn-ghost, .btn-upload { border: 0; cursor: pointer; border-radius: 12px; font-weight: 800; display: inline-flex; justify-content: center; align-items: center; gap: 8px; transition: .2s ease; }
        .btn-primary { background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; padding: 13px; box-shadow: 0 12px 25px rgba(34,197,94,.22); } .btn-ghost { background: transparent; color: #e5e7eb; border: 1px solid #1f2937; padding: 13px; }
        .right-panel { display: grid; gap: 20px; }
        .sla-box { display: flex; justify-content: space-between; gap: 16px; align-items: center; background: radial-gradient(circle at top left, rgba(34,197,94,.2), transparent 60%), #020617; border: 1px solid rgba(34,197,94,.5); border-radius: 14px; padding: 16px; }
        .sla-time { color: #22c55e; font-size: 31px; font-weight: 900; letter-spacing: 2px; } .sla-role { text-align: right; color: #9ca3af; font-size: 13px; } .sla-role strong { color: #22c55e; font-size: 16px; }
        .status-dots { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; } .dot-label { display: flex; gap: 8px; align-items: center; background: rgba(15,23,42,.55); border-radius: 8px; padding: 7px 10px; color: #d1d5db; font-size: 12px; }
        .dot { width: 11px; height: 11px; border-radius: 999px; display: inline-block; } .nao-enviado { background: #9ca3af; } .em-analise { background: #f59e0b; } .pendenciado { background: #ef4444; } .reprovado { background: #020617; border: 1px solid #4b5563; }
        .file-list { margin-top: 12px; display: grid; gap: 10px; }
        .file-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: rgba(15,23,42,.78); border: 1px solid rgba(31,41,55,.86); border-radius: 12px; padding: 13px; }
        .file-title { display: flex; gap: 8px; align-items: center; font-size: 14px; font-weight: 800; } .file-title svg { color: #22c55e; } .file-desc { color: #9ca3af; font-size: 12px; line-height: 1.4; margin-top: 4px; }
        .file-actions { display: flex; gap: 12px; align-items: center; flex: 0 0 auto; } .btn-upload { color: #22c55e; border: 1px solid rgba(34,197,94,.5); background: rgba(34,197,94,.12); padding: 8px 14px; } .btn-upload.pending { color: #f59e0b; border-color: #f59e0b; background: rgba(245,158,11,.14); }
        .kit { background: rgba(30,41,59,.5); border-radius: 12px; padding: 16px; text-align: center; color: #d1d5db; } .kit svg { color: #22c55e; margin-bottom: 8px; }
        .modal { position: fixed; inset: 0; background: rgba(15,23,42,.9); display: grid; place-items: center; z-index: 20; } .modal-content { width: min(500px, calc(100vw - 32px)); background: #0b1120; border: 1px solid rgba(148,163,184,.22); border-radius: 16px; padding: 26px; box-shadow: 0 20px 35px rgba(0,0,0,.6); }
        .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; } .modal-head h3 { margin: 0; display: flex; gap: 9px; align-items: center; } .icon-btn { background: transparent; border: 0; color: #9ca3af; cursor: pointer; }
        .file-input-label { width: 100%; margin: 18px 0; } .file-input-label input { display: none; }
        .progress { height: 6px; background: rgba(148,163,184,.2); border-radius: 999px; overflow: hidden; margin-bottom: 14px; } .progress span { display: block; width: 68%; height: 100%; background: linear-gradient(90deg, #22c55e, #16a34a); }
        .notification { position: fixed; right: 24px; bottom: 24px; background: #0b1120; border: 1px solid rgba(34,197,94,.5); border-radius: 12px; padding: 14px 18px; display: flex; gap: 10px; align-items: center; box-shadow: 0 20px 35px rgba(0,0,0,.5); z-index: 30; } .notification svg { color: #22c55e; }
        @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .form-grid, .button-row { grid-template-columns: 1fr; } .topbar { align-items: flex-start; } }
        @media (max-width: 640px) { .file-row { align-items: flex-start; flex-direction: column; } .file-actions { width: 100%; justify-content: space-between; } }
      `}</style>

      <div className="shell">
        <header className="topbar">
          <div className="title">
            <h1><FileText size={30} /> Checklist de Documentos</h1>
            <div className="badge">Upload com formulario</div>
            <p className="subtitle">Tela baseada no checklist_documentos_upload_com_formulario para envio de kit Caixa e Agehab.</p>
          </div>
          <div className="sla-mini">
            <div><strong>SLA analista:</strong> 3h uteis</div>
            <div><strong>SLA corretor em pendencia:</strong> 24h corridas</div>
            <div>Logado como: <strong>{form.corretor}</strong></div>
            <a href="/login" style={{ color: '#ef4444', textDecoration: 'none', fontSize: 12 }}><LogOut size={13} /> Sair</a>
          </div>
        </header>

        <section className="grid">
          <div className="card">
            <h2><UserCircle2 size={22} /> Dados do Proponente & Dependentes</h2>
            <p className="soft">Preencha os dados basicos. Informacoes sensiveis continuam apenas no CRM.</p>

            <div className="section">
              <div className="section-title"><span>Proponente</span><span className="pill">Identificacao do processo</span></div>
              <div className="form-grid">
                <div className="form-group"><label>Nome completo</label><input value={form.nome} onChange={(e) => update('nome', e.target.value)} placeholder="Nome do proponente" /></div>
                <div className="form-group"><label>No da reserva</label><input value={form.reserva} onChange={(e) => update('reserva', e.target.value)} placeholder="Ex: 458712" /></div>
                <div className="form-group"><label>Cidade</label><input value={form.cidade} onChange={(e) => update('cidade', e.target.value)} placeholder="Ex: Aguas Lindas de Goias" /></div>
                <div className="form-group"><label>Empreendimento</label><select value={form.empreendimento} onChange={(e) => update('empreendimento', e.target.value)}><option value="">Selecione...</option>{empreendimentos.map((item) => <option key={item}>{item}</option>)}</select></div>
                <div className="form-group"><label>Corretor responsavel</label><input value={form.corretor} readOnly /></div>
                <div className="form-group"><label>Estado civil</label><select value={form.estadoCivil} onChange={(e) => update('estadoCivil', e.target.value)}><option value="">Selecione...</option><option value="solteiro">Solteiro(a)</option><option value="casado">Casado(a)</option><option value="uniao_estavel">Uniao estavel</option><option value="divorciado">Divorciado(a)</option><option value="viuvo">Viuvo(a)</option></select><div className="hint">Casado ou uniao estavel exige documentos do conjuge.</div></div>
                <div className="form-group"><label>Tipo de renda</label><select value={form.tipoRenda} onChange={(e) => update('tipoRenda', e.target.value)}><option value="">Selecione...</option><option value="formal">Formal</option><option value="informal">Informal</option><option value="mista">Mista</option></select><div className="hint"><strong>{rendaHint}</strong></div></div>
              </div>
            </div>

            <div className="section">
              <div className="section-title"><span>Dependentes</span><span className="pill">Regras automaticas por tipo</span></div>
              <div className="form-grid">
                <div className="form-group"><label>Tipo de dependente</label><select value={form.tipoDependente} onChange={(e) => update('tipoDependente', e.target.value)}><option value="">Selecione...</option><option value="filho_menor">Filho menor</option><option value="filho_maior">Filho maior</option><option value="parente">Parente ate 3o grau</option></select></div>
                {form.tipoDependente !== 'filho_menor' && <div className="form-group"><label>Dependente casado?</label><select value={form.dependenteCasado} onChange={(e) => update('dependenteCasado', e.target.value)}><option value="nao">Nao</option><option value="sim">Sim</option></select></div>}
              </div>
              <div className="rules"><ul><li><strong>Filho menor</strong>: apenas certidao de nascimento.</li><li><strong>Maior / parente 3o grau</strong>: identidade + declaracao de parentesco.</li><li><strong>Se casado</strong>: identidade do conjuge e declaracao de renda/nao renda.</li></ul></div>
            </div>

            <div className="button-row"><button className="btn-primary" onClick={salvar}><Save size={17} /> {saved ? 'Dados salvos' : 'Salvar'}</button><a className="btn-ghost" href="/painel/acompanhamento"><Clock3 size={17} /> Acompanhar</a></div>
          </div>

          <aside className="right-panel">
            <div className="card">
              <h2><Paperclip size={22} /> Kit documental</h2>
              <p className="soft">Status visual do envio dos documentos do proponente.</p>
              <div className="status-dots"><span className="dot-label"><span className="dot nao-enviado" /> Nao enviado</span><span className="dot-label"><span className="dot em-analise" /> Em analise</span><span className="dot-label"><span className="dot pendenciado" /> Pendenciado</span><span className="dot-label"><span className="dot reprovado" /> Reprovado</span></div>
              <div className="file-list">{documentos.map((doc) => { const Icon = doc.icon; const current = status[doc.id] || 'nao-enviado'; return <div className="file-row" key={doc.id}><div><div className="file-title"><Icon size={17} /> {doc.titulo}</div><div className="file-desc">{doc.desc}</div></div><div className="file-actions"><span className={`dot ${current}`} /><button className={`btn-upload ${current === 'em-analise' ? 'pending' : ''}`} onClick={() => abrirUpload(doc)}><Paperclip size={14} /> {statusLabel[current]}</button></div></div>; })}</div>
            </div>

            <div className="card"><div className="sla-box"><div><div className="soft">SLA do analista</div><div className="sla-time">02:58:14</div></div><div className="sla-role">Quem esta com o relogio:<br /><strong>Analista</strong></div></div><div className="hint">Quando houver pendencia, o relogio do analista pausa e passa a contar o prazo de resposta do corretor.</div></div>
            <div className="kit"><FolderOpen size={34} /><strong>Organizacao do kit</strong><p className="soft">Salve o proponente, anexe os documentos e acompanhe o status de analise.</p></div>
          </aside>
        </section>
      </div>

      {modalDoc && <div className="modal"><div className="modal-content"><div className="modal-head"><h3><UploadCloud size={21} /> Enviar documento</h3><button className="icon-btn" onClick={() => setModalDoc(null)}><X /></button></div><p className="soft">Enviar documento: <strong>{modalDoc.titulo}</strong></p><label className="btn-upload file-input-label"><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onFile} />{fileName ? fileName : 'Selecionar arquivo'}</label>{fileName && <div className="progress"><span /></div>}<button className="btn-primary" disabled={!fileName} onClick={enviarDocumento}><UploadCloud size={17} /> Enviar documento</button></div></div>}
      {notice && <div className="notification"><CheckCircle2 /><div><strong>{notice.title}</strong><div className="soft">{notice.text}</div></div></div>}
    </main>
  );
}
