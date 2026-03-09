# รายงานทางเทคนิค PROJECT-J

## การออกแบบและพัฒนาระบบการเรียนรู้การออกเสียงภาษาไทย-ญี่ปุ่นที่ขับเคลื่อนด้วย AI

---

**หมายเลขรายงาน:** PJ-TECH-001  
**วันที่จัดทำ:** 25 กุมภาพันธ์ 2569  
**ประเภท:** เอกสารทางเทคนิค - สถาปัตยกรรมระบบ  
**ผู้อ่านเป้าหมาย:** วิศวกร, หัวหน้าทีมเทคนิค, ผู้จัดการโครงการ

---

## บทคัดย่อ (Executive Summary)

รายงานฉบับนี้กล่าวถึงสถาปัตยกรรมทางเทคนิค, รายละเอียดการพัฒนา และการออกแบบระบบของ PROJECT-J ระบบนี้เป็นแอปพลิเคชันเว็บที่ขับเคลื่อนด้วย AI เพื่อสนับสนุนการเรียนรู้การออกเสียงระหว่างชาวไทยและชาวญี่ปุ่น โดยผสมผสานการรู้จำเสียงพูดด้วย OpenAI Whisper การวิเคราะห์การออกเสียงด้วย GPT-4o และกลไกการให้คำติชมแบบเรียลไทม์

**คำสำคัญ:** การเรียนรู้การออกเสียง, AI, Whisper, GPT-4o, TypeScript, React, Elysia

---

## สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [รายละเอียดเทคโนโลยีที่ใช้](#2-รายละเอียดเทคโนโลยีที่ใช้)
3. [สถาปัตยกรรมระบบ](#3-สถาปัตยกรรมระบบ)
4. [รายการฟังก์ชันและรายละเอียดการพัฒนา](#4-รายการฟังก์ชันและรายละเอียดการพัฒนา)
5. [กระแสข้อมูล](#5-กระแสข้อมูล)
6. [อัลกอริทึมหลัก](#6-อัลกอริทึมหลัก)
7. [รายละเอียดข้อกำหนด API](#7-รายละเอียดข้อกำหนด-api)
8. [ข้อควรระวังในการพัฒนา](#8-ข้อควรระวังในการพัฒนา)

---

## 1. ภาพรวมระบบ

### 1.1 วัตถุประสงค์ของระบบ

PROJECT-J สนับสนุนสถานการณ์การเรียนรู้ดังนี้:

| โหมดการเรียนรู้ | ผู้ใช้เป้าหมาย | เนื้อหาการเรียนรู้ |
|---------------|--------------|------------------|
| `th-ja` | คนไทย | การฝึกออกเสียงภาษาญี่ปุ่น |
| `ja-th` | ชาวญี่ปุ่น | การฝึกออกเสียงภาษาไทย |

### 1.2 แผนภาพสถาปัตยกรรมระบบ

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ชั้นของลูกค้า                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  ฟังก์ชันการบันทึกเสียง  │  │  การแสดงผล UI  │  │  การเล่นเสียง TTS  │              │
│  │  MediaRecorder│  │  React/Vite  │  │  Web Speech  │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
└─────────┼─────────────────┼─────────────────┼──────────────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │ HTTPS/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ชั้นเกตเวย์ API                           │
│                         Elysia.js (Bun)                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  มิดเดิลแวร์: CORS, Swagger, การจัดการข้อผิดพลาด             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ชั้นตรรกะธุรกิจ                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ การประเมินการออกเสียง  │  │ การถอดเสียงเป็นข้อความ  │  │ การค้นหาคำศัพท์  │              │
│  │  /assess     │  │ /transcribe  │  │  /lookup     │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
└─────────┼─────────────────┼─────────────────┼──────────────────────┘
          └─────────────────┼─────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ชั้นบริการ AI                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    OpenAI API                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │   │
│  │  │  Whisper-1  │  │   GPT-4o    │  │  Chat API   │         │   │
│  │  │  การรู้จำเสียง  │  │ การวิเคราะห์การออกเสียง  │  │ การค้นหาคำศัพท์  │         │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘         │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. รายละเอียดเทคโนโลยีที่ใช้

### 2.1 เทคโนโลยีฝั่งฟรอนต์เอนด์

#### 2.1.1 เฟรมเวอร์คและรันไทม์

| เทคโนโลยี | เวอร์ชัน | การใช้งาน | เหตุผลในการเลือก |
|----------|---------|---------|----------------|
| **React** | 19.2.0 | เฟรมเวอร์ค UI | Concurrent Features, การจัดการสถานะล่าสุด |
| **TypeScript** | 5.9.3 | ระบบประเภท | ความปลอดภัยของประเภทที่เข้มงวด, การบำรุงรักษาที่ดีขึ้น |
| **Vite** | 7.3.1 | เครื่องมือสร้าง | HMR ที่รวดเร็ว, การรวมที่เหมาะสม |

#### 2.1.2 การจัดรูปแบบและ UI

```typescript
// tailwind.config.ts เทียบเท่า
// TailwindCSS v4 ใช้โครงสร้าง CSS-first

import tailwindcss from '@tailwindcss/vite'

// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),  // v4: ไม่ต้องใช้ PostCSS รวมเป็น Vite plugin
  ],
})
```

| เทคโนโลยี | เวอร์ชัน | การใช้งาน |
|----------|---------|---------|
| **TailwindCSS** | 4.2.1 | ยูทิลิตี้ CSS |
| **Radix UI** | 1.4.3 | คอมโพเนนต์ UI แบบ headless |
| **Lucide React** | 0.575.0 | ไลบรารีไอคอน |
| **Motion** | 12.34.3 | ไลบรารีแอนิเมชัน |

#### 2.1.3 การจัดการสถานะและการดึงข้อมูล

ระบบนี้ใช้ฟีเจอร์ที่มีอยู่ใน React สำหรับการจัดการสถานะที่เบา:

```typescript
// การจัดการสถานะระดับโลก: ไม่ใช้ React Context
// เหตุผล: ขนาดแอปอยู่ในระดับเล็กถึงกลาง การส่งผ่าน prop เพียงพอ

// ลำดับชั้นของการจัดการสถานะ
- App.tsx: สถานะโหมด, คำที่เลือก, ผลลัพธ์การประเมิน
- แต่ละคอมโพเนนต์: สถานะ UI ท้องถิ่น
- ชั้น API: สถานะเซิร์ฟเวอร์ (ไม่ใช้ TanStack Query ใช้ fetch แบบง่าย)
```

### 2.2 เทคโนโลยีฝั่งแบ็กเอนด์

#### 2.2.1 รันไทม์และเฟรมเวอร์ค

| เทคโนโลยี | เวอร์ชัน | การใช้งาน | เหตุผลในการเลือก |
|----------|---------|---------|----------------|
| **Bun** | 1.0+ | รันไทม์ JavaScript | การเริ่มต้นที่รวดเร็ว, การสนับสนุน TypeScript ในตัว |
| **Elysia** | 1.4.25 | เฟรมเวอร์คเว็บ | การกำหนดเส้นทางที่ปลอดภัยตามประเภท, ประสิทธิภาพสูง |
| **TypeScript** | 5.0+ | ระบบประเภท | ความปลอดภัยของประเภทจากต้นจนจบ |

#### 2.2.2 การเชื่อมต่อบริการภายนอก

```typescript
// การเริ่มต้นไคลเอนต์ OpenAI
import OpenAI from 'openai'

function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')
  return new OpenAI({ apiKey: key })
}
```

| บริการ | โมเดล | การใช้งาน | ค่าใช้จ่ายโดยประมาณ |
|--------|------|---------|------------------|
| **Whisper** | whisper-1 | การรู้จำเสียง | $0.006/นาที |
| **GPT-4o** | gpt-4o | การวิเคราะห์การออกเสียง, การค้นหาคำศัพท์ | $0.005/1K tokens |

### 2.3 เครื่องมือและเวิร์กโฟลว์การพัฒนา

```json
// package.json - โครงสร้างเวิร์กสเปซรูท
{
  "workspaces": ["frontend", "backend"],
  "scripts": {
    "dev": "concurrently --names 'frontend,backend' \"bun run dev:frontend\" \"bun run dev:backend\"",
    "dev:frontend": "cd frontend && bun run dev",
    "dev:backend": "cd backend && bun run dev"
  }
}
```

---

## 3. สถาปัตยกรรมระบบ

### 3.1 โครงสร้างไดเรกทอรีโดยละเอียด

```
PROJECT-J/
├── frontend/
│   ├── src/
│   │   ├── components/           # ชั้นการนำเสนอ
│   │   │   ├── smoothui/        # คอมโพเนนต์ UI ที่ใช้ซ้ำได้
│   │   │   │   ├── siri-orb/    # การแสดงภาพเสียง
│   │   │   │   └── ai-input/    # อินเทอร์เฟซการป้อนข้อมูล AI
│   │   │   ├── LanguageSelectScreen.tsx   # หน้าจอเลือกภาษา
│   │   │   ├── PresetScreen.tsx           # การเลือกพรีเซ็ตคำศัพท์
│   │   │   ├── WordCard.tsx               # การ์ดคำศัพท์
│   │   │   ├── PronunciationRecorder.tsx  # การบันทึกการออกเสียง
│   │   │   ├── AccuracyFeedback.tsx       # คำติชมความแม่นยำ
│   │   │   ├── FreeSpeak.tsx              # การพูดอิสระ
│   │   │   ├── SentenceBreakdown.tsx      # การแยกประโยค
│   │   │   └── BottomNav.tsx              # การนำทาง
│   │   │
│   │   ├── hooks/               # ชั้นฮุกที่กำหนดเอง
│   │   │   ├── useAudioRecorder.ts   # การจัดการสถานะการบันทึก
│   │   │   └── useTTS.ts             # การควบคุมการอ่านออกเสียง
│   │   │
│   │   ├── services/            # ชั้นการสื่อสาร API
│   │   │   └── api.ts           # ไคลเอนต์ API แบ็กเอนด์
│   │   │
│   │   ├── utils/               # ชั้นยูทิลิตี้
│   │   │   ├── i18n.ts          # การแปลภาษา
│   │   │   └── phonetics.ts     # การประมวลผลเสียง
│   │   │
│   │   ├── data/                # ชั้นข้อมูล
│   │   │   ├── ja-th.json       # ฐานข้อมูลคำศัพท์ ญี่ปุ่น→ไทย
│   │   │   └── th-ja.json       # ฐานข้อมูลคำศัพท์ ไทย→ญี่ปุ่น
│   │   │
│   │   ├── types/               # ชั้นการกำหนดประเภท
│   │   │   └── index.ts         # การกำหนดประเภททั้งหมด
│   │   │
│   │   ├── App.tsx              # คอมโพเนนต์ราก
│   │   └── main.tsx             # จุดเริ่มต้น
│   │
│   └── vite.config.ts           # การตั้งค่าการสร้าง
│
├── backend/
│   └── src/
│       ├── routes/
│       │   └── pronunciation.ts # การกำหนดเส้นทาง API
│       └── index.ts             # การเริ่มต้นเซิร์ฟเวอร์
│
└── package.json                 # การตั้งค่าเวิร์กสเปซ
```

### 3.2 แผนภาพความสัมพันธ์ของโมดูล

```
┌─────────────────────────────────────────────────────────────────┐
│                        frontend/src                             │
│                                                                 │
│   ┌─────────────┐                                               │
│   │   main.tsx  │                                               │
│   └──────┬──────┘                                               │
│          │                                                      │
│          ▼                                                      │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │   App.tsx   │◄────│   hooks/    │     │   data/     │      │
│   └──────┬──────┘     │             │     │             │      │
│          │            │ useAudio    │     │ ja-th.json  │      │
│          ▼            │ Recorder    │     │ th-ja.json  │      │
│   ┌─────────────┐     │ useTTS      │     └─────────────┘      │
│   │ components/ │     └─────────────┘                          │
│   │             │            │                                  │
│   │ WordCard    │◄───────────┘                                  │
│   │ Pronunciation│                                               │
│   │ Recorder    │◄────┐                                         │
│   │ FreeSpeak   │     │                                         │
│   └──────┬──────┘     │                                         │
│          │            │                                         │
│          ▼            ▼                                         │
│   ┌─────────────────────────────┐                              │
│   │      services/api.ts        │                              │
│   │  ┌───────────────────────┐  │                              │
│   │  │ assessPronunciation() │  │                              │
│   │  │ transcribeAudio()     │  │                              │
│   │  │ lookupWord()          │  │                              │
│   │  │ tokenizeSentence()    │  │                              │
│   │  └───────────────────────┘  │                              │
│   └──────────────┬──────────────┘                              │
│                  │                                              │
└──────────────────┼──────────────────────────────────────────────┘
                   │ HTTP/REST
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        backend/src                              │
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐    │
│   │                    index.ts                           │    │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐   │    │
│   │  │  CORS   │  │ Swagger │  │ pronunciationRoutes │   │    │
│   │  └─────────┘  └─────────┘  └──────────┬──────────┘   │    │
│   └────────────────────────────────────────┼──────────────┘    │
│                                            │                    │
│                                            ▼                    │
│   ┌───────────────────────────────────────────────────────┐    │
│   │              routes/pronunciation.ts                  │    │
│   │                                                       │    │
│   │  POST /api/assess      ──► การประเมินการออกเสียง       │    │
│   │  POST /api/transcribe  ──► การถอดเสียงเป็นข้อความ      │    │
│   │  POST /api/lookup      ──► การค้นหาคำศัพท์              │    │
│   │  POST /api/tokenize    ──► การแยกประโยค                │    │
│   │  GET  /api/health      ──► การตรวจสอบสถานะ              │    │
│   │                                                       │    │
│   └──────────────────────┬────────────────────────────────┘    │
│                          │                                      │
│                          ▼                                      │
│   ┌───────────────────────────────────────────────────────┐    │
│   │                    OpenAI API                         │    │
│   │         Whisper-1  │  GPT-4o  │  Chat API             │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. รายการฟังก์ชันและรายละเอียดการพัฒนา

### 4.1 รายการฟังก์ชันฝั่งฟรอนต์เอนด์

#### 4.1.1 ฮุกที่กำหนดเอง

**① useAudioRecorder - การจัดการสถานะการบันทึก**

```typescript
// frontend/src/hooks/useAudioRecorder.ts

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
 * ตัวห่อ MediaRecorder API ของเบราว์เซอร์
 * จัดการวงจรชีวิตของสถานะการบันทึก
 */
export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [durationMs, setDurationMs] = useState(0)

  // useRef: เก็บค่าระหว่างการเรนเดอร์
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const resolveRef = useRef<((blob: Blob | null) => void) | null>(null)

  /**
   * เริ่มการบันทึก
   * 1. ขออนุญาตใช้ไมโครโฟน
   * 2. เริ่มต้น MediaRecorder
   * 3. ตั้งค่าเหตุการณ์การรวบรวมข้อมูล
   */
  const start = useCallback(async () => {
    setError(null)
    setAudioBlob(null)
    chunksRef.current = []

    try {
      // รับสตรีมไมโครโฟน
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // เลือก MIME type ที่รองรับ
      // ลำดับความสำคัญ: opus > ogg > webm
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      // เหตุการณ์การรวบรวมข้อมูล
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      // การประมวลผลเมื่อหยุดการบันทึก
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        setDurationMs(Date.now() - startTimeRef.current)
        setState('idle')
        // ปล่อยสตรีม
        stream.getTracks().forEach((t) => t.stop())
        resolveRef.current?.(blob)
        resolveRef.current = null
      }

      // การจัดการข้อผิดพลาด
      recorder.onerror = (e) => {
        const msg = (e as unknown as { error?: { message?: string } }).error?.message ?? 'Recording error'
        setError(msg)
        setState('idle')
        resolveRef.current?.(null)
        resolveRef.current = null
      }

      // รวบรวมข้อมูลทุก 100ms
      recorder.start(100)
      startTimeRef.current = Date.now()
      setState('recording')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied'
      setError(msg)
      setState('idle')
    }
  }, [])

  /**
   * หยุดการบันทึกและคืนค่า Blob
   * ประมวลผลแบบอะซิงโครนัสด้วย Promise
   */
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
```

**② useTTS - การควบคุมการอ่านออกเสียงข้อความ**

```typescript
// frontend/src/hooks/useTTS.ts

import { useState, useCallback, useEffect } from 'react'

interface UseTTSReturn {
  speak: (text: string, lang: 'ja-JP' | 'th-TH') => void
  speaking: boolean
  supported: boolean
}

/**
 * ตัวห่อ Web Speech API
 * ใช้การสังเคราะห์เสียงแบบเนทีฟของเบราว์เซอร์
 */
export function useTTS(): UseTTSReturn {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    // ตรวจสอบการรองรับของเบราว์เซอร์
    setSupported('speechSynthesis' in window)
  }, [])

  const speak = useCallback((text: string, lang: 'ja-JP' | 'th-TH') => {
    if (!window.speechSynthesis) return

    // ยกเลิกการอ่านที่มีอยู่
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.9  // ช้าลงเล็กน้อย
    utterance.pitch = 1.0

    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [])

  return { speak, speaking, supported }
}
```

#### 4.1.2 คอมโพเนนต์หลัก

**① PronunciationRecorder - คอมโพเนนต์การบันทึกการออกเสียง**

```typescript
// frontend/src/components/PronunciationRecorder.tsx

import { Mic, MicOff, Loader2 } from 'lucide-react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { assessPronunciation } from '../services/api'
import type { AssessResponse, LearnerMode, VocabEntry } from '../types'

interface Props {
  entry: VocabEntry
  mode: LearnerMode
  onResult: (result: AssessResponse) => void
  onError: (msg: string) => void
}

/**
 * อินเทอร์เฟซการบันทึกการออกเสียง
 * ฟลักซ์: ปุ่มบันทึก → ส่ง API → เรียกกลับผลลัพธ์
 */
export function PronunciationRecorder({ entry, mode, onResult, onError }: Props) {
  const { state, start, stop } = useAudioRecorder()
  const isJapanese = mode === 'th-ja'
  const lang: 'ja' | 'th' = isJapanese ? 'ja' : 'th'

  // ตั้งค่าสีธีม
  const accentColor = isJapanese ? 'red' : 'amber'
  const btnActiveClass = isJapanese
    ? 'bg-red-500 hover:bg-red-600'
    : 'bg-amber-500 hover:bg-amber-600'

  /**
   * ตัวจัดการการควบคุมการบันทึก
   * idle → recording → ส่ง API → result
   */
  async function handleRecord() {
    if (state === 'idle') {
      // เริ่มการบันทึก
      await start()
    } else if (state === 'recording') {
      // หยุดการบันทึก
      const blob = await stop()
      if (!blob) {
        onError('No audio captured. Please try again.')
        return
      }

      try {
        // ส่งไปยัง API
        const result = await assessPronunciation(
          blob,
          entry.word,
          entry.romanization,
          lang,
        )
        onResult(result)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Assessment failed'
        onError(msg)
      }
    }
  }

  const isRecording = state === 'recording'
  const isProcessing = state === 'processing'

  return (
    <div className="space-y-4">
      {/* ปุ่มบันทึก */}
      <div className="flex justify-center">
        <button
          onClick={handleRecord}
          disabled={isProcessing}
          className={`relative flex items-center justify-center w-24 h-24 rounded-full 
            font-bold text-white transition-all duration-300 shadow-2xl
            ${isProcessing
              ? 'bg-gray-700 cursor-not-allowed'
              : isRecording
                ? `${btnActiveClass} ring-4 recording-pulse`
                : `${btnActiveClass} hover:scale-105`
            }`}
        >
          {isProcessing ? (
            <Loader2 size={36} className="animate-spin" />
          ) : isRecording ? (
            <MicOff size={36} />
          ) : (
            <Mic size={36} />
          )}

          {/* แสดงสถานะการบันทึก */}
          {isRecording && (
            <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-white animate-ping" />
          )}
        </button>
      </div>

      {/* ข้อความสถานะ */}
      <div className="text-center text-sm">
        {isRecording && (
          <span className={`text-${accentColor}-400 font-semibold animate-pulse`}>
            ● กำลังบันทึก...
          </span>
        )}
        {isProcessing && (
          <span className="text-blue-400 font-semibold">
            ⏳ กำลังวิเคราะห์เสียง...
          </span>
        )}
      </div>
    </div>
  )
}
```

### 4.2 รายการฟังก์ชันฝั่งแบ็กเอนด์

#### 4.2.1 อัลกอริทึมระยะทางเลเว่นชไตน์

```typescript
// backend/src/routes/pronunciation.ts

/**
 * การคำนวณระยะทางเลเว่นชไตน์ (ระยะทางการแก้ไข)
 * คืนค่าจำนวนการดำเนินการแก้ไขขั้นต่ำระหว่างสตริงสองสตริง
 * ดำเนินการ: แทรก, ลบ, แทนที่
 * 
 * ความซับซ้อนด้านเวลา: O(m × n)
 * ความซับซ้อนด้านพื้นที่: O(m × n) → หลังการเพิ่มประสิทธิภาพ O(min(m, n))
 */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  
  // การเพิ่มประสิทธิภาพพื้นที่ด้วยอาร์เรย์ 1 มิติ
  const dp: number[] = Array.from({ length: (m + 1) * (n + 1) }, () => 0)
  const idx = (i: number, j: number) => i * (n + 1) + j

  // กรณีฐาน: สตริงใดสตริงหนึ่งว่างเปล่า
  for (let i = 0; i <= m; i++) dp[idx(i, 0)] = i
  for (let j = 0; j <= n; j++) dp[idx(0, j)] = j

  // กรอกตารางด้วยการคำนวณแบบไดนามิก
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        // ตัวอักษรตรงกัน → ไม่มีค่าใช้จ่าย
        dp[idx(i, j)] = dp[idx(i - 1, j - 1)]!
      } else {
        // เลือกค่าใช้จ่ายต่ำสุด
        // 1. การลบ (dp[i-1][j])
        // 2. การแทรก (dp[i][j-1])
        // 3. การแทนที่ (dp[i-1][j-1])
        dp[idx(i, j)] = 1 + Math.min(
          dp[idx(i - 1, j)]!,      // การลบ
          dp[idx(i, j - 1)]!,      // การแทรก
          dp[idx(i - 1, j - 1)]!,  // การแทนที่
        )
      }
    }
  }
  
  return dp[idx(m, n)]!
}
```

#### 4.2.2 ฟังก์ชันคำนวณคะแนนความแม่นยำ

```typescript
/**
 * การคำนวณคะแนนความแม่นยำ (0-100)
 * คำนวณเปอร์เซ็นต์จากระยะทางเลเว่นชไตน์
 */
function calcAccuracy(expected: string, transcribed: string): number {
  // การประมวลผลก่อน: แปลงเป็นพิมพ์เล็ก, ลบช่องว่าง
  const a = expected.toLowerCase().replace(/\s+/g, '')
  const b = transcribed.toLowerCase().replace(/\s+/g, '')
  
  if (!a.length) return 0
  
  const dist = levenshtein(a, b)
  
  // ความแม่นยำ = (ความยาวดั้งเดิม - ระยะทางการแก้ไข) / ความยาวดั้งเดิม × 100
  return Math.max(0, Math.round(((a.length - dist) / a.length) * 100))
}
```

#### 4.2.3 การวิเคราะห์การออกเสียงด้วย GPT-4o

```typescript
/**
 * การวิเคราะห์การออกเสียงโดยละเอียดด้วย GPT-4o
 * สร้างคะแนนและคำแนะนำการปรับปรุงตามความคล้ายคลึงทางเสียง
 */
async function analyzeWithGPT(
  openai: OpenAI,
  expectedWord: string,
  expectedRoman: string,
  spokenText: string,
  wordTimings: WordTiming[],
  lang: 'ja' | 'th',
): Promise<AIAnalysis> {
  // lang = 'ja' → คนไทยเรียนภาษาญี่ปุ่น → คำแนะนำเป็นภาษาไทย
  // lang = 'th' → คนญี่ปุ่นเรียนภาษาไทย → คำแนะนำเป็นภาษาญี่ปุ่น
  const targetLang   = lang === 'ja' ? 'Japanese' : 'Thai'
  const feedbackLang = lang === 'ja' ? 'Thai'     : 'Japanese'

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a strict ${targetLang} pronunciation coach.
The learner's native language is ${feedbackLang}.

Scoring criteria:
- 90-100: Near-perfect pronunciation
- 70-89:  Minor issues (tone, length, aspiration)
- 50-69:  Noticeable errors but intelligible
- 30-49:  Significant errors, hard to understand
- 0-29:   Very wrong or completely different word

Return JSON:
{
  "score": <integer 0-100>,
  "feedback": "<coaching tip in ${feedbackLang}>",
  "mispronounced": ["<syllable>", ...]
}`,
      },
      {
        role: 'user',
        content: `Target: "${expectedWord}" (${expectedRoman})
Spoken: "${spokenText}"
Timings: ${JSON.stringify(wordTimings)}`,
      },
    ],
    response_format: { type: 'json_object' },
  })

  const raw = response.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as Partial<AIAnalysis>
  
  return {
    score: typeof parsed.score === 'number' 
      ? Math.max(0, Math.min(100, parsed.score)) 
      : 0,
    feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
    mispronounced: Array.isArray(parsed.mispronounced) ? parsed.mispronounced : [],
  }
}
```

---

## 5. กระแสข้อมูล

### 5.1 ฟลักซ์การประเมินการออกเสียง

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ลำดับการประเมินการออกเสียง                       │
└─────────────────────────────────────────────────────────────────────────┘

  ผู้ใช้                ฟรอนต์เอนด์            แบ็กเอนด์            OpenAI
    │                       │                       │                    │
    │ 1. คลิกปุ่มบันทึก    │                       │                    │
    │──────────────────────►│                       │                    │
    │                       │                       │                    │
    │                       │ 2. เริ่ม MediaRecorder │                    │
    │                       │──────────────────────►│                    │
    │                       │                       │                    │
    │ 3. พูด                │                       │                    │
    │──────────────────────►│                       │                    │
    │                       │                       │                    │
    │ 4. คลิกปุ่มหยุด      │                       │                    │
    │──────────────────────►│                       │                    │
    │                       │                       │                    │
    │                       │ 5. สร้าง Blob         │                    │
    │                       │                       │                    │
    │                       │ 6. สร้าง FormData     │                    │
    │                       │   - audio: Blob       │                    │
    │                       │   - expectedWord      │                    │
    │                       │   - lang              │                    │
    │                       │                       │                    │
    │                       │ 7. POST /api/assess   │                    │
    │                       │──────────────────────►│                    │
    │                       │                       │                    │
    │                       │                       │ 8. Whisper-1       │
    │                       │                       │    การรู้จำเสียง    │
    │                       │                       │───────────────────►│
    │                       │                       │                    │
    │                       │                       │ 9. ผลการรู้จำ      │
    │                       │                       │◄───────────────────│
    │                       │                       │                    │
    │                       │                       │ 10. เลเว่นชไตน์     │
    │                       │                       │     คำนวณระยะทาง    │
    │                       │                       │                    │
    │                       │                       │ 11. การวิเคราะห์ GPT-4o │
    │                       │                       │───────────────────►│
    │                       │                       │                    │
    │                       │                       │ 12. ผลการวิเคราะห์ │
    │                       │                       │◄───────────────────│
    │                       │                       │                    │
    │                       │ 13. AssessResponse    │                    │
    │                       │◄──────────────────────│                    │
    │                       │   - accuracy          │                    │
    │                       │   - aiScore           │                    │
    │                       │   - aiFeedback        │                    │
    │                       │   - charDiff          │                    │
    │                       │                       │                    │
    │ 14. แสดงผลลัพธ์       │                       │                    │
    │◄──────────────────────│                       │                    │
    │                       │                       │                    │
```

### 5.2 ฟลักซ์การค้นหาคำศัพท์

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ลำดับการค้นหาคำศัพท์                            │
└─────────────────────────────────────────────────────────────────────────┘

  ผู้ใช้                ฟรอนต์เอนด์            แบ็กเอนด์            GPT-4o
    │                       │                       │                    │
    │ 1. ป้อนคำศัพท์        │                       │                    │
    │──────────────────────►│                       │                    │
    │                       │                       │                    │
    │                       │ 2. POST /api/lookup   │                    │
    │                       │   { word, lang }      │                    │
    │                       │──────────────────────►│                    │
    │                       │                       │                    │
    │                       │                       │ 3. สร้างพรอมปต์    │
    │                       │                       │   - การแบ่งพยางค์  │
    │                       │                       │   - ข้อมูลสำเนียง  │
    │                       │                       │   - การแปล         │
    │                       │                       │                    │
    │                       │                       │ 4. เรียก GPT-4o   │
    │                       │                       │───────────────────►│
    │                       │                       │                    │
    │                       │                       │ 5. JSON ตอบกลับ   │
    │                       │                       │◄───────────────────│
    │                       │                       │   { word,          │
    │                       │                       │     syllables[],   │
    │                       │                       │     meaning... }   │
    │                       │                       │                    │
    │                       │ 6. คืนค่าในรูปแบบ VocabEntry │              │
    │                       │◄──────────────────────│                    │
    │                       │                       │                    │
    │ 7. แสดง WordCard      │                       │                    │
    │◄──────────────────────│                       │                    │
    │                       │                       │                    │
```

---

## 6. อัลกอริทึมหลัก

### 6.1 อัลกอริทึมความแตกต่างระดับตัวอักษร

```typescript
/**
 * การคำนวณความแตกต่างระดับตัวอักษร
 * เปรียบเทียบสตริงที่คาดหวังกับผลลัพธ์การรู้จำและสร้างความแตกต่างสำหรับการแสดงผล UI
 * 
 * อัลกอริทึม: การเปรียบเทียบตามตำแหน่งแบบง่าย
 * การใช้งาน: การแสดงถูก/ผิดแบบตัวอักษรต่อตัวอักษรใน UI
 */
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
      // มีตัวอักษรทั้งสอง → เปรียบเทียบ
      result.push({ 
        char: gc, 
        status: ec === gc ? 'correct' : 'wrong' 
      })
    } else if (ec && !gc) {
      // มีเฉพาะที่คาดหวัง → ขาดหาย
      result.push({ char: ec, status: 'missing' })
    } else if (!ec && gc) {
      // มีเฉพาะที่รู้จำ → เกิน
      result.push({ char: gc, status: 'extra' })
    }
  }
  
  return result
}

// ตัวอย่างการใช้งาน:
// charDiff("こんにちは", "こんにちわ") → 
// [
//   { char: "こ", status: "correct" },
//   { char: "ん", status: "correct" },
//   { char: "に", status: "correct" },
//   { char: "ち", status: "correct" },
//   { char: "わ", status: "wrong" }   // 「は」ถูกรู้จำผิดเป็น「わ」
// ]
```

### 6.2 ตรรกะการสร้างคำติชม

```typescript
/**
 * การสร้างข้อความคำติชมตามคะแนน
 * การตัดสินแบบง่ายตามกฎ
 */
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
      th: '💪 พยายามดีนะ! ลองฟังเสียงตัวอย่างอีกรอบ',
      ja: '💪 頑張っています！もう一度お手本の音声を聞いて練習してみましょう',
    }
  } else {
    return {
      th: '🔄 ลองใหม่นะ! กดปุ่ม 🔊 เพื่อฟังตัวอย่างก่อน',
      ja: '🔄 もう一度試してみましょう！🔊ボタンでお手本を聞いてから練習してください',
    }
  }
}
```

---

## 7. รายละเอียดข้อกำหนด API

### 7.1 รายการเอนด์พอยต์

| วิธี | เอนด์พอยต์ | คำอธิบาย | การตรวจสอบสิทธิ |
|-----|-----------|---------|--------------|
| GET | `/api/health` | การตรวจสอบสถานะ | ไม่ต้อง |
| POST | `/api/assess` | การประเมินการออกเสียง | API Key |
| POST | `/api/transcribe` | การถอดเสียงเป็นข้อความ | API Key |
| POST | `/api/lookup` | การค้นหาคำศัพท์ | API Key |
| POST | `/api/tokenize` | การแยกประโยค | API Key |

### 7.2 รายละเอียดคำขอ/คำตอบ

#### POST /api/assess

**คำขอ:**
```http
POST /api/assess HTTP/1.1
Content-Type: multipart/form-data

------WebKitFormBoundary
Content-Disposition: form-data; name="audio"; filename="recording.webm"
Content-Type: audio/webm

<binary data>
------WebKitFormBoundary
Content-Disposition: form-data; name="expectedWord"

こんにちは
------WebKitFormBoundary
Content-Disposition: form-data; name="expectedRoman"

konnichiwa
------WebKitFormBoundary
Content-Disposition: form-data; name="lang"

ja
------WebKitFormBoundary--
```

**คำตอบ:**
```json
{
  "ok": true,
  "transcribed": "こんにちは",
  "wordTimings": [
    {
      "word": "こんにちは",
      "start": 0.0,
      "end": 1.24
    }
  ],
  "accuracy": 100,
  "charDiff": [
    { "char": "こ", "status": "correct" },
    { "char": "ん", "status": "correct" },
    { "char": "に", "status": "correct" },
    { "char": "ち", "status": "correct" },
    { "char": "は", "status": "correct" }
  ],
  "feedback": {
    "th": "🎉 ยอดเยี่ยมมาก!",
    "ja": "🎉 素晴らしい！"
  },
  "aiScore": 95,
  "aiFeedback": "การออกเสียงใกล้เคียงเจ้าของภาษา",
  "mispronounced": []
}
```

### 7.3 การตอบกลับข้อผิดพลาด

```json
{
  "ok": false,
  "transcribed": "",
  "wordTimings": [],
  "accuracy": 0,
  "charDiff": [],
  "feedback": {
    "th": "เกิดข้อผิดพลาด: API Error",
    "ja": "エラーが発生しました: API Error"
  },
  "aiScore": 0,
  "aiFeedback": "",
  "mispronounced": [],
  "error": "API Error"
}
```

---

## 8. ข้อควรระวังในการพัฒนา

### 8.1 การจัดการ MIME Type

MediaRecorder ของ Chrome คืนค่า `video/webm` แม้กระทั่งการบันทึกเสียงเท่านั้น ซึ่ง Whisper สามารถประมวลผลได้โดยไม่มีปัญหา แต่ต้องตั้งค่านามสกุลไฟล์ให้ถูกต้อง:

```typescript
// services/api.ts
let ext = 'webm'
if (audio.type.includes('ogg')) ext = 'ogg'
else if (audio.type.includes('mp4') || audio.type.includes('m4a')) ext = 'mp4'
else if (audio.type.includes('wav')) ext = 'wav'

form.append('audio', audio, `recording.${ext}`)
```

### 8.2 การจัดการตัวแปรสภาพแวดล้อม

```bash
# สภาพแวดล้อมการพัฒนา
.env
├── OPENAI_API_KEY=sk-...
└── PORT=3001

# สภาพแวดล้อมการผลิตตั้งค่าเป็นตัวแปรสภาพแวดล้อม
export OPENAI_API_KEY=sk-...
export PORT=3001
```

### 8.3 ข้อควรพิจารณาด้านความปลอดภัย

1. **การป้องกัน API Key**: ใช้เฉพาะฝั่งแบ็กเอนด์ ไม่เปิดเผยต่อฟรอนต์เอนด์
2. **การตั้งค่า CORS**: เฉพาะออริจินที่ได้รับอนุญาตเท่านั้น
3. **การตรวจสอบอินพุต**: การตรวจสอบอัตโนมัติด้วยระบบประเภทของ Elysia
4. **การจำกัดอัตรา**: ควรพิจารณาสำหรับสภาพแวดล้อมการผลิต

### 8.4 การเพิ่มประสิทธิภาพ

| รายการ | มาตรการ |
|--------|---------|
| ขนาดไฟล์เสียง | ใช้รหัส WebM Opus |
| เวลาตอบสนอง API | พิจารณาการประมวลผล Whisper แบบขนาน |
| ฟรอนต์เอนด์ | พิจารณาใช้ React.memo |
| การสร้าง | การเพิ่มประสิทธิภาพด้วย Vite |

---

## ภาคผนวก

### ก. รายการการกำหนดประเภท

```typescript
// types/index.ts - การกำหนดประเภทหลัก

export interface VocabEntry {
  id: string
  category: string
  word: string
  reading: string
  romanization: string
  syllables: PitchSyllable[] | ThaiSyllable[]
  meaningTh: string
  meaningJa: string
  exampleSentence: string
  exampleTranslation: string
  ttsLang: 'ja-JP' | 'th-TH'
}

export interface AssessResponse {
  ok: boolean
  transcribed: string
  wordTimings: WordTiming[]
  accuracy: number
  charDiff: CharDiffToken[]
  feedback: { th: string; ja: string }
  aiScore: number
  aiFeedback: string
  mispronounced: string[]
  error?: string
}
```

### ข. เอกสารที่เกี่ยวข้อง

- เอกสารภาษาอังกฤษ: `DOCUMENTATION.md`
- เอกสารภาษาญี่ปุ่น: `DOCUMENTATION_JA.md`
- พื้นหลังทางวิชาการ: `ACADEMIC.md`

---

**ผู้จัดทำ:** ทีมเทคนิค  
**การตรวจสอบ:** รอดำเนินการ  
**การอนุมัติ:** รอดำเนินการ

---

*เนื้อหาในเอกสารนี้อาจมีการเปลี่ยนแปลง โปรดอ้างอิงจากรีโพสิทอรีเพื่อข้อมูลล่าสุด*
