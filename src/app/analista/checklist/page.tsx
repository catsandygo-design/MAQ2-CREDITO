'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardShell } from '@/components/layout/dashboard-shell';

/**
 * COMPONENTE INTERNO: Lê os parâmetros da URL de forma segura
 */
function ChecklistContent() {
  const searchParams = useSearchParams();
  const cliente = searchParams.get('cliente') || 'Proponente Não Identificado';
  const reserva = searchParams.get('reserva') || '-';

  return (
    <div className="cor-card" style={{ padding: '24px', background: '#0b1120', borderRadius: '12px', border: '1px solid #1e293b' }}>
      <div style={{ marginBottom: '24px' }}>
        <span className="cor-badge cor-badge-info" style={{ marginBottom: '8px', display: 'inline-block' }}>
          Reserva: {reserva}
        </span>
        <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 600, marginTop: '4px' }}>
          Conformidade Documental — {cliente}
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
          Verifique os kits obrigatórios para envio ao Correspondente Bancário (CCA).
        </p>
      </div>

      {/* Listagem de Validação Documental Premium */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          'Documento de Identificação Oficial (RG/CNH)',
          'Comprovante de Renda Atualizado (3 últimos meses)',
          'Extrato de Contas Vinculadas do FGTS',
          'Certidão de Estado Civil / Declaração de União Estável',
          'Ficha de Matrícula do Imóvel (Vila Girassol / Vila Margarida)',
        ].map((documento, index) => (
          <div 
            key={index} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '14px', 
              padding: '14px', 
              background: '#020617', 
              borderRadius: '8px', 
              border: '1px solid #334155' 
            }}
          >
            <input 
              type="checkbox" 
              defaultChecked={index < 2} 
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }} 
            />
            <span style={{ color: '#e2e8f0', fontSize: '14px' }}>{documento}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * EXPORTAÇÃO COMPORTAMENTAL EXIGIDA PELO NEXT.JS (O SEGREDO DO BUILD)
 */
export default function AnalystChecklistPage() {
  return (
    <DashboardShell 
      title="Checklist de Auditoria" 
      description="Validação de pastas físicas, conferência de dados e barramento de segurança operacional."
    >
      <Suspense fallback={<div style={{ color: '#94a3b8', padding: '20px' }}>A carregar dados da esteira...</div>}>
        <ChecklistContent />
      </Suspense>
    </DashboardShell>
  );
}