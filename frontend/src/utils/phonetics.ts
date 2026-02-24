/**
 * phonetics.ts
 * Converts phonetic romanizations to helper scripts for learners.
 *
 * romajiMoraToThai  → Japanese romaji mora (ko, shi, tsu) → Thai phonetic (โค, ชิ, สึ)
 * rtgsToKatakana    → Thai RTGS syllable (sa-wat, dee)   → Katakana (サワット, ディー)
 */

// ─── Japanese Romaji Mora → Thai Phonetic ─────────────────────────────────────
// Based on standard Thai transcription of Japanese sounds used in Thai–Japanese textbooks.
const MORA_TO_THAI: Record<string, string> = {
  // bare vowels
  a: 'อา',  i: 'อิ',  u: 'อุ',  e: 'เอ',  o: 'โอ',
  // syllabic N
  n: 'น', nn: 'น',
  // K row
  ka: 'คา', ki: 'คิ', ku: 'คุ', ke: 'เค', ko: 'โค',
  // S row
  sa: 'ซา', shi: 'ชิ', si: 'ชิ', su: 'ซุ', se: 'เซ', so: 'โซ',
  // T row
  ta: 'ทา', chi: 'ชิ', ti: 'ทิ', tsu: 'สึ', tu: 'ทุ', te: 'เท', to: 'โท',
  // N row
  na: 'นา', ni: 'นิ', nu: 'นุ', ne: 'เน', no: 'โน',
  // H row
  ha: 'ฮา', hi: 'ฮิ', fu: 'ฝุ', hu: 'ฮุ', he: 'เฮ', ho: 'โฮ',
  // M row
  ma: 'มา', mi: 'มิ', mu: 'มุ', me: 'เม', mo: 'โม',
  // Y row
  ya: 'ยา', yu: 'ยุ', yo: 'โย',
  // R row
  ra: 'รา', ri: 'ริ', ru: 'รุ', re: 'เร', ro: 'โร',
  // W row
  wa: 'วา', wi: 'วิ', we: 'เว', wo: 'โวะ',
  // G row (voiced k)
  ga: 'กา', gi: 'กิ', gu: 'กุ', ge: 'เก', go: 'โก',
  // Z row
  za: 'ซา', ji: 'จิ', zi: 'จิ', zu: 'ซุ', ze: 'เซ', zo: 'โซ',
  // D row
  da: 'ดา', di: 'ดิ', du: 'ดุ', de: 'เด', do: 'โด',
  // B row
  ba: 'บา', bi: 'บิ', bu: 'บุ', be: 'เบ', bo: 'โบ',
  // P row
  pa: 'ปา', pi: 'ปิ', pu: 'ปุ', pe: 'เป', po: 'โป',
  // Compound kana (yōon)
  kya: 'คยา', kyu: 'คยุ', kyo: 'คโย',
  sha: 'ชา',  shu: 'ชุ',  sho: 'โช',
  cha: 'ชา',  chu: 'ชุ',  cho: 'โช',
  nya: 'นยา', nyu: 'นยุ', nyo: 'นโย',
  hya: 'ฮยา', hyu: 'ฮยุ', hyo: 'ฮโย',
  mya: 'มยา', myu: 'มยุ', myo: 'มโย',
  rya: 'รยา', ryu: 'รยุ', ryo: 'รโย',
  gya: 'กยา', gyu: 'กยุ', gyo: 'กโย',
  ja: 'จา',   ju: 'จุ',   jo: 'โจ',
  bya: 'บยา', byu: 'บยุ', byo: 'บโย',
  pya: 'ปยา', pyu: 'ปยุ', pyo: 'ปโย',
}

export function romajiMoraToThai(roman: string): string {
  const key = roman.toLowerCase().replace(/[-\s]/g, '')
  return MORA_TO_THAI[key] ?? roman
}

// ─── Thai RTGS Syllable → Katakana ────────────────────────────────────────────
// Rule-based conversion: identifies onset + vowel + coda then maps to Katakana.

// Strip Unicode diacritics (tone marks like ˆ ` ´ used in some RTGS notations)
function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Onset clusters, longest-match first
const ONSET_LIST = ['ng', 'kh', 'ph', 'th', 'ch', 'tr', 'pr', 'pl', 'k', 's', 't', 'n', 'p', 'f', 'm', 'y', 'r', 'l', 'w', 'h', 'd', 'b']

// Katakana base per onset × base vowel index (0=a 1=i 2=u 3=e 4=o)
const ONSET_KATA: Record<string, [string, string, string, string, string]> = {
  //         a        i       u        e       o
  'kh': ['カ',  'キ',  'ク',   'ケ',  'コ'],
  'ph': ['パ',  'ピ',  'プ',   'ペ',  'ポ'],
  'th': ['タ',  'ティ','トゥ', 'テ',  'ト'],
  'ch': ['チャ','チ',  'チュ', 'チェ','チョ'],
  'tr': ['チャ','チ',  'チュ', 'チェ','チョ'],
  'pr': ['プラ','プリ','プル', 'プレ','プロ'],
  'pl': ['プラ','プリ','プル', 'プレ','プロ'],
  'ng': ['ンガ','ンギ','ング', 'ンゲ','ンゴ'],
  'k':  ['カ',  'キ',  'ク',   'ケ',  'コ'],
  's':  ['サ',  'シ',  'ス',   'セ',  'ソ'],
  't':  ['タ',  'ティ','トゥ', 'テ',  'ト'],
  'n':  ['ナ',  'ニ',  'ヌ',   'ネ',  'ノ'],
  'p':  ['パ',  'ピ',  'プ',   'ペ',  'ポ'],
  'f':  ['ファ','フィ','フ',   'フェ','フォ'],
  'm':  ['マ',  'ミ',  'ム',   'メ',  'モ'],
  'y':  ['ヤ',  'イ',  'ユ',   'イェ','ヨ'],
  'r':  ['ラ',  'リ',  'ル',   'レ',  'ロ'],
  'l':  ['ラ',  'リ',  'ル',   'レ',  'ロ'],
  'w':  ['ワ',  'ウィ','ウ',   'ウェ','ウォ'],
  'h':  ['ハ',  'ヒ',  'フ',   'ヘ',  'ホ'],
  'd':  ['ダ',  'ディ','ドゥ', 'デ',  'ド'],
  'b':  ['バ',  'ビ',  'ブ',   'ベ',  'ボ'],
  '':   ['ア',  'イ',  'ウ',   'エ',  'オ'],
}

// Vowel nucleus patterns → [vowelIdx (0=a,1=i,2=u,3=e,4=o), katakana suffix added after base]
// Longest patterns first for greedy matching.
// Diphthongs: use base vowel index of first element, add suffix for second element.
const VOWEL_MAP: [string, [number, string]][] = [
  ['uea',  [2, 'ア']],    // ɯa → ウ-base + ア
  ['uaa',  [2, 'アー']],  // ua long
  ['iaa',  [1, 'アー']],  // ia long
  ['ia',   [1, 'ア']],
  ['ua',   [2, 'ア']],
  ['aaw',  [4, 'ー']],    // long ɔː
  ['aae',  [3, 'ー']],    // long æː
  ['ooe',  [2, 'ー']],    // long ɯː
  ['aa',   [0, 'ー']],
  ['ii',   [1, 'ー']],
  ['uu',   [2, 'ー']],
  ['ee',   [3, 'ー']],
  ['oo',   [4, 'ー']],
  ['aw',   [4, '']],
  ['ae',   [3, '']],
  ['oe',   [2, '']],
  ['a',    [0, '']],
  ['i',    [1, '']],
  ['u',    [2, '']],
  ['e',    [3, '']],
  ['o',    [4, '']],
]

// Final coda consonant → Katakana suffix
const CODA_KATA: Record<string, string> = {
  'ng': 'ング',
  'k':  'ク',
  't':  'ト',
  'p':  'プ',
  'n':  'ン',
  'm':  'ム',
  'w':  'ウ',
  'y':  'イ',
}

function convertRtgsPart(raw: string): string {
  const s = stripDiacritics(raw).toLowerCase()

  // 1. Find onset (longest match first)
  let onset = ''
  let rest = s
  for (const o of ONSET_LIST) {
    if (rest.startsWith(o)) {
      onset = o
      rest = rest.slice(o.length)
      break
    }
  }

  // 2. Find coda (must leave at least one char for vowel)
  const codaKeys = ['ng', 'k', 't', 'p', 'n', 'm', 'w', 'y']
  let coda = ''
  for (const c of codaKeys) {
    if (rest.endsWith(c) && rest.length > c.length) {
      coda = c
      rest = rest.slice(0, -c.length)
      break
    }
  }

  // 3. Match vowel → katakana syllable base + suffix
  const onsetKata = ONSET_KATA[onset] ?? ONSET_KATA['']
  let kataSyllable = onsetKata[0] // default: 'a' vowel

  for (const [pattern, [vIdx, suffix]] of VOWEL_MAP) {
    if (rest === pattern || rest.startsWith(pattern)) {
      kataSyllable = onsetKata[vIdx] + suffix
      break
    }
  }

  // 4. Append coda
  return kataSyllable + (CODA_KATA[coda] ?? '')
}

export function rtgsToKatakana(rtgs: string): string {
  // Split on dashes (multi-syllable RTGS like "sa-wat")
  const parts = rtgs.split(/-/).filter(Boolean)
  return parts.map(convertRtgsPart).join('')
}
