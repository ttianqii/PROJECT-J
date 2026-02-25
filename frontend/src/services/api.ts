import type { AssessResponse, TranscribeResponse, VocabEntry } from '../types'

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

/**
 * Look up any word via GPT-4o — returns a full VocabEntry-shaped object
 * for words not in the local preset dataset.
 */
export async function lookupWord(
  word: string,
  lang: 'ja' | 'th',
): Promise<{ ok: boolean; entry: VocabEntry | null; error?: string }> {
  const res = await fetch(`${BASE}/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, lang }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Server error ${res.status}: ${text}`)
  }
  return res.json()
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

/**
 * Tokenize a sentence into glossed tokens (word-by-word with pitch/tone data).
 */
export async function tokenizeSentence(
  sentence: string,
  lang: 'ja' | 'th',
): Promise<{ ok: boolean; tokens: import('../types').SentenceToken[]; translationTh: string; translationJa: string; error?: string }> {
  const res = await fetch(`${BASE}/tokenize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sentence, lang }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Server error ${res.status}: ${text}`)
  }
  return res.json()
}
