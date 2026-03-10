import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AnalistaPainelPage } from './pages/AnalistaPainelPage'
import { LoginPage } from './pages/LoginPage'
import './App.css'

function LegacyRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">SioCred</div>
        <h1>Redirecionando</h1>
        <p>Abrindo a tela oficial do gestor.</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/gestor" element={<LegacyRedirect to="/app/gestor" />} />
      <Route path="/analista" element={<AnalistaPainelPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
