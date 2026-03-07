import { Navigate, Route, Routes } from 'react-router-dom'
import { LEGACY_SCREEN_ROUTES } from './config/legacyScreens'
import { AnalistaPainelPage } from './pages/AnalistaPainelPage'
import { GestorDashboardPage } from './pages/GestorDashboardPage'
import { LegacyEmbeddedPage } from './pages/LegacyEmbeddedPage'
import { LoginPage } from './pages/LoginPage'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/gestor" element={<GestorDashboardPage />} />
      <Route path="/analista" element={<AnalistaPainelPage />} />
      {LEGACY_SCREEN_ROUTES.map((route) => (
        <Route key={route.path} path={route.path} element={<LegacyEmbeddedPage route={route} />} />
      ))}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

