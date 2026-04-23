import { Navigate, Route, Routes } from 'react-router-dom'
import { AnalistaPainelPage } from './pages/AnalistaPainelPage'
import { GestorDashboardPage } from './pages/GestorDashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PresentationPage } from './pages/PresentationPage'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/apresentacao" element={<PresentationPage />} />
      <Route path="/gestor" element={<GestorDashboardPage />} />
      <Route path="/gestor-credito" element={<GestorDashboardPage />} />
      <Route path="/analista" element={<AnalistaPainelPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
