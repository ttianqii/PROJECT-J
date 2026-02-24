import { useState, useCallback, useEffect, useRef } from 'react'

interface UseTTSReturn {
  speak: (text: string, lang: 'ja-JP' | 'th-TH') => void
  isSpeaking: boolean
  isSupported: boolean
  error: string | null
}

/**
 * Wraps the Web Speech API (SpeechSynthesis).
 * Picks the best available voice for the target language automatically.
 */
export function useTTS(): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  // Load voices (may be async on first load in Chrome)
  useEffect(() => {
    if (!isSupported) return
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices()
    }
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [isSupported])

  const speak = useCallback(
    (text: string, lang: 'ja-JP' | 'th-TH') => {
      if (!isSupported) {
        setError('Text-to-speech is not supported in this browser.')
        return
      }

      setError(null)
      window.speechSynthesis.cancel() // stop any current speech

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang

      // Find the best matching voice for this language
      const voices = voicesRef.current
      const exact = voices.find((v) => v.lang === lang)
      const loose = voices.find((v) => v.lang.startsWith(lang.split('-')[0]))
      if (exact) utterance.voice = exact
      else if (loose) utterance.voice = loose

      // Tuning for naturalness
      utterance.rate = 0.85   // slightly slower helps learners
      utterance.pitch = 1.0
      utterance.volume = 1.0

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = (e) => {
        setIsSpeaking(false)
        if (e.error !== 'interrupted') {
          setError(`TTS error: ${e.error}`)
        }
      }

      window.speechSynthesis.speak(utterance)
    },
    [isSupported],
  )

  return { speak, isSpeaking, isSupported, error }
}
