import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

export function ScreenControls() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => !!document.fullscreenElement)
  const [isSharing, setIsSharing] = useState(false)
  const [isShareLoading, setIsShareLoading] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [withAudio, setWithAudio] = useState(false)

  const supportsFullscreen = Boolean(document.fullscreenEnabled && document.documentElement?.requestFullscreen)
  const supportsShare = Boolean(navigator.mediaDevices?.getDisplayMedia)

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stopSharing()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [stream])

  useEffect(() => () => stopSharing(), [])

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

  const startSharing = async () => {
    if (!supportsShare) return showStatus('Compartilhamento não suportado.')
    setIsShareLoading(true)
    setStatusMsg('')
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: withAudio })
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => videoRef.current?.play().catch(() => {})
      }
      mediaStream.getTracks().forEach((t) => (t.onended = () => stopSharing()))
      setStream(mediaStream)
      setIsSharing(true)
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') showStatus('Erro ao compartilhar.')
      console.error(err)
      setIsSharing(false)
    } finally {
      setIsShareLoading(false)
    }
  }

  const stopSharing = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setStream(null)
    setIsSharing(false)
  }

  const handleShareClick = () => (isSharing ? stopSharing() : startSharing())

  return (
    <>
      <div style={styles.controls}>
        <button
          style={buttonStyle(supportsFullscreen)}
          onClick={toggleFullscreen}
          disabled={!supportsFullscreen}
          aria-label="Alternar tela cheia"
        >
          ⛶ {isFullscreen ? 'Sair do fullscreen' : 'Tela cheia'}
        </button>

        <button
          style={{ ...buttonStyle(supportsShare && !isShareLoading), ...(isSharing ? styles.active : {}) }}
          onClick={handleShareClick}
          disabled={!supportsShare || isShareLoading}
          aria-label="Compartilhar tela"
        >
          {isShareLoading ? 'Abrindo…' : isSharing ? 'Parar compartilhar' : 'Compartilhar tela'}
        </button>

        <label style={styles.inlineControl}>
          <input
            type="checkbox"
            checked={withAudio}
            onChange={(e) => setWithAudio(e.target.checked)}
            disabled={isSharing || isShareLoading}
          />
          Capturar áudio
        </label>
      </div>

      {statusMsg && <div style={styles.inlineStatus}>{statusMsg}</div>}

      {isSharing && (
        <div ref={containerRef} style={styles.previewBox}>
          <p style={styles.status}>Compartilhando…</p>
          <video ref={videoRef} style={styles.video} muted playsInline autoPlay />
        </div>
      )}
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
    flexWrap: 'wrap',
    background: 'rgba(15,23,42,0.6)',
    border: '1px solid #1f2937',
    borderRadius: 10,
    padding: '8px 10px',
    boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
  },
  active: { backgroundColor: '#10b981', color: '#0b172a', borderColor: '#0ea371' },
  inlineControl: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: '#cbd5e1' },
  select: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #1f2937', borderRadius: 8, padding: '6px 8px' },
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
  previewBox: {
    position: 'fixed',
    bottom: 16,
    right: 16,
    width: 260,
    maxWidth: '45vw',
    border: '1px solid #1f2937',
    borderRadius: 10,
    padding: 10,
    background: '#0b1220',
    boxShadow: '0 8px 22px rgba(0,0,0,0.32)',
    zIndex: 40,
  },
  status: { margin: '0 0 12px 0', fontWeight: 600, color: '#a5b4fc' },
  video: {
    width: '100%',
    maxHeight: '70vh',
    borderRadius: 12,
    background: '#111827',
    border: '1px solid #1f2937',
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
