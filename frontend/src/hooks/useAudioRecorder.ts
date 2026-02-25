import { useState, useRef, useCallback, useEffect } from 'react'

export type RecordingState = 'idle' | 'recording' | 'processing'

interface UseAudioRecorderReturn {
  state: RecordingState
  start: () => Promise<void>
  stop: () => Promise<Blob | null>
  audioBlob: Blob | null
  error: string | null
  durationMs: number
}

/** Pick the best MIME type the browser supports — includes iOS audio/mp4 */
function getBestMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
  ]
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

/**
 * Wraps the MediaRecorder API.
 * - Keeps the mic stream alive between recordings (no repeated permission prompts)
 * - Supports iOS Safari (audio/mp4) as well as Chrome/Firefox (webm)
 * - start() → requests mic permission on first use, begins recording
 * - stop()  → stops recording, resolves with the audio Blob
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [durationMs, setDurationMs] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)   // persistent mic stream
  const mimeTypeRef = useRef<string>('')
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const resolveRef = useRef<((blob: Blob | null) => void) | null>(null)

  // Release mic only when component unmounts
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  const start = useCallback(async () => {
    setError(null)
    setAudioBlob(null)
    chunksRef.current = []

    try {
      // Reuse existing stream if still active — avoids repeated permission prompts on iOS
      if (!streamRef.current?.active) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      }
      const stream = streamRef.current
      const mimeType = getBestMimeType()
      mimeTypeRef.current = mimeType

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        // Use the known mimeType — chunk.type can be empty on iOS
        const blobType = mimeTypeRef.current || 'audio/mp4'
        const blob = new Blob(chunksRef.current, { type: blobType })
        setAudioBlob(blob)
        setDurationMs(Date.now() - startTimeRef.current)
        setState('idle')
        // Do NOT stop stream — keep mic alive for next recording
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

      recorder.start(100)
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

