import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

export function ScreenControls() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => !!document.fullscreenElement)
  const [statusMsg, setStatusMsg] = useState('')

  const supportsFullscreen = Boolean(document.fullscreenEnabled && document.documentElement?.requestFullscreen)

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const showStatus = (msg: string) => setStatusMsg(msg)

  const toggleFullscreen = async () => {
    if (!supportsFullscreen) return showStatus('Fullscreen não suportado.')
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      showStatus('Falha ao alternar fullscreen.')
      console.error(err)
    }
  }

  return (
    <>
      <div style={styles.controls}>
        <button
          style={buttonStyle(supportsFullscreen)}
          onClick={toggleFullscreen}
          disabled={!supportsFullscreen}
          aria-label="Alternar tela cheia"
        >
          ? {isFullscreen ? 'Sair do fullscreen' : 'Tela cheia'}
        </button>
      </div>

      {statusMsg && <div style={styles.inlineStatus}>{statusMsg}</div>}
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  controls: {
    position: 'fixed',
    top: 12,
    right: 12,
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    zIndex: 50,
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid #1f2937',
    borderRadius: 10,
    padding: '8px 10px',
    boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
  },
  inlineStatus: {
    position: 'fixed',
    top: 56,
    right: 12,
    padding: '8px 12px',
    background: '#1f2937',
    color: '#e5e7eb',
    borderRadius: 8,
    border: '1px solid #334155',
    zIndex: 50,
    fontWeight: 600,
  },
}

const buttonStyle = (enabled: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #1f2937',
  background: '#1f2937',
  color: '#e5e7eb',
  cursor: enabled ? 'pointer' : 'not-allowed',
  opacity: enabled ? 1 : 0.5,
  fontWeight: 600,
  transition: 'transform 120ms ease, background 120ms ease, border 120ms ease',
  boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
})
