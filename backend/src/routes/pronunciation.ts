import { Elysia, t } from 'elysia'
import OpenAI from 'openai'

// ─── OpenAI client (key loaded from backend/.env) ───────────────────────────
function getOpenAI() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set in backend/.env')
  return new OpenAI({ apiKey: key })
}

// ─── Levenshtein distance ────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  // Use a flat 1D array for strict null-safety
  const dp: number[] = Array.from({ length: (m + 1) * (n + 1) }, () => 0)
  const idx = (i: number, j: number) => i * (n + 1) + j

  for (let i = 0; i <= m; i++) dp[idx(i, 0)] = i
  for (let j = 0; j <= n; j++) dp[idx(0, j)] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[idx(i, j)] = dp[idx(i - 1, j - 1)]!
      } else {
        dp[idx(i, j)] = 1 + Math.min(
          dp[idx(i - 1, j)]!,
          dp[idx(i, j - 1)]!,
          dp[idx(i - 1, j - 1)]!,
        )
      }
    }
  }
  return dp[idx(m, n)]!
}

// ─── Accuracy score (0–100) ───────────────────────────────────────────────────
function calcAccuracy(expected: string, transcribed: string): number {
  const a = expected.toLowerCase().replace(/\s+/g, '')
  const b = transcribed.toLowerCase().replace(/\s+/g, '')
  if (!a.length) return 0
  const dist = levenshtein(a, b)
  return Math.max(0, Math.round(((a.length - dist) / a.length) * 100))
}

// ─── Character-level diff ─────────────────────────────────────────────────────
type DiffStatus = 'correct' | 'wrong' | 'missing' | 'extra'
interface CharDiff {
  char: string
  status: DiffStatus
}

function charDiff(expected: string, transcribed: string): CharDiff[] {
  const exp = expected.toLowerCase().replace(/\s+/g, '')
  const got = transcribed.toLowerCase().replace(/\s+/g, '')
  const result: CharDiff[] = []

  const maxLen = Math.max(exp.length, got.length)
  for (let i = 0; i < maxLen; i++) {
    const ec = exp[i]
    const gc = got[i]
    if (ec && gc) {
      result.push({ char: gc, status: ec === gc ? 'correct' : 'wrong' })
    } else if (ec && !gc) {
      result.push({ char: ec, status: 'missing' })
    } else if (!ec && gc) {
      result.push({ char: gc, status: 'extra' })
    }
  }
  return result
}

// ─── Feedback messages ────────────────────────────────────────────────────────
function buildFeedback(accuracy: number): { th: string; ja: string } {
  if (accuracy >= 90) {
    return {
      th: '🎉 ยอดเยี่ยมมาก! การออกเสียงของคุณถูกต้องมาก!',
      ja: '🎉 素晴らしい！発音がとても正確です！',
    }
  } else if (accuracy >= 70) {
    return {
      th: '👍 ดีมาก! ลองฝึกอีกนิดเพื่อให้ชัดขึ้น',
      ja: '👍 よくできました！もう少し練習するとさらに上手になります',
    }
  } else if (accuracy >= 50) {
    return {
      th: '💪 พยายามดีนะ! ลองฟังเสียงตัวอย่างอีกรอบแล้วฝึกใหม่',
      ja: '💪 頑張っています！もう一度お手本の音声を聞いて練習してみましょう',
    }
  } else {
    return {
      th: '🔄 ลองใหม่นะ! กดปุ่ม 🔊 เพื่อฟังตัวอย่างก่อน',
      ja: '🔄 もう一度試してみましょう！🔊ボタンでお手本を聞いてから練習してください',
    }
  }
}

// ─── GPT-4o pronunciation analysis ───────────────────────────────────────────
interface WordTiming {
  word: string
  start: number
  end: number
}

interface AIAnalysis {
  score: number
  feedback: string
  mispronounced: string[]
}

async function analyzeWithGPT(
  openai: OpenAI,
  expectedWord: string,
  expectedRoman: string,
  spokenText: string,
  wordTimings: WordTiming[],
  lang: 'ja' | 'th',
): Promise<AIAnalysis> {
  // lang = 'ja'  → Thai person learning Japanese  → coach speaks Thai
  // lang = 'th'  → Japanese person learning Thai  → coach speaks Japanese
  const targetLang   = lang === 'ja' ? 'Japanese' : 'Thai'
  const feedbackLang = lang === 'ja' ? 'Thai'     : 'Japanese'

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a strict ${targetLang} pronunciation coach.
The learner's native language is ${feedbackLang}.
Your task: compare what the learner said against the target word and give an honest score.

Rules:
- "expectedWord" is the correct native-script target (${targetLang}).
- "expectedRoman" is its romanisation / reading guide.
- "spokenText" is what the speech recogniser heard from the learner.
- Score 0-100 based on phonetic closeness (NOT character-by-character).
  * 90-100  = near-perfect pronunciation
  * 70-89   = minor issues (tone, length, aspiration)
  * 50-69   = noticeable errors but intelligible
  * 30-49   = significant errors, hard to understand
  * 0-29    = very wrong or completely different word
- "mispronounced": list specific syllables or sounds that were off (in ${targetLang} script).
- IMPORTANT: Write "feedback" in ${feedbackLang} so the learner can understand it.

Return ONLY valid JSON:
{
  "score": <integer 0-100>,
  "feedback": "<coaching tip written in ${feedbackLang}>",
  "mispronounced": ["<syllable or sound in ${targetLang}>", ...]
}`,
      },
      {
        role: 'user',
        content: `Target word  : "${expectedWord}"  (romanisation: ${expectedRoman})
Learner said : "${spokenText}"
Word timings : ${JSON.stringify(wordTimings)}

Give an honest score and actionable feedback in ${feedbackLang}.`,
      },
    ],
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as Partial<AIAnalysis>
  return {
    score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 0,
    feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
    mispronounced: Array.isArray(parsed.mispronounced) ? parsed.mispronounced : [],
  }
}

// ─── Route plugin ─────────────────────────────────────────────────────────────
export const pronunciationRoutes = new Elysia({ prefix: '/api' })

  .post(
    '/assess',
    async ({ body }) => {
      const { audio, expectedWord, expectedRoman, lang } = body as {
        audio: File
        expectedWord: string
        expectedRoman: string
        lang: 'ja' | 'th'
      }

      // NOTE: Chrome's MediaRecorder always produces 'video/webm' even for
      // audio-only recordings. Whisper handles webm/ogg/mp4/wav regardless
      // of whether the container MIME says 'audio/' or 'video/'.
      // Do NOT gate on MIME type here — just let Whisper decide.

      try {
        const openai = getOpenAI()

        // ── Step 1: Whisper transcription with word-level timestamps ──────────
        const transcriptionRes = await openai.audio.transcriptions.create({
          model: 'whisper-1',
          file: audio,
          language: lang,
          response_format: 'verbose_json',       // required for word timestamps
          timestamp_granularities: ['word'],      // per-word start/end times
        })

        const transcribed = transcriptionRes.text?.trim() ?? ''
        const wordTimings: WordTiming[] = (transcriptionRes.words ?? []).map((w) => ({
          word: w.word,
          start: w.start,
          end: w.end,
        }))

        // ── Step 2: Native-script diff (expected word vs what Whisper heard) ─
        // Compare native script ↔ native script so scores are meaningful.
        const accuracy = calcAccuracy(expectedWord, transcribed)
        const diff = charDiff(expectedWord, transcribed)
        const feedback = buildFeedback(accuracy)

        // ── Step 3: GPT-4o deep pronunciation analysis ────────────────────────
        const aiAnalysis = await analyzeWithGPT(
          openai,
          expectedWord,
          expectedRoman,
          transcribed,
          wordTimings,
          lang,
        )

        return {
          ok: true,
          transcribed,
          wordTimings,
          // Legacy character-diff score (kept for UI compatibility)
          accuracy,
          charDiff: diff,
          feedback,
          // AI-powered analysis
          aiScore: aiAnalysis.score,
          aiFeedback: aiAnalysis.feedback,
          mispronounced: aiAnalysis.mispronounced,
        }
      } catch (err: unknown) {
        console.error('[assess] error:', err)
        const msg = err instanceof Error ? err.message : 'Unknown error'
        return {
          ok: false,
          transcribed: '',
          wordTimings: [],
          accuracy: 0,
          charDiff: [],
          feedback: {
            th: `เกิดข้อผิดพลาด: ${msg}`,
            ja: `エラーが発生しました: ${msg}`,
          },
          aiScore: 0,
          aiFeedback: '',
          mispronounced: [],
          error: msg,
        }
      }
    },
    {
      // Elysia body schema — multipart/form-data
      // NOTE: do NOT pass { type: 'audio/*' } — Elysia/TypeBox does not support
      // wildcard MIME patterns; it will reject the File with a 422 validation error.
      // MIME validation is done manually in the handler instead.
      body: t.Object({
        audio: t.File(),
        expectedWord: t.String(),
        expectedRoman: t.String(),
        lang: t.Union([t.Literal('ja'), t.Literal('th')]),
      }),
    },
  )

  // ─── /api/transcribe ── free-speak: just Whisper, no scoring ─────────────
  .post(
    '/transcribe',
    async ({ body }) => {
      const { audio, lang } = body as { audio: File; lang: 'ja' | 'th' }
      try {
        const openai = getOpenAI()
        const transcriptionRes = await openai.audio.transcriptions.create({
          model: 'whisper-1',
          file: audio,
          language: lang,
          response_format: 'verbose_json',
          timestamp_granularities: ['word'],
        })
        const transcribed = transcriptionRes.text?.trim() ?? ''
        const wordTimings = (transcriptionRes.words ?? []).map((w) => ({
          word: w.word,
          start: w.start,
          end: w.end,
        }))
        return { ok: true, transcribed, wordTimings }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        return { ok: false, transcribed: '', wordTimings: [], error: msg }
      }
    },
    {
      body: t.Object({
        audio: t.File(),
        lang: t.Union([t.Literal('ja'), t.Literal('th')]),
      }),
    },
  )
