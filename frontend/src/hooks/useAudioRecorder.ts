import { useState, useRef, useCallback } from 'react'

export type RecordingState = 'idle' | 'recording' | 'processing'

interface UseAudioRecorderReturn {
  state: RecordingState
  start: () => Promise<void>
  stop: () => Promise<Blob | null>
  audioBlob: Blob | null
  error: string | null
  durationMs: number
}

/**
 * Wraps the MediaRecorder API.
 * - start() → requests mic permission, begins recording
 * - stop()  → stops recording, resolves with the audio Blob (WebM/OGG)
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [durationMs, setDurationMs] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const resolveRef = useRef<((blob: Blob | null) => void) | null>(null)

  const start = useCallback(async () => {
    setError(null)
    setAudioBlob(null)
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Pick a supported MIME type (Whisper accepts webm, mp4, ogg, wav, etc.)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        setDurationMs(Date.now() - startTimeRef.current)
        setState('idle')
        stream.getTracks().forEach((t) => t.stop())
        resolveRef.current?.(blob)
        resolveRef.current = null
      }

      recorder.onerror = (e) => {
        const msg = (e as unknown as { error?: { message?: string } }).error?.message ?? 'Recording error'
        setError(msg)
        setState('idle')
        resolveRef.current?.(null)
        resolveRef.current = null
      }

      recorder.start(100) // collect data every 100ms
      startTimeRef.current = Date.now()
      setState('recording')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied'
      setError(msg)
      setState('idle')
    }
  }, [])

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || state !== 'recording') {
        resolve(null)
        return
      }
      resolveRef.current = resolve
      setState('processing')
      mediaRecorderRef.current.stop()
    })
  }, [state])

  return { state, start, stop, audioBlob, error, durationMs }
}
