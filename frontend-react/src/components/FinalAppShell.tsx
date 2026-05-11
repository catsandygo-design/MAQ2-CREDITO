import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ApiError, fetchSession, logout } from '../lib/api'
import { FINAL_MODULES } from '../config/finalNavigation'
import type { AuthSession } from '../types'

interface FinalAppShellProps {
  children: ReactNode
  title?: string
  subtitle?: string
}

const STATUS_LABEL = {
  'react-ready': 'React ativo',
  'react-structure': 'Estrutura React',
  'legacy-bridge': 'Ponte legado',
}

// Shell final da aplicacao React. Ele concentra navegacao, sessao e saida,
// deixando cada pagina cuidar apenas do conteudo de negocio.
export function FinalAppShell({ children, title = 'SioCred Final', subtitle }: FinalAppShellProps) {
  const navigate = useNavigate()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchSession()
      .then((data) => {
        if (active) setSession(data)
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err instanceof Error ? err.message : 'Falha ao carregar sessao')
      })
    return () => {
      active = false
    }
  }, [navigate])

  const onLogout = async () => {
    await logout().catch(() => undefined)
    navigate('/login', { replace: true })
  }

  return (
    <div className="final-shell">
      <header className="final-topbar">
        <div>
          <span className="final-kicker">Aplicacao final React</span>
          <h1>{title}</h1>
          <p>{subtitle || 'Estrutura progressiva para substituir telas HTML somente quando houver paridade funcional.'}</p>
        </div>
        <div className="final-session">
          <span>{session ? `${session.username} - ${session.role}` : 'Validando sessao'}</span>
          <button type="button" onClick={onLogout}>Sair</button>
        </div>
      </header>

      {error ? <div className="final-error">{error}</div> : null}

      <div className="final-layout">
        <aside className="final-sidebar" aria-label="Navegacao final">
          <strong>Mapa final</strong>
          <nav>
            {FINAL_MODULES.map((module) => (
              <NavLink key={module.key} to={module.path} className={({ isActive }) => (isActive ? 'active' : '')}>
                <span>{module.label}</span>
                <small>{STATUS_LABEL[module.status]}</small>
              </NavLink>
            ))}
          </nav>
        </aside>

        <section className="final-content">
          {children}
        </section>
      </div>
    </div>
  )
}
