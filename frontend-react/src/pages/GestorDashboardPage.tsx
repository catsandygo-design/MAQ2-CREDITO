import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, fetchGestorDashboard, fetchSession, logout } from '../lib/api'
import { MetricCard } from '../components/MetricCard'
import type { ClienteFaseItem, GestorDashboardResponse } from '../types'

const REFRESH_SECONDS = 30

const CARDS = [
  {
    key: 'enviados_conformidade',
    label: 'Comercial',
    subtitle: 'Clientes em processo',
    tone: 'neutral' as const,
  },
  {
    key: 'em_analise',
    label: 'Credito',
    subtitle: 'Clientes fora de processo comercial',
    tone: 'neutral' as const,
  },
  {
    key: 'conformidade_ok',
    label: 'Prontos para Repassar',
    subtitle: 'Venda finalizada + conformidade',
    tone: 'ok' as const,
  },
  {
    key: 'total_assinados',
    label: 'Assinados',
    subtitle: 'Status Caixa finalizado',
    tone: 'ok' as const,
  },
  {
    key: 'perdas_mes',
    label: 'Perdas do Mes',
    subtitle: 'Cancelado / distrato',
    tone: 'danger' as const,
  },
  {
    key: 'provaveis_cair',
    label: 'Risco de Queda',
    subtitle: 'Acima de 15 dias em processo',
    tone: 'warn' as const,
  },
  {
    key: 'sla_medio_comercial_horas',
    label: 'SLA Comercial',
    subtitle: 'Media em horas',
    tone: 'warn' as const,
    suffix: 'h',
  },
  {
    key: 'sla_medio_credito_horas',
    label: 'SLA Credito',
    subtitle: 'Media em horas',
    tone: 'warn' as const,
    suffix: 'h',
  },
]

function statusLabel(value: string | undefined): string {
  if (!value) return '-'
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function phaseFromCardKey(cardKey: string): string {
  if (cardKey === 'total_assinados') return 'assinados'
  return cardKey
}

export function GestorDashboardPage() {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<GestorDashboardResponse | null>(null)
  const [selectedCard, setSelectedCard] = useState('enviados_conformidade')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshTick, setRefreshTick] = useState(REFRESH_SECONDS)

  const loadDashboard = useCallback(async () => {
    setError('')
    try {
      const data = await fetchGestorDashboard()
      setDashboard(data)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError(err.message)
      } else {
        setError('Falha ao carregar dashboard')
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const me = await fetchSession()
        const role = String(me.role || '').toLowerCase()
        if (!['admin', 'gestor', 'gestor_credito'].includes(role)) {
          window.location.href = me.home || '/app'
          return
        }
        if (mounted) {
          await loadDashboard()
        }
      } catch {
        navigate('/login', { replace: true })
      }
    })()

    return () => {
      mounted = false
    }
  }, [loadDashboard, navigate])

  useEffect(() => {
    const id = window.setInterval(() => {
      setRefreshTick((prev) => {
        if (prev <= 1) {
          void loadDashboard()
          return REFRESH_SECONDS
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [loadDashboard])

  const phaseItems = useMemo<ClienteFaseItem[]>(() => {
    if (!dashboard) return []
    const phaseKey = phaseFromCardKey(selectedCard)
    return dashboard.clientes_por_fase?.[phaseKey] || []
  }, [dashboard, selectedCard])

  const onLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-top">
        <div>
          <h1>Gestor Comercial (React)</h1>
          <p>Migracao iniciada sem alterar API, dados ou regras do sistema atual.</p>
        </div>

        <div className="top-actions">
          <span className="badge">Auto refresh: {refreshTick}s</span>
          <button type="button" onClick={() => loadDashboard()}>
            Atualizar
          </button>
          <a href="/app/gestor" className="ghost-link">
            Tela Legada
          </a>
          <button type="button" className="danger" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="metrics-grid">
        {CARDS.map((card) => {
          const raw = dashboard?.[card.key as keyof GestorDashboardResponse]
          const value = typeof raw === 'number' ? raw : 0
          return (
            <MetricCard
              key={card.key}
              label={card.label}
              subtitle={card.subtitle}
              value={`${value}${card.suffix || ''}`}
              tone={card.tone}
              active={selectedCard === card.key}
              onClick={() => setSelectedCard(card.key)}
            />
          )
        })}
      </section>

      <section className="two-columns">
        <article className="panel">
          <div className="panel-head">
            <h2>Clientes da fase selecionada</h2>
            <span>{phaseItems.length} cliente(s)</span>
          </div>

          {loading ? <div className="empty">Carregando...</div> : null}
          {!loading && phaseItems.length === 0 ? <div className="empty">Nenhum cliente nesta fase.</div> : null}

          {!loading && phaseItems.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Empreendimento</th>
                    <th>Corretor</th>
                    <th>Comercial</th>
                    <th>Repasse</th>
                    <th>Caixa</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseItems.map((item) => (
                    <tr key={item.processo_id}>
                      <td>
                        <strong>{item.cliente_nome || '-'}</strong>
                      </td>
                      <td>{item.obra || '-'}</td>
                      <td>
                        {(item.corretor || '-')}
                        <small>{item.imobiliaria || 'Sem imobiliaria'}</small>
                      </td>
                      <td>{statusLabel(item.estagio_comercial)}</td>
                      <td>{statusLabel(item.etapa_repasse)}</td>
                      <td>{statusLabel(item.status_cca)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>

        <article className="panel">
          <div className="panel-head">
            <h2>Volume por Imobiliaria</h2>
            <span>{dashboard?.imobiliarias?.length || 0} imobiliaria(s)</span>
          </div>

          {!dashboard?.imobiliarias?.length ? (
            <div className="empty">Sem dados de imobiliarias.</div>
          ) : (
            <div className="imob-list">
              {dashboard.imobiliarias.map((imob) => {
                const top = Math.max(1, dashboard.imobiliarias[0]?.total || 1)
                const pct = Math.round((imob.total / top) * 100)
                return (
                  <article key={imob.nome} className="imob-item">
                    <div className="imob-row">
                      <strong>{imob.nome}</strong>
                      <span>{imob.total}</span>
                    </div>
                    <div className="bar">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <div className="corretores">
                      {imob.corretores.slice(0, 3).map((c) => (
                        <div key={`${imob.nome}-${c.nome}`} className="imob-row">
                          <small>{c.nome}</small>
                          <small>{c.total}</small>
                        </div>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </article>
      </section>
    </main>
  )
}
