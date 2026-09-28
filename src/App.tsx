import React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';

// Importando páginas
import HomePage from './app/page';
import AnalistaPage from './app/analista/page';
import AnalistaChecklistPage from './app/analista/checklist/page';
import CcaAcompanhamentoPage from './app/cca/acompanhamento/page';
import CcaChecklistPage from './app/cca/checklist/page';
import CorretorPage from './app/corretor/page';
import GestorChecklistPage from './app/gestor/checklist/page';
import GestorTelemetriaPage from './app/gestor/telemetria/page';
import LoginPage from './app/login/page';
import PainelChecklistPage from './app/painel/checklist-documentos/page';
import ChecklistAvanco from './components/ChecklistAvanco';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      {import.meta.env.DEV ? <Route path="/dev/checklist-preview" element={<ChecklistAvanco />} /> : null}
      <Route element={<RequireAuth />}>
        <Route path="/analista" element={<AnalistaPage />} />
        <Route path="/analista/checklist" element={<AnalistaChecklistPage />} />
        <Route path="/cca/acompanhamento" element={<CcaAcompanhamentoPage />} />
        <Route path="/cca/checklist" element={<CcaChecklistPage />} />
        <Route path="/corretor" element={<CorretorPage />} />
        <Route path="/gestor/checklist" element={<GestorChecklistPage />} />
        <Route path="/gestor/telemetria" element={<GestorTelemetriaPage />} />
        <Route path="/painel/checklist-documentos" element={<PainelChecklistPage />} />
        <Route path="/checklist-novo" element={<ChecklistAvanco />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
