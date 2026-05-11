import { Navigate, Route, Routes } from 'react-router-dom'
import { AnalistaPainelPage } from './pages/AnalistaPainelPage'
import { FinalAppShell } from './components/FinalAppShell'
import { FinalWorkspacePage } from './pages/FinalWorkspacePage'
import { GestorDashboardPage } from './pages/GestorDashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PresentationPage } from './pages/PresentationPage'
import './App.css'

function FinalModuleRoute({ moduleKey }: { moduleKey: string }) {
  return (
    <FinalAppShell>
      <FinalWorkspacePage moduleKey={moduleKey} />
    </FinalAppShell>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/apresentacao" element={<PresentationPage />} />

      {/* Rotas React finais: cada modulo ganha estrutura antes da tela HTML sair do menu. */}
      <Route path="/inicio" element={<FinalModuleRoute moduleKey="inicio" />} />
      <Route path="/central" element={<Navigate to="/analista" replace />} />
      <Route path="/analise" element={<FinalModuleRoute moduleKey="analise" />} />
      <Route path="/importacao" element={<FinalModuleRoute moduleKey="importacao" />} />
      <Route path="/repasse" element={<FinalModuleRoute moduleKey="repasse" />} />
      <Route path="/foguetinho" element={<FinalModuleRoute moduleKey="foguetinho" />} />
      <Route path="/frankstein" element={<Navigate to="/foguetinho" replace />} />
      <Route path="/admin" element={<FinalModuleRoute moduleKey="admin" />} />

      {/* Pontes com nomes antigos para facilitar a migracao incremental. */}
      <Route path="/analista/acompanhamento" element={<FinalModuleRoute moduleKey="central" />} />
      <Route path="/analista/acompanhamento-operacional" element={<FinalModuleRoute moduleKey="central" />} />
      <Route path="/analista/reuniao-comercial" element={<FinalModuleRoute moduleKey="central" />} />
      <Route path="/analista/repasse" element={<FinalModuleRoute moduleKey="repasse" />} />
      <Route path="/analista/importacao" element={<FinalModuleRoute moduleKey="importacao" />} />
      <Route path="/analista/arquivados" element={<FinalModuleRoute moduleKey="central" />} />

      {/* Telas React que ja usam dados reais continuam como modulos produtivos. */}
      <Route path="/gestor" element={<GestorDashboardPage />} />
      <Route path="/gestor-credito" element={<GestorDashboardPage />} />
      <Route path="/analista" element={<AnalistaPainelPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
