import React, { useState, useRef } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UploadCloud, CheckCircle, Clock, AlertCircle, Save, ChevronDown, ChevronUp, ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import { analyzeDocument, DocumentAnalysisResult } from "../lib/gemini";
import { apiUrl } from '../lib/api/proxy';

// Mocks e Tipos
type DocumentStatus = "APROVADO" | "AGUARDANDO APROVAÇÃO" | "PENDENTE" | "REJEITADO";
export type ChecklistPerfil = 'corretor' | 'analista' | 'cca' | 'gestor';

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  person: string;
  status: DocumentStatus;
  date: string;
  reason?: string;
  extractedData?: string;
  detectedType?: string;
  typeMatches?: boolean;
  validations?: DocumentAnalysisResult['validacoes'];
  isProcessing?: boolean;
}

interface DocumentGroup {
  name: string;
  items: DocumentItem[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const DEMO_DOCUMENTS: DocumentGroup[] = [
  {
    name: '01 DOCUMENTAÇÃO PESSOAL',
    items: [
      {
        id: 'demo-rg',
        name: 'RG_Frente_Verso.pdf',
        type: 'RG',
        person: 'João Silva',
        status: 'APROVADO',
        date: '24/09/2026',
        reason: 'Documento legível e válido (dado de demonstração).',
        extractedData: 'Nome: João Silva\nCPF: 123.456.789-00',
      },
      {
        id: 'demo-endereco',
        name: 'Comprovante_Residencia.pdf',
        type: 'Comprovante de Endereço',
        person: 'João Silva',
        status: 'AGUARDANDO APROVAÇÃO',
        date: '24/09/2026',
        reason: 'Aguardando revisão humana (dado de demonstração).',
      },
    ],
  },
];

export default function ChecklistAvanco({ perfil = 'corretor' }: { perfil?: ChecklistPerfil }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reserva = params.get('reserva') || '';
  const isDemoReservation = reserva === 'VALIDACAO-LOCAL';
  const [documents, setDocuments] = useState<DocumentGroup[]>(() => (
    isDemoReservation ? structuredClone(DEMO_DOCUMENTS) : []
  ));
  const canUpload = perfil === 'corretor' || perfil === 'gestor';
  const roleLabel: Record<ChecklistPerfil, string> = {
    corretor: 'Envio de documentos',
    gestor: 'Envio gerencial de documentos',
    analista: 'Análise e decisão humana',
    cca: 'Validação CCA',
  };

  const [selectedGroup, setSelectedGroup] = useState("01 DOCUMENTAÇÃO PESSOAL");
  const [selectedType, setSelectedType] = useState("RG");
  const [selectedPerson, setSelectedPerson] = useState(params.get('cliente') || "Proponente");

  const [isDragging, setIsDragging] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'documentos' | 'mensagens' | 'historico'>('documentos');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const persistDocument = async (file: File, documentKey: string, result?: DocumentAnalysisResult) => {
    if (!reserva) return;
    if (!result) {
      const formData = new FormData();
      formData.append('grupo', 'triagem-ia');
      formData.append('key', documentKey);
      formData.append('name', file.name);
      formData.append('file', file);
      const response = await fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}/uploads`), {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Não foi possível salvar o documento da reserva.');
      return;
    }
    const response = await fetch(apiUrl(`/api/processos/${encodeURIComponent(reserva)}/documentos/${encodeURIComponent(documentKey)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: result.status === 'REJEITADO' ? 'Pendente' : 'Em analise',
        updated_by: 'triagem-ia',
      }),
    });
    if (!response.ok) throw new Error('A análise terminou, mas o status não foi salvo.');
  };

  // Calcula %
  const totalDocs = documents.flatMap(g => g.items).length;
  const approvedDocs = documents.flatMap(g => g.items).filter(i => i.status === "APROVADO").length;
  const percentage = totalDocs === 0 ? 0 : Math.round((approvedDocs / totalDocs) * 100);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = async (files: FileList | File[]) => {
    if (!canUpload) return;
    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    // Validação
    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`O arquivo ${file.name} excede o limite de 10MB.`);
        continue;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`O arquivo ${file.name} possui formato inválido. Use PDF, JPG ou PNG.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;
    
    // Adiciona os arquivos à UI como 'Processando'
    const newItems: DocumentItem[] = validFiles.map((file, idx) => ({
      id: Date.now().toString() + idx,
      name: file.name,
      type: selectedType,
      person: selectedPerson,
      status: "PENDENTE",
      date: new Date().toLocaleDateString('pt-BR'),
      isProcessing: true,
      reason: "Em análise pela IA..."
    }));

    setDocuments(prev => {
      const newDocs = [...prev];
      const groupIndex = newDocs.findIndex(g => g.name === selectedGroup);
      if (groupIndex >= 0) {
        newDocs[groupIndex].items = [...newItems, ...newDocs[groupIndex].items];
      } else {
        newDocs.push({ name: selectedGroup, items: newItems });
      }
      return newDocs;
    });

    // Processamento Sequencial
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const currentId = newItems[i].id;
      
      const documentKey = `triagem.${selectedType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`;
      let result: DocumentAnalysisResult;
      try {
        await persistDocument(file, documentKey);
        result = await analyzeDocument(file, selectedType);
        await persistDocument(file, documentKey, result);
      } catch (error) {
        result = {
          status: 'PENDENTE',
          motivo: error instanceof Error ? error.message : 'Não foi possível concluir a triagem.',
          dadosExtraidos: '',
          tipoIdentificado: 'Não identificado',
          tipoConfere: false,
          validacoes: [],
        };
      }
      
      setDocuments(prev => {
        return prev.map(group => ({
          ...group,
          items: group.items.map(item => {
            if (item.id === currentId) {
              return {
                ...item,
                status: result.status === 'REJEITADO' ? 'REJEITADO' : 'AGUARDANDO APROVAÇÃO',
                reason: `${result.motivo} A decisão final exige revisão humana.`,
                extractedData: result.dadosExtraidos,
                detectedType: result.tipoIdentificado,
                typeMatches: result.tipoConfere,
                validations: result.validacoes,
                isProcessing: false
              };
            }
            return item;
          })
        }));
      });
      // Expandir a linha automaticamente para mostrar os resultados
      setExpandedRows(prev => new Set(prev).add(currentId));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (canUpload && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Reseta o input para permitir enviar o mesmo arquivo novamente se necessário
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getStatusBadge = (status: DocumentStatus, isProcessing?: boolean) => {
    if (isProcessing) {
      return <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 w-fit"><Clock size={12} className="animate-spin" /> Processando</span>;
    }
    switch (status) {
      case "APROVADO":
        return <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 w-fit"><CheckCircle size={12} /> APROVADO</span>;
      case "AGUARDANDO APROVAÇÃO":
      case "PENDENTE":
        return <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 w-fit"><Clock size={12} /> {status}</span>;
      case "REJEITADO":
        return <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 w-fit"><AlertCircle size={12} /> REJEITADO</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f7f8fa] font-sans text-slate-800 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-6 lg:block">
        <div className="mb-8 flex items-center gap-2 px-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-sm font-black text-white">7L</span><span className="font-semibold">Avanço</span></div>
        <nav className="space-y-1 text-sm font-medium text-slate-600">{['Visão geral', 'Empreendimentos', 'Clientes', 'Pré-cadastros', 'Reservas', 'Crédito', 'Repasses', 'Relatórios'].map((item) => <button key={item} className={`block w-full rounded-lg px-3 py-2 text-left ${item === 'Crédito' ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50'}`}>{item}</button>)}</nav>
        <div className="absolute bottom-6 left-4 right-4 border-t border-slate-100 pt-4 text-xs text-slate-500">Central de ajuda</div>
      </aside>
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur lg:px-8"><div className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-500">O que você procura?</div><div className="flex items-center gap-3"><span className="text-sm text-slate-500">IA Avanço</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">{(params.get('cliente') || 'U').slice(0, 1).toUpperCase()}</span></div></header>
      <main className="mx-auto w-full max-w-[1440px] px-5 py-6 lg:px-8">
        <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"><ArrowLeft size={16} /> Voltar para reservas</button>
        <section className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Comercial · Reserva #{reserva || '—'}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">{params.get('cliente') || 'Cliente'}</h1>
              <p className="mt-1 text-sm text-slate-500">Criada hoje · Atualizada recentemente</p>
            </div>
            <div className="min-w-56 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex justify-between text-xs font-semibold uppercase tracking-wide text-slate-500"><span>Progresso da jornada</span><span className="text-slate-800">{percentage}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${percentage}%` }} /></div>
              <p className="mt-2 text-xs text-slate-500">{approvedDocs} aprovados de {totalDocs} documentos</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4"><div><p className="text-xs font-semibold uppercase text-slate-500">Empreendimento</p><p className="mt-1 text-sm font-medium">Não informado</p></div><div><p className="text-xs font-semibold uppercase text-slate-500">Unidade</p><p className="mt-1 text-sm font-medium">—</p></div><div><p className="text-xs font-semibold uppercase text-slate-500">Etapa atual</p><p className="mt-1 text-sm font-medium text-emerald-700">Crédito</p></div><div><p className="text-xs font-semibold uppercase text-slate-500">Corretor responsável</p><p className="mt-1 text-sm font-medium">{perfil}</p></div></div>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[320px_1fr]">
          <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-700" /><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Controle operacional</p><h2 className="font-semibold">Pendências e próxima ação</h2></div></div>
            <p className="mt-3 text-sm text-slate-500">As pendências, responsáveis e prazos são auditáveis e não são decididos pela IA.</p>
            <div className="mt-4 flex gap-2 text-xs"><span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800">{documents.flatMap(g => g.items).filter(i => i.status !== 'APROVADO').length} abertas</span><span className="rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-800">0 bloqueadoras</span></div>
            <div className="mt-4 rounded-lg border border-slate-200 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Próxima ação · {perfil}</p><p className="mt-1 text-sm font-medium">Revisar documentos pendentes</p><p className="mt-1 text-xs text-slate-500">Aprovação final exige responsável humano.</p></div>
          </aside>
          <div className="min-w-0">
            <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 pt-2">
              {[['documentos', 'Documentos e datas'], ['mensagens', 'Mensagens'], ['historico', 'Histórico']].map(([id, label]) => <button key={id} onClick={() => setActiveTab(id as typeof activeTab)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${activeTab === id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>)}
            </div>
            {activeTab !== 'documentos' ? <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white p-8 text-sm text-slate-500">{activeTab === 'mensagens' ? 'Mensagens da reserva ficam registradas no fluxo operacional.' : 'Histórico de decisões e alterações do checklist.'}</div> : <div className="grid grid-cols-1 gap-5 pt-5 lg:grid-cols-[minmax(260px,340px)_1fr]">
        
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><FileText size={18} className="text-emerald-700" /><div><h2 className="font-semibold">Documentos obrigatórios</h2><p className="text-xs text-slate-500">Adicione ou solte os arquivos aqui</p></div></div>
            
            {canUpload ? <div className="flex flex-col gap-4 mb-5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Grupo de documentos</label>
                <div className="relative">
                  <select 
                    value={selectedGroup} 
                    onChange={e => setSelectedGroup(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-md px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option>01 DOCUMENTAÇÃO PESSOAL</option>
                    <option>02 COMPROVANTES DE RENDA</option>
                    <option>03 IMÓVEL</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo do documento</label>
                <div className="relative">
                  <select 
                    value={selectedType} 
                    onChange={e => setSelectedType(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-md px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option>RG</option>
                    <option>CPF</option>
                    <option>CNH</option>
                    <option>Comprovante de Endereço</option>
                    <option>Certidão de Casamento</option>
                    <option>Holerite</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Pessoa</label>
                <div className="relative">
                  <select 
                    value={selectedPerson} 
                    onChange={e => setSelectedPerson(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-md px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option>{params.get('cliente') || 'Proponente'}</option>
                    <option>Cônjuge</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
            </div> : <p className="text-sm text-slate-600 mb-5">Seu perfil não envia arquivos. Use esta tela para revisar a triagem e decidir no fluxo operacional.</p>}

            {/* Dropzone */}
            {canUpload && <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer
                ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:bg-slate-50'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                multiple 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileInput}
                accept="application/pdf, image/jpeg, image/png"
              />
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 pointer-events-none">
                <UploadCloud size={24} />
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1 pointer-events-none">Arraste os arquivos aqui</p>
              <p className="text-xs text-slate-500 mb-4 pointer-events-none">PDF, PNG, JPG de até 10MB</p>
              <button className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm pointer-events-none">
                Selecionar arquivos
              </button>
            </div>}
          </div>
        </div>

        {/* Painel Direito - Tabela de Documentos */}
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div><h2 className="font-semibold">Documentos da reserva</h2><p className="mt-1 text-xs text-slate-500">{totalDocs} arquivos cadastrados · triagem por IA é pré-análise, não decisão.</p></div>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Revisão humana obrigatória</span>
            </div>

            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-8"><input type="checkbox" className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" /></th>
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Pessoa</th>
                    <th className="px-4 py-3">Situação</th>
                    <th className="px-4 py-3">Cadastro</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {documents.map((group, gIdx) => (
                    <React.Fragment key={gIdx}>
                      {/* Linha Agrupadora */}
                      <tr className="border-b border-slate-200 bg-slate-50/70">
                        <td colSpan={7} className="border-l-4 border-emerald-600 px-4 py-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">{group.name} · {group.items.length} arquivo{group.items.length === 1 ? '' : 's'}</span>
                        </td>
                      </tr>
                      {/* Itens */}
                      {group.items.map((item) => {
                        const isExpanded = expandedRows.has(item.id);
                        return (
                          <React.Fragment key={item.id}>
                            <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors group ${isExpanded ? 'bg-slate-50' : ''}`}>
                              <td className="px-4 py-3 pt-4"><input type="checkbox" className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" /></td>
                              <td className="px-4 py-3 pt-4 text-slate-800 font-medium truncate max-w-[200px]" title={item.name}>{item.name}</td>
                              <td className="px-4 py-3 pt-4 text-slate-600">{item.type}</td>
                              <td className="px-4 py-3 pt-4 text-slate-600">{item.person}</td>
                              <td className="px-4 py-3 pt-4">
                                {getStatusBadge(item.status, item.isProcessing)}
                              </td>
                              <td className="px-4 py-3 pt-4 text-xs text-slate-500">{item.date}</td>
                              <td className="px-4 py-3 pt-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  {(!item.isProcessing && (item.extractedData || item.reason)) && (
                                    <button 
                                      onClick={() => toggleRow(item.id)}
                                      className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer" 
                                      title="Detalhes da Análise"
                                    >
                                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {/* Linha Expandida - Dados Extraídos */}
                            {isExpanded && (
                              <tr className="bg-slate-50/80 border-b border-slate-200 shadow-inner">
                                <td></td>
                                <td colSpan={6} className="px-4 py-4 text-sm">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {item.reason && (
                                      <div className="bg-white p-3 rounded border border-slate-200">
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Parecer da Triagem</p>
                                        <p className="text-slate-700">{item.reason}</p>
                                      </div>
                                    )}
                                    {item.extractedData && (
                                      <div className="bg-white p-3 rounded border border-slate-200">
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Dados Extraídos</p>
                                        <pre className="text-slate-700 whitespace-pre-wrap font-sans text-sm">{item.extractedData}</pre>
                                      </div>
                                    )}
                                    {item.validations && item.validations.length > 0 && (
                                      <div className="bg-white p-3 rounded border border-slate-200 md:col-span-2">
                                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Validações automáticas</p>
                                        <p className="text-sm text-slate-700 mb-2">Tipo identificado: <strong>{item.detectedType}</strong>{item.typeMatches ? ' — corresponde ao item selecionado.' : ' — requer conferência do tipo selecionado.'}</p>
                                        <ul className="space-y-1 text-sm text-slate-700">
                                          {item.validations.map((validation) => (
                                            <li key={`${validation.regra}-${validation.detalhe}`} className="flex gap-2">
                                              <span className={validation.resultado === 'APROVADO' ? 'text-emerald-700 font-semibold' : validation.resultado === 'REJEITADO' ? 'text-red-700 font-semibold' : 'text-amber-700 font-semibold'}>{validation.resultado}</span>
                                              <span><strong>{validation.regra}:</strong> {validation.detalhe}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {totalDocs === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Nenhum documento anexado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
            </div>}
          </div>
        </section>
      </main>
      <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-[0_-4px_12px_rgba(15,23,42,0.05)] backdrop-blur flex justify-end gap-3">
        <button onClick={() => navigate(-1)} className="px-5 py-2 border border-slate-300 text-slate-700 bg-white rounded-md font-medium hover:bg-slate-50 transition-colors cursor-pointer">
          Cancelar
        </button>
        <button disabled title="O status é salvo no upload e permanece em revisão humana." className="px-5 py-2 bg-slate-300 text-white rounded-md font-medium flex items-center gap-2 cursor-not-allowed">
          <Save size={18} /> Em revisão humana
        </button>
      </div>
    </div>
  );
}
