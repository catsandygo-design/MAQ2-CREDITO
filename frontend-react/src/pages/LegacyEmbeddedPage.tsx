import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { type LegacyScreenRoute } from '../config/legacyScreens'
import { reactHomeForRole } from '../config/reactHome'
import { ApiError, fetchSession } from '../lib/api'

interface LegacyEmbeddedPageProps {
  route: LegacyScreenRoute
}

export function LegacyEmbeddedPage({ route }: LegacyEmbeddedPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [loadedSrc, setLoadedSrc] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        const session = await fetchSession()
        const role = String(session.role || '')
          .trim()
          .toLowerCase()

        if (!route.allowedRoles.includes(role)) {
          if (active) {
            navigate(reactHomeForRole(session.role), { replace: true })
          }
        }
      } catch (err) {
        if (!active) return
        if (err instanceof ApiError && err.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setError('Falha ao validar sessao para abrir a tela.')
      }
    })()

    return () => {
      active = false
    }
  }, [navigate, route.allowedRoles])

  const frameSrc = useMemo(() => {
    const cleanPath = route.legacyPath.startsWith('/') ? route.legacyPath : `/${route.legacyPath}`
    if (!route.forwardQuery || !location.search) return cleanPath
    return `${cleanPath}${location.search}`
  }, [location.search, route.forwardQuery, route.legacyPath])
  const isLoading = loadedSrc !== frameSrc

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-5 text-sm text-red-700 shadow-sm">
          <p className="font-semibold">Tela indisponivel</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            className="mt-4 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
            onClick={() => navigate('/login', { replace: true })}
          >
            Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-100">
      {isLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/90 text-sm font-semibold text-slate-600">
          Carregando {route.title}...
        </div>
      ) : null}
      <iframe
        key={frameSrc}
        title={route.title}
        src={frameSrc}
        className="block h-full w-full border-0"
        onLoad={() => setLoadedSrc(frameSrc)}
      />
    </div>
  )
}
