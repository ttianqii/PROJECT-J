import type { AssessResponse, TranscribeResponse } from '../types'

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
  // Whisper needs a filename with a recognised extension to detect the format.
  // Chrome produces 'video/webm' (audio-only content in a webm container) —
  // that's fine, .webm is a valid extension Whisper accepts.
  let ext = 'webm'
  if (audio.type.includes('ogg')) ext = 'ogg'
  else if (audio.type.includes('mp4') || audio.type.includes('m4a')) ext = 'mp4'
  else if (audio.type.includes('wav')) ext = 'wav'
  // 'video/webm' also maps to 'webm' — handled by the default above
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

/**
 * Free-speak mode: sends recorded audio to Whisper for transcription only.
 * No expected word, no scoring — just shows what the user said.
 */
export async function transcribeAudio(
  audio: Blob,
  lang: 'ja' | 'th',
): Promise<TranscribeResponse> {
  const form = new FormData()
  let ext = 'webm'
  if (audio.type.includes('ogg')) ext = 'ogg'
  else if (audio.type.includes('mp4') || audio.type.includes('m4a')) ext = 'mp4'
  else if (audio.type.includes('wav')) ext = 'wav'
  form.append('audio', audio, `recording.${ext}`)
  form.append('lang', lang)

  const res = await fetch(`${BASE}/transcribe`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Server error ${res.status}: ${text}`)
  }

  return res.json() as Promise<TranscribeResponse>
}
