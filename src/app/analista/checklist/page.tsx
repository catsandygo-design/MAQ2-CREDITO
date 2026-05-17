'use client';

import { useState } from 'react';

import { DashboardShell } from '@/components/layout/dashboard-shell';

const documentos = [
  {
    id: 'rg-cpf',
    nome: 'RG e CPF do proponente',
    categoria: 'Proponente',
    cliente: 'Ana Paula Ribeiro',
    reserva: '458713',
    statusArquivo: 'enviado',
    arquivoUrl: '/checklist_documentos_upload_com_formulario.html?cliente=Ana%20Paula%20Ribeiro&reserva=458713',
  },
  {
    id: 'comprovante-residencia',
    nome: 'Comprovante de residencia',
    categoria: 'Proponente',
    cliente: 'Ana Paula Ribeiro',
    reserva: '458713',
    statusArquivo: 'aguardando',
    arquivoUrl: '',
  },
  {
    id: 'extrato-fgts',
    nome: 'Extrato FGTS',
    categoria: 'Renda',
    cliente: 'Matheus Alves de Melo',
    reserva: '458712',
    statusArquivo: 'enviado',
    arquivoUrl: '/checklist_documentos_upload_com_formulario.html?cliente=Matheus%20Alves%20de%20Melo&reserva=458712',
  },
  {
    id: 'ficha-agehab',
    nome: 'Ficha Agehab',
    categoria: 'Agehab',
    cliente: 'Carlos Henrique Souza',
    reserva: '458714',
    statusArquivo: 'aguardando',
    arquivoUrl: '',
  },
];

export default function ChecklistPage() {
  const [decisoes, setDecisoes] = useState<Record<string, string>>({});

  return (
    <DashboardShell
      title="Checklist Documental"
      description="Analise dos documentos enviados pelo corretor antes de encaminhar o processo ao CCA."
    >
      <div className="analyst-doc-table-card">
        <div className="analyst-doc-head">
          <div>
            <span>Fila documental</span>
            <h2>Documentos para analise</h2>
          </div>
          <strong>2 enviados</strong>
        </div>

        <div className="analyst-doc-table-scroll">
          <table className="analyst-doc-table">
            <thead>
              <tr>
                <th>Reserva</th>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Categoria</th>
                <th>Arquivo</th>
                <th>Decisao do analista</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => {
                const enviado = doc.statusArquivo === 'enviado';

                return (
                  <tr key={doc.id}>
                    <td><strong>{doc.reserva}</strong></td>
                    <td>{doc.cliente}</td>
                    <td>{doc.nome}</td>
                    <td><span className="analyst-doc-chip">{doc.categoria}</span></td>
                    <td>
                      {enviado ? (
                        <a className="analyst-doc-open" href={doc.arquivoUrl} target="_blank" rel="noreferrer">
                          Abrir
                        </a>
                      ) : (
                        <button className="analyst-doc-waiting" type="button" disabled>
                          Aguardando
                        </button>
                      )}
                    </td>
                    <td>
                      {enviado ? (
                        <select
                          className="analyst-doc-decision"
                          value={decisoes[doc.id] ?? ''}
                          onChange={(event) => setDecisoes((current) => ({ ...current, [doc.id]: event.target.value }))}
                        >
                          <option value="">Selecionar</option>
                          <option value="aprovado">Aprovado</option>
                          <option value="pendenciado">Pendenciado</option>
                        </select>
                      ) : (
                        <span className="analyst-doc-muted">Sem arquivo recebido</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
