// ─── Language Modes ────────────────────────────────────────────────────────────
export type LearnerMode = 'th-ja' | 'ja-th'

// ─── Japanese-specific accent / pitch ─────────────────────────────────────────
export type PitchType = 'flat' | 'atamadaka' | 'nakadaka' | 'odaka' | 'heiban'

export interface PitchSyllable {
  kana: string        // the syllable in kana
  roman: string       // romaji
  isHigh: boolean     // true = high pitch, false = low
  isAccentDrop: boolean // true = pitch drops AFTER this mora
}

// ─── Thai-specific tone information ───────────────────────────────────────────
export type ToneName = 'mid' | 'low' | 'falling' | 'high' | 'rising'

export interface ThaiSyllable {
  thai: string        // Thai script character(s)
  roman: string       // RTGS romanization
  tone: ToneName      // tone class
}

// ─── Core vocabulary entry ─────────────────────────────────────────────────────
export interface VocabEntry {
  id: string
  category: string

  // The word in its native script
  word: string
  reading: string     // Hiragana/Katakana for JP; Thai script for TH

  // Phonetics
  romanization: string  // romaji for JP; RTGS for TH
  ipa?: string          // optional IPA

  // Pitch / tone breakdown (per syllable / mora)
  syllables: PitchSyllable[] | ThaiSyllable[]

  // Meaning displayed to the learner
  meaningTh: string
  meaningJa: string

  // Example sentence in the source language
  exampleSentence: string
  exampleTranslation: string  // translated for learner

  // Text-to-speech target language code
  ttsLang: 'ja-JP' | 'th-TH'

  // Extra study notes
  notes?: string
}

// ─── Assessment API types ──────────────────────────────────────────────────────
export interface AssessRequest {
  expectedWord: string
  expectedRoman: string
  lang: 'ja' | 'th'
}

export interface WordTiming {
  word: string
  start: number
  end: number
}

export interface AssessResponse {
  ok: boolean
  transcribed: string           // what Whisper heard
  wordTimings: WordTiming[]     // per-word timestamps from Whisper

  // Native-script character match (expectedWord vs transcribed)
  accuracy: number              // 0–100
  charDiff: CharDiffToken[]

  // Simple rule-based feedback (fallback)
  feedback: {
    th: string
    ja: string
  }

  // GPT-4o phonetic analysis (primary score & coaching)
  aiScore: number               // 0–100 phonetic score
  aiFeedback: string            // coaching tip in target language
  mispronounced: string[]       // syllables / sounds that were off

  error?: string
}

export interface CharDiffToken {
  char: string
  status: 'correct' | 'wrong' | 'missing' | 'extra'
}
