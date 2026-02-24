import type { AssessResponse } from '../types'

const BASE = '/api'

/**
 * Sends a recorded audio blob + the expected word to the backend
 * for Whisper transcription and accuracy scoring.
 */
export async function assessPronunciation(
  audio: Blob,
  expectedWord: string,
  expectedRoman: string,
  lang: 'ja' | 'th',
): Promise<AssessResponse> {
  const form = new FormData()
  // Whisper requires a filename with a valid audio extension
  const ext = audio.type.includes('ogg') ? 'ogg' : 'webm'
  form.append('audio', audio, `recording.${ext}`)
  form.append('expectedWord', expectedWord)
  form.append('expectedRoman', expectedRoman)
  form.append('lang', lang)

  const res = await fetch(`${BASE}/assess`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Server error ${res.status}: ${text}`)
  }

  return res.json() as Promise<AssessResponse>
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`)
    return res.ok
  } catch {
    return false
  }
}
