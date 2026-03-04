import { Navigate, Route, Routes } from 'react-router-dom'
import { AnalistaPainelPage } from './pages/AnalistaPainelPage'
import { GestorDashboardPage } from './pages/GestorDashboardPage'
import { LoginPage } from './pages/LoginPage'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/gestor" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/gestor" element={<GestorDashboardPage />} />
      <Route path="/analista" element={<AnalistaPainelPage />} />
      <Route path="*" element={<Navigate to="/gestor" replace />} />
    </Routes>
  )
}
