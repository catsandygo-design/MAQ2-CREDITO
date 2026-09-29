import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mic, Volume2, X } from 'lucide-react';
import { apiUrl } from '@/lib/api/proxy';

type Processo = { reserva: string; cliente?: string; empreendimento?: string; caixa?: string; agehab?: string; documentos?: Record<string, string>; pendencias?: Record<string, { descricao?: string }> };
type SpeechRecognitionInstance = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; };

declare global { interface Window { webkitSpeechRecognition?: new () => SpeechRecognitionInstance; SpeechRecognition?: new () => SpeechRecognitionInstance; } }

function resumo(processos: Processo[]) {
  const documentos = processos.flatMap((p) => Object.entries(p.documentos || {}).map(([key, status]) => ({ ...p, key, status })));
  const reservasNaoAnalisadas = new Set(documentos.filter((d) => ['Enviado', 'Aguardando'].includes(d.status)).map((d) => d.reserva)).size;
  const caixaRecebidos = processos.filter((p) => p.caixa && p.caixa !== 'reserva').length;
  const caixaConformidade = processos.filter((p) => p.caixa === 'envio_conformidade').length;
  const creditu = documentos.filter((d) => /creditu/i.test(d.key));
  const credituPendentes = creditu.filter((d) => d.status === 'Pendente' || d.status === 'Bloqueado').length;
  const assinaturas = processos.filter((p) => p.caixa === 'formularios_em_assinatura').length;
  const finalizados = processos.filter((p) => p.caixa === 'envio_conformidade').length;
  const agehabPendentes = processos.filter((p) => ['reserva', 'em_analise_credito'].includes(p.agehab || '')).length;
  const agehabAprovados = processos.filter((p) => p.agehab === 'agehab_validada').length;
  const pendencias = processos.flatMap((p) => Object.entries(p.pendencias || {}).map(([key, value]) => ({ cliente: p.cliente || p.reserva, empreendimento: p.empreendimento || 'Empreendimento não informado', documento: key.replace(/[-.]/g, ' '), descricao: value.descricao || 'Documento pendente' })));
  return { naoAnalisados: reservasNaoAnalisadas, caixaRecebidos, caixaConformidade, credituPendentes, assinaturas, finalizados, agehabTotal: processos.length, agehabPendentes, agehabAprovados, pendencias };
}

export default function VoiceCommandAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const greeted = useRef(false);
  const data = useMemo(() => resumo(processos), [processos]);
  const phrase = 'Bom dia, Douglas. O que você quer fazer agora? Verificar documentos enviados para análise ou acompanhar o andamento do processo?';

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR'; utterance.rate = 1.14; utterance.pitch = 1.16; utterance.volume = 1;
    utterance.onstart = () => setSpeaking(true); utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };
  const load = () => fetch(apiUrl('/api/processos'), { headers: { Accept: 'application/json' }, cache: 'no-store' }).then((r) => r.ok ? r.json() : []).then((value) => setProcessos(Array.isArray(value) ? value : [])).catch(() => setProcessos([]));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!greeted.current && !location.pathname.startsWith('/login')) { greeted.current = true; const timer = window.setTimeout(() => speak(phrase), 500); return () => window.clearTimeout(timer); } }, [location.pathname]);
  const documents = () => { speak(`Você tem ${data.naoAnalisados} clientes com documentos que ainda não foram analisados.`); navigate('/analista?filtro=nao-analisados'); setOpen(false); };
  const follow = () => { speak(`Você tem ${data.caixaRecebidos} kits Caixa recebidos, ${data.caixaConformidade} validados e enviados para conformidade. Creditú: ${data.credituPendentes} pendentes, ${data.assinaturas} aguardando assinatura e ${data.finalizados} finalizados. AGEHAB: ${data.agehabTotal} no total, ${data.agehabPendentes} pendentes e ${data.agehabAprovados} aprovados.`); };
  const listen = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { speak('O reconhecimento de voz não é compatível neste navegador. Escolha uma das opções na tela.'); return; }
    const recognition = new Recognition(); recognition.lang = 'pt-BR'; recognition.continuous = false; recognition.interimResults = false;
    recognition.onresult = (event) => { const text = event.results[0][0].transcript.toLowerCase(); if (/document|an[aá]lis/.test(text)) documents(); else if (/andamento|acompanhar|processo/.test(text)) follow(); else speak('Não entendi. Diga documentos ou acompanhar processo.'); };
    recognition.onend = () => setListening(false); setListening(true); recognition.start();
  };
  if (!open) return <button className="voice-fab" onClick={() => setOpen(true)} aria-label="Abrir assistente de voz"><Volume2 size={19} /></button>;
  return <aside className="voice-assistant" aria-live="polite"><button className="voice-close" onClick={() => setOpen(false)} aria-label="Fechar assistente"><X size={16} /></button><div className="voice-title"><Volume2 size={19} className={speaking ? 'voice-speaking' : ''} /><div><strong>Assistente MAQ2</strong><span>Bom dia, Douglas</span></div></div><p>O que você quer fazer agora?</p><button className="voice-option" onClick={documents}><b>Verificar documentos enviados para análise</b><span>Você tem {data.naoAnalisados} clientes com itens não analisados.</span></button><button className="voice-option" onClick={follow}><b>Acompanhar o andamento do processo</b><span>Caixa, Creditú e AGEHAB com indicadores atuais.</span></button><button className="voice-mic" onClick={listen}><Mic size={16} /> {listening ? 'Ouvindo...' : 'Falar comando'}</button>{data.pendencias.length > 0 && <div className="voice-pending"><b>Imóveis e documentos pendentes</b>{data.pendencias.slice(0, 3).map((p, i) => <span key={`${p.cliente}-${i}`}>{p.cliente} · {p.documento}</span>)}</div>}</aside>;
}
