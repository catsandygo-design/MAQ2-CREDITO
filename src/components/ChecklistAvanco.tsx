import React, { useState, useRef } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UploadCloud, CheckCircle, Clock, AlertCircle, Save, ChevronDown, ChevronUp } from "lucide-react";
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

export default function ChecklistAvanco({ perfil = 'corretor' }: { perfil?: ChecklistPerfil }) {
  const [documents, setDocuments] = useState<DocumentGroup[]>([]);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reserva = params.get('reserva') || '';
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
    <div className="flex flex-col h-full w-full bg-slate-50 min-h-screen font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Checklist de Documentos</h1>
          <p className="text-sm text-slate-500 mt-1">{roleLabel[perfil]} · triagem por IA não substitui decisão humana.</p>
        </div>
        
        {/* Barra de Progresso */}
        <div className="flex flex-col items-end w-48">
          <div className="flex justify-between w-full text-sm font-medium text-slate-700 mb-1">
            <span>Progresso</span>
            <span className="text-emerald-600">{percentage}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
          </div>
          <span className="text-xs text-slate-400 mt-1">{approvedDocs} de {totalDocs} documentos aprovados</span>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Painel Esquerdo - Filtros e Upload */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">{canUpload ? 'Adicionar Documento' : 'Revisão de documentos'}</h2>
            
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
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex-1">
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800">Documentos Anexados</h2>
              <span className="text-xs text-slate-500">Resultado da IA é somente uma pré-triagem.</span>
            </div>

            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-8"><input type="checkbox" className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" /></th>
                    <th className="px-4 py-3">Nome do Arquivo</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Pessoa</th>
                    <th className="px-4 py-3">Status IA</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {documents.map((group, gIdx) => (
                    <React.Fragment key={gIdx}>
                      {/* Linha Agrupadora */}
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <td colSpan={6} className="px-4 py-2 border-l-4 border-emerald-500">
                          <span className="font-semibold text-slate-700 text-xs uppercase">{group.name}</span>
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
                                <td colSpan={5} className="px-4 py-4 text-sm">
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
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Nenhum documento anexado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="mt-auto border-t border-slate-200 bg-white px-6 py-4 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
