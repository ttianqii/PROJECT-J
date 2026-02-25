# PROJECT-J Technical Documentation

> **AI-Powered Cross-Cultural Pronunciation Learning for Thai and Japanese Speakers**

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [System Architecture](#-system-architecture)
3. [Prerequisites](#-prerequisites)
4. [Installation & Setup](#-installation--setup)
5. [Development Workflow](#-development-workflow)
6. [Backend Documentation](#-backend-documentation)
7. [Frontend Documentation](#-frontend-documentation)
8. [API Reference](#-api-reference)
9. [Component Library](#-component-library)
10. [Data Structures](#-data-structures)
11. [Deployment](#-deployment)
12. [Troubleshooting](#-troubleshooting)

---

## 🌟 Project Overview

PROJECT-J is a full-stack web application that helps Thai and Japanese speakers learn each other's language pronunciation through AI-powered speech recognition and real-time feedback.

### Key Features

| Feature | Description |
|---------|-------------|
| **Pronunciation Assessment** | Record speech and get accuracy scores using OpenAI Whisper + GPT-4o |
| **Word Lookup** | Look up any word via GPT-4o and get phonetic breakdowns |
| **Sentence Tokenization** | Break sentences into glossed tokens with pitch/tone data |
| **Free-Speak Mode** | Practice speaking without target constraints |
| **Text-to-Speech** | Native pronunciation examples using browser TTS |
| **Bilingual UI** | Interface supports Thai, Japanese, and English |

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
├─────────────────────────────────────────────────────────────┤
│  React 19 + TypeScript 5.9                                  │
│  Vite 7 (Build Tool)                                        │
│  TailwindCSS 4 (Styling)                                    │
│  Radix UI + Lucide React (Components & Icons)               │
│  Motion (Animations)                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP / REST
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend                              │
├─────────────────────────────────────────────────────────────┤
│  Elysia 1.4 (Bun-based web framework)                       │
│  OpenAI API (Whisper + GPT-4o)                              │
│  TypeScript 5                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ System Architecture

### Directory Structure

```
PROJECT-J/
├── 📁 frontend/                    # React frontend application
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── smoothui/         # Custom UI components
│   │   │   ├── LanguageSelectScreen.tsx
│   │   │   ├── PresetScreen.tsx
│   │   │   ├── WordCard.tsx
│   │   │   ├── PronunciationRecorder.tsx
│   │   │   ├── AccuracyFeedback.tsx
│   │   │   ├── FreeSpeak.tsx
│   │   │   ├── SentenceBreakdown.tsx
│   │   │   └── ...
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useAudioRecorder.ts
│   │   │   └── useTTS.ts
│   │   ├── services/             # API services
│   │   │   └── api.ts
│   │   ├── utils/                # Utility functions
│   │   │   ├── i18n.ts          # Internationalization
│   │   │   └── phonetics.ts     # Phonetic helpers
│   │   ├── data/                 # Static data
│   │   │   ├── ja-th.json       # Japanese→Thai vocabulary
│   │   │   └── th-ja.json       # Thai→Japanese vocabulary
│   │   ├── types/                # TypeScript types
│   │   │   └── index.ts
│   │   ├── App.tsx              # Main application component
│   │   └── main.tsx             # Entry point
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── 📁 backend/                     # Elysia backend API
│   ├── src/
│   │   ├── routes/
│   │   │   └── pronunciation.ts  # API routes
│   │   └── index.ts              # Server entry point
│   └── package.json
│
├── 📄 package.json                 # Root workspace config
├── 📄 .env                         # Environment variables
├── 📄 .env.example                 # Environment template
└── 📄 DOCUMENTATION.md             # This file
```

---

## 📦 Prerequisites

Before starting, ensure you have the following installed:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Bun** | 1.0+ | JavaScript runtime & package manager |
| **Node.js** | 18+ | Compatibility (Bun fallback) |
| **OpenAI API Key** | - | Required for Whisper & GPT-4o |
| **Modern Browser** | Chrome/Firefox/Safari | MediaRecorder API support |

### Install Bun

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (via WSL recommended)
curl -fsSL https://bun.sh/install | bash
```

### Verify Installation

```bash
bun --version    # Should output 1.0 or higher
```

---

## 🚀 Installation & Setup

### 1. Clone and Navigate

```bash
cd PROJECT-J
```

### 2. Install Dependencies

```bash
# Install all dependencies (frontend + backend)
bun run install:all
```

This installs dependencies for both workspaces using Bun workspaces.

### 3. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your OpenAI API key
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PORT=3001
```

> ⚠️ **Important**: Never commit `.env` to version control. It's already in `.gitignore`.

### 4. Verify Setup

```bash
# Check backend can start
bun run dev:backend

# In another terminal, check frontend
bun run dev:frontend
```

---

## 💻 Development Workflow

### Running Both Services

```bash
# Start frontend + backend concurrently
bun run dev
```

This command runs:
- Frontend at `http://localhost:5173`
- Backend at `http://localhost:3001`

### Running Services Individually

```bash
# Frontend only
cd frontend && bun run dev

# Backend only
cd backend && bun run dev
```

### Building for Production

```bash
# Build frontend (outputs to frontend/dist)
bun run build
```

### Development URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | `http://localhost:5173` | React dev server |
| Backend API | `http://localhost:3001/api` | REST API endpoints |
| API Docs | `http://localhost:3001/docs` | Swagger UI documentation |

---

## 🔧 Backend Documentation

### Architecture

The backend is built with **Elysia**, a Bun-native web framework optimized for performance and type safety.

### Entry Point (`backend/src/index.ts`)

```typescript
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'

const app = new Elysia()
  .use(cors({...}))           // Cross-origin requests
  .use(swagger({...}))        // Auto-generated API docs
  .get('/api/health', ...)    // Health check
  .use(pronunciationRoutes)   // API routes
  .listen(PORT)
```

### Core Modules

#### 1. Levenshtein Distance Algorithm

Used for calculating accuracy between expected and transcribed text:

```typescript
function levenshtein(a: string, b: string): number
// Returns: Edit distance between two strings
// Used in: calcAccuracy()
```

#### 2. Character-level Diff

Visualizes pronunciation errors at character level:

```typescript
interface CharDiff {
  char: string
  status: 'correct' | 'wrong' | 'missing' | 'extra'
}
```

#### 3. GPT-4o Analysis

Provides intelligent pronunciation coaching:

```typescript
interface AIAnalysis {
  score: number        // 0-100 phonetic score
  feedback: string     // Coaching tip in learner's language
  mispronounced: string[]  // Problem syllables
}
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ | - | OpenAI API key |
| `PORT` | ❌ | 3001 | Server port |

---

## 🎨 Frontend Documentation

### Project Structure

```
src/
├── components/          # UI Components
│   ├── smoothui/       # Reusable custom UI
│   ├── LanguageSelectScreen.tsx   # Initial language selection
│   ├── PresetScreen.tsx           # Vocabulary preset selection
│   ├── WordCard.tsx               # Word detail display
│   ├── PronunciationRecorder.tsx  # Recording interface
│   ├── AccuracyFeedback.tsx       # Results display
│   ├── FreeSpeak.tsx              # Free practice mode
│   ├── SentenceBreakdown.tsx      # Sentence analysis
│   └── BottomNav.tsx              # Navigation
│
├── hooks/              # Custom React hooks
│   ├── useAudioRecorder.ts   # MediaRecorder wrapper
│   └── useTTS.ts             # Text-to-speech
│
├── services/           # API integration
│   └── api.ts
│
├── utils/              # Helper functions
│   ├── i18n.ts        # Translations
│   └── phonetics.ts   # Phonetic utilities
│
├── data/               # Static JSON data
│   ├── ja-th.json     # Japanese vocabulary
│   └── th-ja.json     # Thai vocabulary
│
└── types/              # TypeScript definitions
    └── index.ts
```

### Key Components

#### LanguageSelectScreen

Renders the initial language selection interface.

**Props:**
```typescript
interface Props {
  mode: LearnerMode           // 'th-ja' | 'ja-th'
  appLang: AppLang            // 'th' | 'ja' | 'en'
  onSelect: (mode: LearnerMode) => void
  onContinue: () => void
  onAppLangChange: (lang: AppLang) => void
}
```

#### PronunciationRecorder

Main recording interface for pronunciation practice.

**Usage:**
```tsx
<PronunciationRecorder
  entry={vocabEntry}
  mode="th-ja"
  onResult={(result) => console.log(result.aiScore)}
  onError={(msg) => console.error(msg)}
/>
```

#### WordCard

Displays vocabulary with phonetic breakdown.

**Features:**
- Native script display
- Romanization
- Pitch accent visualization (Japanese)
- Tone indicators (Thai)
- Audio playback via TTS

### Custom Hooks

#### useAudioRecorder

Manages MediaRecorder lifecycle for audio capture.

```typescript
const { state, start, stop, error, durationMs } = useAudioRecorder()

// State: 'idle' | 'recording' | 'processing'
// start(): Promise<void> - Begin recording
// stop(): Promise<Blob | null> - End recording, get audio blob
```

#### useTTS

Browser Text-to-Speech wrapper.

```typescript
const { speak, speaking, supported } = useTTS()

speak('こんにちは', 'ja-JP')  // Speak Japanese
speak('สวัสดี', 'th-TH')      // Speak Thai
```

---

## 📡 API Reference

### Base URL

```
Development: http://localhost:3001/api
Production:  https://your-domain.com/api
```

### Endpoints

#### 1. Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "ok": true,
  "timestamp": "2026-02-25T07:51:06.459Z"
}
```

#### 2. Pronunciation Assessment

```http
POST /api/assess
Content-Type: multipart/form-data
```

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `audio` | File | Audio blob (webm, ogg, mp4, wav) |
| `expectedWord` | string | Target word in native script |
| `expectedRoman` | string | Romanization guide |
| `lang` | 'ja' \| 'th' | Target language |

**Request Example:**
```javascript
const form = new FormData()
form.append('audio', audioBlob, 'recording.webm')
form.append('expectedWord', 'こんにちは')
form.append('expectedRoman', 'konnichiwa')
form.append('lang', 'ja')

fetch('/api/assess', {
  method: 'POST',
  body: form
})
```

**Response:**
```json
{
  "ok": true,
  "transcribed": "こんにちは",
  "wordTimings": [
    { "word": "こんにちは", "start": 0.0, "end": 1.2 }
  ],
  "accuracy": 95,
  "charDiff": [
    { "char": "こ", "status": "correct" },
    { "char": "ん", "status": "correct" }
  ],
  "feedback": {
    "th": "🎉 ยอดเยี่ยมมาก!",
    "ja": "🎉 素晴らしい！"
  },
  "aiScore": 92,
  "aiFeedback": "การออกเสียงใกล้เคียงสำเนียงเจ้าของภาษา",
  "mispronounced": []
}
```

#### 3. Transcribe (Free-Speak Mode)

```http
POST /api/transcribe
Content-Type: multipart/form-data
```

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `audio` | File | Audio blob |
| `lang` | 'ja' \| 'th' | Target language |

**Response:**
```json
{
  "ok": true,
  "transcribed": "おはようございます",
  "wordTimings": [...]
}
```

#### 4. Word Lookup

```http
POST /api/lookup
Content-Type: application/json
```

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `word` | string | Word to look up |
| `lang` | 'ja' \| 'th' | Source language |

**Request:**
```json
{
  "word": "ありがとう",
  "lang": "ja"
}
```

**Response:**
```json
{
  "ok": true,
  "entry": {
    "id": "ai-1234567890",
    "category": "AI Lookup",
    "word": "ありがとう",
    "reading": "ありがとう",
    "romanization": "arigatou",
    "syllables": [...],
    "meaningTh": "ขอบคุณ",
    "meaningJa": "感謝している",
    "exampleSentence": "ありがとうございます",
    "exampleTranslation": "ขอบคุณค่ะ/ครับ",
    "ttsLang": "ja-JP"
  }
}
```

#### 5. Sentence Tokenization

```http
POST /api/tokenize
Content-Type: application/json
```

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `sentence` | string | Sentence to tokenize |
| `lang` | 'ja' \| 'th' | Source language |

**Request:**
```json
{
  "sentence": "私は学生です",
  "lang": "ja"
}
```

**Response:**
```json
{
  "ok": true,
  "tokens": [
    {
      "word": "私",
      "reading": "わたし",
      "romanization": "watashi",
      "isParticle": false,
      "meaningTh": "ฉัน/ผม",
      "meaningJa": "自分自身",
      "syllables": [...]
    }
  ],
  "translationTh": "ฉันเป็นนักเรียน",
  "translationJa": "私は学生です"
}
```

---

## 🧩 Component Library

### SmoothUI Components

Located in `frontend/src/components/smoothui/`

#### SiriOrb

Animated voice visualization component.

```tsx
import { SiriOrb } from './components/smoothui/siri-orb'

<SiriOrb 
  state="listening"  // 'idle' | 'listening' | 'speaking'
  size={120}
/>
```

#### AIInput

Expandable AI input interface.

```tsx
import { AIInput } from './components/smoothui/ai-input'

<AIInput
  placeholder="Type a word..."
  onSubmit={(value) => console.log(value)}
/>
```

### Custom Icons

The project uses **Lucide React** for icons:

```tsx
import { Mic, Volume2, Loader2, XCircle } from 'lucide-react'

<Mic size={24} />
<Volume2 className="text-red-400" />
```

---

## 📊 Data Structures

### Core Types

```typescript
// Language direction
type LearnerMode = 'th-ja' | 'ja-th'

// UI language
type AppLang = 'th' | 'ja' | 'en'

// Japanese pitch accent
type PitchType = 'flat' | 'atamadaka' | 'nakadaka' | 'odaka' | 'heiban'

// Thai tone classes
type ToneName = 'mid' | 'low' | 'falling' | 'high' | 'rising'
```

### Japanese Syllable Structure

```typescript
interface PitchSyllable {
  kana: string        // 「た」「べ」「も」「の」
  roman: string       // "ta", "be", "mo", "no"
  isHigh: boolean     // true = high pitch
  isAccentDrop: boolean  // true = pitch drops AFTER this mora
  thai?: string       // Thai phonetic hint: "ทา", "เบ"
}
```

### Thai Syllable Structure

```typescript
interface ThaiSyllable {
  thai: string        // "สวัส"
  roman: string       // "sawat"
  tone: ToneName      // "falling"
  katakana?: string   // Japanese hint: "サワット"
}
```

### Vocabulary Entry

```typescript
interface VocabEntry {
  id: string
  category: string
  word: string           // Native script
  reading: string        // Hiragana/Katakana or Thai
  romanization: string   // Romaji or RTGS
  ipa?: string          // Optional IPA
  syllables: PitchSyllable[] | ThaiSyllable[]
  meaningTh: string     // Thai translation
  meaningJa: string     // Japanese definition
  exampleSentence: string
  exampleTranslation: string
  ttsLang: 'ja-JP' | 'th-TH'
  notes?: string
}
```

### Assessment Response

```typescript
interface AssessResponse {
  ok: boolean
  transcribed: string
  wordTimings: WordTiming[]
  accuracy: number           // 0-100 (Levenshtein-based)
  charDiff: CharDiffToken[]
  feedback: { th: string; ja: string }
  aiScore: number           // 0-100 (GPT-4o score)
  aiFeedback: string        // Coaching in native language
  mispronounced: string[]   // Problem sounds
  error?: string
}
```

---

## 🚢 Deployment

### Production Build

```bash
# 1. Build frontend
bun run build

# 2. Set production environment variables
export OPENAI_API_KEY=sk-...
export PORT=3001

# 3. Start backend (serves API + static files)
cd backend && bun run start
```

### Docker Deployment (Optional)

```dockerfile
# Dockerfile
FROM oven/bun:1

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install dependencies
RUN bun install

# Copy source
COPY . .

# Build frontend
RUN bun run build

# Expose port
EXPOSE 3001

# Start
CMD ["bun", "run", "--env-file", ".env", "backend/src/index.ts"]
```

### Environment Setup

```bash
# Build image
docker build -t project-j .

# Run container
docker run -p 3001:3001 \
  -e OPENAI_API_KEY=sk-... \
  -e PORT=3001 \
  project-j
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "OPENAI_API_KEY is not set"

**Solution:**
```bash
# Create .env file
cp .env.example .env

# Add your key
echo "OPENAI_API_KEY=sk-..." > .env
```

#### 2. CORS Errors

**Symptom:** `Access-Control-Allow-Origin` error in browser

**Solution:** Ensure backend CORS is configured for your frontend URL:

```typescript
// backend/src/index.ts
.use(cors({
  origin: ['http://localhost:5173', 'https://yourdomain.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
}))
```

#### 3. Microphone Not Working

**Checklist:**
- [ ] Browser supports MediaRecorder API
- [ ] HTTPS or localhost (required for mic access)
- [ ] Mic permissions granted in browser
- [ ] No other app is using the microphone

#### 4. Whisper API Errors

**Symptom:** "Invalid file format" or transcription fails

**Solution:** 
- Ensure audio blob has proper extension (`.webm`, `.ogg`, `.mp4`, `.wav`)
- Check MIME type is supported

#### 5. Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules bun.lock
bun install
```

### Debug Mode

Enable verbose logging:

```bash
# Backend
debug=true bun run dev:backend

# Frontend (browser DevTools)
localStorage.setItem('debug', 'true')
```

---

## 📝 Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Consistent 2-space indentation

### Adding New Vocabulary

Edit the JSON files in `frontend/src/data/`:

```json
// ja-th.json or th-ja.json
{
  "id": "greetings-hello",
  "category": "Greetings",
  "word": "こんにちは",
  "reading": "こんにちは",
  "romanization": "konnichiwa",
  "syllables": [
    { "kana": "こん", "roman": "kon", "isHigh": false, "isAccentDrop": false, "thai": "คอน" },
    { "kana": "に", "roman": "ni", "isHigh": true, "isAccentDrop": true, "thai": "นิ" },
    { "kana": "ち", "roman": "chi", "isHigh": false, "isAccentDrop": false, "thai": "ชิ" },
    { "kana": "は", "roman": "wa", "isHigh": false, "isAccentDrop": false, "thai": "วะ" }
  ],
  "meaningTh": "สวัสดี",
  "meaningJa": "昼の挨拶",
  "exampleSentence": "こんにちは、元気ですか？",
  "exampleTranslation": "สวัสดี สบายดีไหมครับ/คะ？",
  "ttsLang": "ja-JP"
}
```

### Adding API Endpoints

```typescript
// backend/src/routes/pronunciation.ts
export const pronunciationRoutes = new Elysia({ prefix: '/api' })
  .post('/new-endpoint', 
    async ({ body }) => {
      // Implementation
      return { ok: true, data: ... }
    },
    {
      body: t.Object({
        field: t.String()
      })
    }
  )
```

---

## 📚 References

### Academic Foundation

This project is based on research in Computer-Assisted Pronunciation Training (CAPT):

1. **Golonka et al. (2014)** - Technologies for foreign language learning review
2. **Neri et al. (2002)** - Pedagogy-technology interface in CAPT

See `ACADEMIC.md` for full citations.

### External APIs

- [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-recognition)
- [OpenAI GPT-4o](https://platform.openai.com/docs/models/gpt-4o)
- [Elysia Documentation](https://elysiajs.com/)

---

## 📄 License

This project is for educational purposes.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 💬 Support

For questions or issues:
1. Check the Troubleshooting section
2. Review existing issues
3. Create a new issue with detailed information

---

*Last updated: 2026-02-25*
