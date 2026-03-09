# PROJECT-J Flow Diagrams
> **AI-Powered Cross-Cultural Pronunciation Learning Platform**
> 
> แอปพลิเคชันเรียนรู้การออกเสียงภาษาญี่ปุ่น-ไทย ด้วย AI

---

## 📑 Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [User Journey Flow](#2-user-journey-flow)
3. [Component Hierarchy](#3-component-hierarchy)
4. [Pronunciation Assessment Flow](#4-pronunciation-assessment-flow)
5. [Free Speak Mode Flow](#5-free-speak-mode-flow)
6. [API Data Flow](#6-api-data-flow)
7. [State Management](#7-state-management)
8. [Database / Data Structure](#8-database--data-structure)

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Browser / Mobile]
        subgraph "Frontend (React 19 + Vite)"
            UI[UI Components]
            Hooks[Custom Hooks]
            Services[API Services]
            Data[Static Data JSON]
        end
    end

    subgraph "Server Layer"
        Backend[Elysia.js Server<br/>Port 3001]
        CORS[CORS Middleware]
        Swagger[Swagger Docs<br/>/docs]
        Routes[API Routes]
    end

    subgraph "AI Services (OpenAI)"
        Whisper[Whisper API<br/>Speech-to-Text]
        GPT4o[GPT-4o API<br/>Analysis & Coaching]
    end

    subgraph "Browser APIs"
        MediaRecorder[MediaRecorder API<br/>Audio Capture]
        WebSpeech[Web Speech API<br/>Interim Transcription]
        TTS[SpeechSynthesis API<br/>Text-to-Speech]
        WebAudio[Web Audio API<br/>Silence Detection]
    end

    Browser -->|HTTP REST| Backend
    Backend -->|Audio File| Whisper
    Backend -->|Text Analysis| GPT4o
    
    UI -->|uses| Hooks
    Hooks -->|uses| MediaRecorder
    Hooks -->|uses| TTS
    UI -->|calls| Services
    Services -->|fetch| Backend
    
    FreeSpeak[FreeSpeak Component] -->|uses| WebSpeech
    FreeSpeak -->|uses| WebAudio
```

---

## 2. User Journey Flow

### 2.1 Onboarding & Language Selection

```mermaid
flowchart TD
    Start([User Opens App]) --> CheckLang{Language<br/>Selected?}
    CheckLang -->|No| LangScreen[LanguageSelectScreen]
    CheckLang -->|Yes| MainApp[Main App Interface]
    
    LangScreen --> SelectMode{Select Mode}
    SelectMode -->|TH → JP| ModeJA[Learn Japanese<br/>Red Theme]
    SelectMode -->|JP → TH| ModeTH[Learn Thai<br/>Amber Theme]
    
    ModeJA --> SelectUILang[Select UI Language<br/>TH / JA / EN]
    ModeTH --> SelectUILang
    
    SelectUILang --> Continue[Start Learning]
    Continue --> MainApp
    
    MainApp --> BottomNav[Bottom Navigation]
    
    BottomNav --> TabLanguage[Language Tab<br/>Change Mode]
    BottomNav --> TabWords[Words Tab<br/>Vocabulary List]
    BottomNav --> TabPractice[Practice Tab<br/>Free Speak]
    BottomNav --> TabPreset[Preset Tab<br/>Word Sets]
```

### 2.2 Vocabulary Learning Flow

```mermaid
flowchart TD
    WordsTab[Words Tab] --> CategoryList[Category List]
    CategoryList --> SelectWord[Select Word]
    SelectWord --> WordCard[WordCard Component]
    
    WordCard --> DisplayInfo[Display Information]
    DisplayInfo --> NativeScript[Native Script<br/>Word / Reading]
    DisplayInfo --> Romanization[Romanization<br/>Romaji / RTGS]
    DisplayInfo --> PitchTone{Language?}
    
    PitchTone -->|Japanese| PitchDisplay[Pitch Accent Display<br/>High/Low Moras]
    PitchTone -->|Thai| ToneDisplay[Tone Display<br/>Mid/Low/Falling/High/Rising]
    
    DisplayInfo --> Meaning[Meaning<br/>TH ↔ JA]
    DisplayInfo --> Example[Example Sentence]
    
    WordCard --> TTS[🔊 Listen Button]
    TTS --> BrowserTTS[Browser TTS API<br/>ja-JP / th-TH]
    
    WordCard --> PracticeSection[Pronunciation Practice]
    PracticeSection --> Recorder[PronunciationRecorder]
    Recorder --> Assessment[AI Assessment]
```

---

## 3. Component Hierarchy

```mermaid
graph TD
    App[App.tsx<br/>Main Container]
    
    subgraph "State Management"
        StateMode[mode: 'th-ja' | 'ja-th']
        StateAppLang[appLang: 'th' | 'ja' | 'en']
        StateActiveTab[activeTab: AppTab]
        StateSelected[selectedId: string | null]
        StatePreset[presetIds: string[] | null]
        StateResult[assessResult: AssessResponse | null]
    end
    
    App --> Header[Header<br/>Status & Mode Indicator]
    App --> MainContent[Main Content Area]
    App --> BottomNav[BottomNav<br/>Navigation]
    
    MainContent --> TabLanguage[LanguageSelectScreen]
    MainContent --> TabWords[Words Tab]
    MainContent --> TabPractice[Practice Tab<br/>FreeSpeak]
    MainContent --> TabPreset[PresetScreen]
    
    TabWords --> WordList[Word List Panel]
    TabWords --> WordDetail[Word Detail Panel]
    
    WordList --> GroupByCategory[Group by Category]
    WordDetail --> WordCard[WordCard]
    WordDetail --> PronunciationSection[Pronunciation Section]
    
    WordCard --> PitchDisplay[PitchDisplay<br/>Japanese]
    WordCard --> ToneDisplay[ToneDisplay<br/>Thai]
    WordCard --> TTSButton[TTS Button<br/>useTTS hook]
    
    PronunciationSection --> PronunciationRecorder[PronunciationRecorder]
    PronunciationSection --> AccuracyFeedback[AccuracyFeedback]
    
    PronunciationRecorder --> useAudioRecorder[useAudioRecorder Hook]
    PronunciationRecorder --> apiAssess[assessPronunciation API]
    
    TabPractice --> FreeSpeak[FreeSpeak Component]
    FreeSpeak --> SiriOrb[SiriOrb<br/>Voice Visualization]
    FreeSpeak --> MorphSurface[MorphSurface<br/>AI Input]
    FreeSpeak --> SentenceBreakdown[SentenceBreakdown]
    
    FreeSpeak --> useAudioRecorder2[useAudioRecorder]
    FreeSpeak --> apiTranscribe[transcribeAudio API]
    FreeSpeak --> apiLookup[lookupWord API]
    FreeSpeak --> apiTokenize[tokenizeSentence API]
```

---

## 4. Pronunciation Assessment Flow

### 4.1 Complete Assessment Pipeline

```mermaid
sequenceDiagram
    actor User
    participant UI as PronunciationRecorder
    participant Hook as useAudioRecorder
    participant Media as MediaRecorder API
    participant API as API Service
    participant Backend as Elysia Backend
    participant Whisper as OpenAI Whisper
    participant GPT as GPT-4o
    participant Feedback as AccuracyFeedback

    User->>UI: Press Record Button
    UI->>Hook: start()
    Hook->>Media: getUserMedia({ audio: true })
    Media-->>Hook: MediaStream
    Hook->>Media: MediaRecorder.start()
    
    Note over User,Media: Recording in progress...
    
    User->>UI: Press Stop Button
    UI->>Hook: stop()
    Hook->>Media: MediaRecorder.stop()
    Media-->>Hook: Audio Blob (webm/mp4)
    Hook-->>UI: Blob
    
    UI->>API: assessPronunciation(blob, word, roman, lang)
    API->>Backend: POST /api/assess (multipart/form-data)
    
    Backend->>Whisper: audio.transcriptions.create()
    Note right of Whisper: Language: ja/th<br/>Format: verbose_json<br/>Granularity: word
    Whisper-->>Backend: transcribed text + wordTimings
    
    Backend->>Backend: calcAccuracy()<br/>Levenshtein Distance
    Backend->>Backend: charDiff()<br/>Character-level comparison
    Backend->>Backend: buildFeedback()<br/>Rule-based feedback
    
    Backend->>GPT: chat.completions.create()
    Note right of GPT: System: Pronunciation Coach<br/>Score 0-100<br/>Feedback in native language
    GPT-->>Backend: aiScore, aiFeedback, mispronounced[]
    
    Backend-->>API: AssessResponse JSON
    API-->>UI: Result
    UI->>Feedback: Display result
    Feedback->>User: Show Score, Feedback, Tips
```

### 4.2 Assessment Data Transformation

```mermaid
flowchart LR
    subgraph "Input"
        Audio[Audio Blob<br/>webm/ogg/mp4/wav]
        Expected[Expected Word<br/>Native Script]
        Roman[Romanization<br/>Reading Guide]
        Lang[Language<br/>ja | th]
    end
    
    subgraph "Processing"
        Whisper[Whisper STT]
        Levenshtein[Levenshtein Distance]
        CharDiff[Character Diff]
        GPT[GPT-4o Analysis]
    end
    
    subgraph "Output"
        Transcribed[Transcribed Text]
        WordTiming[Word Timings<br/>start/end]
        Accuracy[Accuracy Score<br/>0-100]
        Diff[Char Diff Array<br/>correct/wrong/missing/extra]
        AIScore[AI Phonetic Score<br/>0-100]
        AIFeedback[AI Coaching<br/>Native Language]
        Mispronounced[Mispronounced<br/>Syllables[]]
    end
    
    Audio --> Whisper
    Whisper --> Transcribed
    Whisper --> WordTiming
    
    Expected --> Levenshtein
    Transcribed --> Levenshtein
    Levenshtein --> Accuracy
    
    Expected --> CharDiff
    Transcribed --> CharDiff
    CharDiff --> Diff
    
    Expected --> GPT
    Transcribed --> GPT
    WordTiming --> GPT
    Lang --> GPT
    GPT --> AIScore
    GPT --> AIFeedback
    GPT --> Mispronounced
```

---

## 5. Free Speak Mode Flow

### 5.1 Voice-First Interaction Flow

```mermaid
flowchart TD
    Start([Tap Orb]) --> CheckPerm{Mic Permission?}
    CheckPerm -->|Denied| Error[Show Error Message]
    CheckPerm -->|Granted| StartRecording[Start Recording]
    
    StartRecording --> MediaRecorder[MediaRecorder API]
    StartRecording --> WebSpeech[Web Speech API<br/>Interim Results]
    StartRecording --> WebAudio[Web Audio API<br/>Silence Detection]
    
    WebSpeech --> InterimDisplay[Display Interim Text<br/>Real-time]
    WebAudio --> OrbVisual[SiriOrb Visualization<br/>Voice Reactive]
    
    WebAudio --> SilenceCheck{Silence > 2s?}
    SilenceCheck -->|No| ContinueRecording[Continue Recording]
    SilenceCheck -->|Yes| AutoStop[Auto Stop Recording]
    
    UserStop[User Taps Stop] --> StopRecording
    AutoStop --> StopRecording[Stop Recording]
    
    StopRecording --> CreateBlob[Create Audio Blob]
    CreateBlob --> SendWhisper[Send to Whisper]
    
    SendWhisper --> TranscribeResult[Transcription Result]
    
    TranscribeResult --> CheckContent{Content Type?}
    
    CheckContent -->|Single Word| FindMatch{In Dataset?}
    CheckContent -->|Sentence| Tokenize[tokenizeSentence API]
    
    FindMatch -->|Yes| ShowWordCard[Display WordCard]
    FindMatch -->|No| AI_LOOKUP[lookupWord API<br/>GPT-4o]
    
    AI_LOOKUP --> LookupResult{Found?}
    LookupResult -->|Yes| ShowWordCard
    LookupResult -->|No| Tokenize
    
    Tokenize --> SentenceBreakdown[SentenceBreakdown<br/>Token Analysis]
    
    ShowWordCard --> PracticeOption[Practice Pronunciation]
    SentenceBreakdown --> PracticeOption
    
    PracticeOption --> Assess[assessPronunciation API]
    Assess --> ShowScore[Show AccuracyFeedback]
```

### 5.2 Dual Mode Architecture

```mermaid
flowchart TD
    FreeSpeak[FreeSpeak Component]
    
    FreeSpeak --> ModeSelect{Mode Selection}
    
    ModeSelect -->|Voice Tab| VoiceMode[Voice Mode]
    ModeSelect -->|Search Tab| SearchMode[Search + AI Mode]
    
    VoiceMode --> OrbButton[SiriOrb Button<br/>Tap to Speak]
    VoiceMode --> LiveWaveform[Live Waveform<br/>Voice Visualization]
    VoiceMode --> SilenceAutoStop[Auto-stop on Silence]
    VoiceMode --> WebSpeechInterim[Web Speech<br/>Interim Display]
    
    SearchMode --> MorphInput[MorphSurface Input<br/>Expandable Search]
    SearchMode --> InstantSearch[Instant Dataset Search]
    SearchMode --> AIQuery[AI Lookup on Enter]
    
    VoiceMode --> SharedLogic[Shared Processing Logic]
    SearchMode --> SharedLogic
    
    SharedLogic --> DetectSentence{Detect Type}
    DetectSentence -->|Sentence| SentenceFlow[Sentence Analysis]
    DetectSentence -->|Word| WordFlow[Word Analysis]
    
    SentenceFlow --> Tokenize[tokenizeSentence API]
    Tokenize --> SentenceBreakdown[SentenceBreakdown Display]
    
    WordFlow --> LocalSearch[Search Local Dataset]
    WordFlow --> AILookup[AI Lookup API]
    WordFlow --> DisplayWord[WordCard Display]
```

---

## 6. API Data Flow

### 6.1 API Endpoints Overview

```mermaid
flowchart LR
    subgraph "Frontend Services"
        apiAssess[assessPronunciation]
        apiTranscribe[transcribeAudio]
        apiLookup[lookupWord]
        apiTokenize[tokenizeSentence]
        apiHealth[checkHealth]
    end
    
    subgraph "Backend Routes<br/>/api"
        routeAssess[/assess<br/>POST multipart]
        routeTranscribe[/transcribe<br/>POST multipart]
        routeLookup[/lookup<br/>POST json]
        routeTokenize[/tokenize<br/>POST json]
        routeHealth[/health<br/>GET]
    end
    
    subgraph "OpenAI Integration"
        whisper1[Whisper-1<br/>STT]
        gpt4o[GPT-4o<br/>Analysis]
    end
    
    apiAssess --> routeAssess
    apiTranscribe --> routeTranscribe
    apiLookup --> routeLookup
    apiTokenize --> routeTokenize
    apiHealth --> routeHealth
    
    routeAssess --> whisper1
    routeTranscribe --> whisper1
    routeAssess --> gpt4o
    routeLookup --> gpt4o
    routeTokenize --> gpt4o
```

### 6.2 Request/Response Data Flow

```mermaid
sequenceDiagram
    participant Client
    participant Backend
    participant OpenAI
    
    Note over Client,OpenAI: === PRONUNCIATION ASSESSMENT ===
    
    Client->>Backend: POST /api/assess
    Note right of Client: audio: File<br/>expectedWord: string<br/>expectedRoman: string<br/>lang: 'ja' | 'th'
    
    Backend->>OpenAI: whisper.audio.transcriptions
    Note right of OpenAI: model: whisper-1<br/>language: ja/th<br/>response_format: verbose_json
    OpenAI-->>Backend: text, words[] with timestamps
    
    Backend->>Backend: calcAccuracy()<br/>levenshtein distance
    Backend->>Backend: charDiff()<br/>character comparison
    
    Backend->>OpenAI: gpt-4o.chat.completions
    Note right of OpenAI: pronunciation coach prompt<br/>score 0-100<br/>feedback in native language
    OpenAI-->>Backend: aiScore, aiFeedback, mispronounced[]
    
    Backend-->>Client: AssessResponse
    Note left of Backend: transcribed, accuracy, charDiff<br/>aiScore, aiFeedback, mispronounced<br/>feedback {th, ja}
    
    Note over Client,OpenAI: === WORD LOOKUP ===
    
    Client->>Backend: POST /api/lookup
    Note right of Client: word: string<br/>lang: 'ja' | 'th'
    
    Backend->>OpenAI: gpt-4o.chat.completions
    Note right of OpenAI: linguistics expert prompt<br/>return JSON structure<br/>syllables, meanings, example
    OpenAI-->>Backend: structured word data
    
    Backend-->>Client: { ok, entry: VocabEntry }
    
    Note over Client,OpenAI: === SENTENCE TOKENIZATION ===
    
    Client->>Backend: POST /api/tokenize
    Note right of Client: sentence: string<br/>lang: 'ja' | 'th'
    
    Backend->>OpenAI: gpt-4o.chat.completions
    Note right of OpenAI: tokenization prompt<br/>pitch/tone data<br/>translations
    OpenAI-->>Backend: tokens[], translations
    
    Backend-->>Client: { ok, tokens[], translationTh, translationJa }
```

---

## 7. State Management

### 7.1 Global App State

```mermaid
flowchart TD
    subgraph "App.tsx State"
        mode[mode: LearnerMode<br/>'th-ja' | 'ja-th']
        appLang[appLang: AppLang<br/>'th' | 'ja' | 'en']
        activeTab[activeTab: AppTab<br/>'language' | 'words' | 'practice' | 'preset']
        selectedId[selectedId: string | null]
        presetIds[presetIds: string[] | null]
        assessResult[assessResult: AssessResponse | null]
        assessError[assessError: string | null]
        backendOk[backendOk: boolean | null]
        showWordDetail[showWordDetail: boolean]
        languageChosen[languageChosen: boolean]
    end
    
    subgraph "Computed Values"
        dataset[dataset: VocabEntry[]<br/>TH_JA or JA_TH]
        visibleList[visibleList: VocabEntry[]<br/>filtered by preset]
        grouped[grouped: Record<category, VocabEntry[]>]
        selectedEntry[selectedEntry: VocabEntry]
        isJapanese[isJapanese: boolean]
        accentColor[accentColor<br/>'red' | 'amber']
    end
    
    mode --> dataset
    mode --> isJapanese
    isJapanese --> accentColor
    presetIds --> visibleList
    dataset --> visibleList
    visibleList --> grouped
    selectedId --> selectedEntry
    dataset --> selectedEntry
```

### 7.2 Component State Breakdown

```mermaid
flowchart TD
    subgraph "PronunciationRecorder State"
        recState[state: 'idle' | 'recording' | 'processing']
        recHook[useAudioRecorder Hook]
    end
    
    subgraph "FreeSpeak State"
        recording[recording: boolean]
        loading[loading: boolean]
        transcribeResult[transcribeResult: TranscribeResponse | null]
        matchedEntry[matchedEntry: VocabEntry | null]
        practiceRecording[practiceRecording: boolean]
        practiceLoading[practiceLoading: boolean]
        assessResult2[assessResult: AssessResponse | null]
        interimText[interimText: string]
        speakMode[speakMode: 'voice' | 'search']
        searchQuery[searchQuery: string]
        sentenceTokens[sentenceTokens: SentenceToken[] | null]
    end
    
    subgraph "Hooks State"
        audioState[AudioRecorder State]
        ttsState[TTS State<br/>speaking: boolean]
    end
    
    subgraph "Refs (Persistent)"
        mediaRef[mediaRecorder Ref]
        streamRef[micStream Ref]
        audioCtxRef[audioContext Ref]
        srRef[speechRecognition Ref]
        orbRef[orb DOM Ref]
    end
```

---

## 8. Database / Data Structure

### 8.1 Vocabulary Entry Structure

```mermaid
erDiagram
    VOCAB_ENTRY {
        string id
        string category
        string word
        string reading
        string romanization
        string ipa
        array syllables
        string meaningTh
        string meaningJa
        string exampleSentence
        string exampleTranslation
        string ttsLang
        string notes
    }
    
    PITCH_SYLLABLE {
        string kana
        string roman
        boolean isHigh
        boolean isAccentDrop
        string thai
    }
    
    THAI_SYLLABLE {
        string thai
        string roman
        string tone
        string katakana
    }
    
    ASSESS_RESPONSE {
        boolean ok
        string transcribed
        array wordTimings
        number accuracy
        array charDiff
        object feedback
        number aiScore
        string aiFeedback
        array mispronounced
        string error
    }
    
    SENTENCE_TOKEN {
        string word
        string reading
        string romanization
        boolean isParticle
        string meaningTh
        string meaningJa
        array syllables
    }
    
    VOCAB_ENTRY ||--o{ PITCH_SYLLABLE : contains_ja
    VOCAB_ENTRY ||--o{ THAI_SYLLABLE : contains_th
```

### 8.2 Data File Organization

```mermaid
flowchart TD
    subgraph "Static Data Files"
        jaTh[ja-th.json<br/>Japanese → Thai]
        thJa[th-ja.json<br/>Thai → Japanese]
    end
    
    subgraph "Categories"
        greetings[Greetings<br/>ทักทาย / 挨拶]
        numbers[Numbers<br/>ตัวเลข / 数字]
        food[Food<br/>อาหาร / 食べ物]
        common[Common<br/>ทั่วไป / 日常]
        travel[Travel<br/>เดินทาง / 旅行]
        colors[Colors<br/>สี / 色]
    end
    
    jaTh --> greetings
    jaTh --> numbers
    jaTh --> food
    thJa --> greetings
    thJa --> numbers
    thJa --> food
    
    subgraph "Entry Examples"
        exJa[こんにちは<br/>konnichiwa<br/>Pitch: 0-1-0-0]
        exTh[สวัสดี<br/>sa-wat-dee<br/>Tone: low-mid]
    end
    
    greetings --> exJa
    greetings --> exTh
```

---

## 9. Algorithm Flowcharts

### 9.1 Levenshtein Distance Algorithm

```mermaid
flowchart TD
    Start([Input: strings a, b]) --> Init[Initialize DP matrix<br/>m x n]
    Init --> FillBase[Fill base cases<br/>dp[i][0] = i<br/>dp[0][j] = j]
    
    FillBase --> Loopi[For i = 1 to m]
    Loopi --> Loopj[For j = 1 to n]
    Loopj --> CheckChar{a[i-1] == b[j-1]?}
    
    CheckChar -->|Yes| Copy[dp[i][j] = dp[i-1][j-1]]
    CheckChar -->|No| Min[dp[i][j] = 1 + min<br/>dp[i-1][j]<br/>dp[i][j-1]<br/>dp[i-1][j-1]]
    
    Copy --> NextJ{More j?}
    Min --> NextJ
    NextJ -->|Yes| Loopj
    NextJ -->|No| NextI{More i?}
    
    NextI -->|Yes| Loopi
    NextI -->|No| Return[Return dp[m][n]]
    Return --> CalcAcc[Calculate Accuracy<br/>((len - dist) / len) * 100]
```

### 9.2 Character Diff Algorithm

```mermaid
flowchart TD
    Start([Input: expected, transcribed]) --> Normalize[Normalize to lowercase<br/>Remove spaces]
    
    Normalize --> InitLoop[maxLen = max(lenA, lenB)]
    InitLoop --> Loop[For i = 0 to maxLen-1]
    
    Loop --> GetChars[ec = expected[i]<br/>gc = transcribed[i]]
    GetChars --> CheckBoth{ec && gc?}
    
    CheckBoth -->|Yes| Compare{ec == gc?}
    Compare -->|Yes| MarkCorrect[status: 'correct']
    Compare -->|No| MarkWrong[status: 'wrong']
    
    CheckBoth -->|No| CheckMissing{ec && !gc?}
    CheckMissing -->|Yes| MarkMissing[status: 'missing']
    CheckMissing -->|No| CheckExtra{!ec && gc?}
    CheckExtra -->|Yes| MarkExtra[status: 'extra']
    
    MarkCorrect --> AddResult[Add to result array]
    MarkWrong --> AddResult
    MarkMissing --> AddResult
    MarkExtra --> AddResult
    
    AddResult --> More{More chars?}
    More -->|Yes| Loop
    More -->|No| Return[Return CharDiff[]]
```

### 9.3 Silence Detection Algorithm

```mermaid
flowchart TD
    Start([Start Recording]) --> InitAudio[Create AudioContext]
    InitAudio --> CreateAnalyser[Create AnalyserNode]
    CreateAnalyser --> ConnectStream[Connect MediaStream]
    
    ConnectStream --> InitVars[Initialize:<br/>lastVoiceAt = now<br/>hasSpoken = false]
    InitVars --> StartPoll[Start requestAnimationFrame loop]
    
    StartPoll --> GetData[Get ByteTimeDomainData]
    GetData --> CalcRMS[Calculate RMS volume]
    
    CalcRMS --> CheckThreshold{RMS > threshold?}
    CheckThreshold -->|Yes| UpdateVoice[Update lastVoiceAt<br/>hasSpoken = true]
    CheckThreshold -->|No| CheckHasSpoken{hasSpoken?}
    
    CheckHasSpoken -->|Yes| CalcSilent[Calculate silent duration]
    CalcSilent --> CheckDelay{silent > 2s?}
    CheckDelay -->|Yes| AutoStop[Auto stop recording]
    CheckDelay -->|No| ContinuePoll[Continue polling]
    
    UpdateVoice --> ContinuePoll
    CheckHasSpoken -->|No| ContinuePoll
    
    ContinuePoll --> GetData
    AutoStop --> End([End])
```

---

## 10. Error Handling Flow

```mermaid
flowchart TD
    subgraph "Error Sources"
        MicError[Microphone Error]
        NetworkError[Network Error]
        APIError[OpenAI API Error]
        ValidationError[Validation Error]
    end
    
    subgraph "Error Handling"
        TryCatch[try-catch blocks]
        ErrorState[Error State Variables]
        UIError[Error UI Display]
        Fallback[Fallback Behavior]
    end
    
    subgraph "User Feedback"
        Toast[Toast Message]
        Inline[Inline Error]
        Console[Console Log]
    end
    
    MicError --> TryCatch
    NetworkError --> TryCatch
    APIError --> TryCatch
    ValidationError --> TryCatch
    
    TryCatch --> ErrorState
    ErrorState --> UIError
    UIError --> Toast
    UIError --> Inline
    TryCatch --> Console
    
    MicError --> Fallback
    Fallback --> Retry[Retry Button]
    Fallback --> OfflineMode[Offline Indicator]
```

---

## 11. Browser Compatibility Flow

```mermaid
flowchart TD
    Start([App Load]) --> CheckMediaRecorder{MediaRecorder<br/>supported?}
    CheckMediaRecorder -->|No| CheckiOS{iOS Safari?}
    CheckiOS -->|Yes| UseMP4[Use audio/mp4]
    CheckiOS -->|No| ShowError[Show Unsupported Message]
    
    CheckMediaRecorder -->|Yes| DetectBestMime[Detect Best MIME Type]
    DetectBestMime --> Priority[Priority:<br/>1. audio/webm;codecs=opus<br/>2. audio/webm<br/>3. audio/ogg<br/>4. audio/mp4]
    
    Priority --> CheckTTS{SpeechSynthesis<br/>supported?}
    CheckTTS -->|No| DisableTTS[Disable TTS Features]
    CheckTTS -->|Yes| LoadVoices[Load Voices Async]
    
    LoadVoices --> CheckWebSpeech{Web Speech API<br/>supported?}
    CheckWebSpeech -->|No| DisableInterim[Disable Interim Text]
    CheckWebSpeech -->|Yes| EnableInterim[Enable Interim Transcription]
    
    DisableTTS --> InitComplete[Initialize App]
    DisableInterim --> InitComplete
    EnableInterim --> InitComplete
    UseMP4 --> InitComplete
    ShowError --> InitComplete
```

---

## สรุป (Summary)

```mermaid
mindmap
  root((PROJECT-J))
    Frontend
      React 19 + Vite
      TailwindCSS 4
      TypeScript 5.9
      Custom Hooks
        useAudioRecorder
        useTTS
      Components
        WordCard
        PronunciationRecorder
        FreeSpeak
        AccuracyFeedback
    Backend
      Elysia.js
      OpenAI Integration
        Whisper STT
        GPT-4o Analysis
      REST API
        /assess
        /transcribe
        /lookup
        /tokenize
    Features
      Pronunciation Assessment
      Free Speak Mode
      Word Lookup
      Sentence Tokenization
      Text-to-Speech
    Data
      Static JSON
        ja-th.json
        th-ja.json
      Types
        VocabEntry
        AssessResponse
        SentenceToken
```

---

*สร้างเมื่อ: 2026-03-09*
*เวอร์ชัน: 1.0*
