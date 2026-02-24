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

      try {
        const openai = getOpenAI()

        // Call Whisper with the correct language hint
        const transcriptionRes = await openai.audio.transcriptions.create({
          model: 'whisper-1',
          file: audio,
          language: lang,
          response_format: 'json',
        })

        const transcribed = transcriptionRes.text?.trim() ?? ''
        const accuracy = calcAccuracy(expectedRoman, transcribed)
        const diff = charDiff(expectedRoman, transcribed)
        const feedback = buildFeedback(accuracy)

        return {
          ok: true,
          transcribed,
          accuracy,
          charDiff: diff,
          feedback,
        }
      } catch (err: unknown) {
        console.error('[assess] error:', err)
        const msg = err instanceof Error ? err.message : 'Unknown error'
        return {
          ok: false,
          transcribed: '',
          accuracy: 0,
          charDiff: [],
          feedback: {
            th: `เกิดข้อผิดพลาด: ${msg}`,
            ja: `エラーが発生しました: ${msg}`,
          },
          error: msg,
        }
      }
    },
    {
      // Elysia body schema — multipart/form-data
      body: t.Object({
        audio: t.File({ type: 'audio/*' }),
        expectedWord: t.String(),
        expectedRoman: t.String(),
        lang: t.Union([t.Literal('ja'), t.Literal('th')]),
      }),
    },
  )
