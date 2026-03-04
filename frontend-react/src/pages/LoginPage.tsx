import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, login } from '../lib/api'

export function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => username.trim().length > 0 && password.trim().length > 0, [username, password])

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (!canSubmit || busy) return

    setBusy(true)
    setError('')
    try {
      const out = await login(username.trim(), password)
      const role = String(out.role || '').toLowerCase()
      if (role === 'gestor' || role === 'gestor_credito' || role === 'admin') {
        navigate('/gestor', { replace: true })
      } else if (role === 'analista') {
        navigate('/analista', { replace: true })
      } else if (out.home) {
        window.location.href = out.home
      } else {
        window.location.href = '/app'
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Falha ao conectar com o servidor')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">SioCred</div>
        <h1>Sistema de Credito</h1>
        <p>Acesso React em migracao. Login usa a mesma base do sistema atual.</p>

        <form onSubmit={onSubmit} className="auth-form">
          <label>
            Usuario
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </label>

          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button type="submit" disabled={!canSubmit || busy}>
            {busy ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {error ? <div className="auth-error">{error}</div> : null}
      </div>
    </div>
  )
}
