// Normalized text matching shared by the results list and the suggestion
// dropdown, so "S.Coups", "scoups", "s coups" and "최승철" all line up.

// Lowercases, strips accents and punctuation, and collapses whitespace while
// keeping letters in any script (Hangul decomposes into jamo, which still
// matches substring-wise on both sides of the comparison).
export function normalize(str) {
  return String(str ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// Space-free spelling, for queries like "the8" or "booseungkwan".
export function compact(str) {
  return normalize(str).replace(/\s+/g, "");
}

// Extra spellings worth matching per member: stage-name quirks, real names,
// and Korean readings.
export const MEMBER_ALIASES = {
  "S.Coups": "scoups coups choi seungcheol seung chul 에스쿱스 최승철",
  "Jeonghan": "yoon jeonghan jeong han 윤정한 정한",
  "Joshua": "joshua hong hong jisoo jisoo 조슈아 홍지수",
  "Jun": "wen junhui junhui 준 문준휘",
  "Hoshi": "kwon soonyoung soonyoung ho5hi 호시 권순영 순영",
  "Wonwoo": "jeon wonwoo won woo 원우 전원우",
  "Woozi": "lee jihoon jihoon 우지 이지훈 지훈",
  "DK": "lee seukmin seukmin dokyeom 디케이 이석민 석민",
  "Mingyu": "kim mingyu ming yu 민규 김민규",
  "Minghao": "the8 the 8 xu minghao minghao 민하오",
  "Seungkwan": "boo seungkwan seung kwan 승관 부승관",
  "Vernon": "hansol vernon chwe 버논 한솔",
  "Dino": "lee chan dino 찬 디노 이찬",
};

// Members offered when there is nothing better to suggest.
export const QUICK_PICKS = ["S.Coups", "Hoshi", "Mingyu", "Seungkwan"];

const TEXT_FIELDS = ["name", "fullName", "title", "sub", "album", "position", "unit", "desc", "song"];

// Normalizing is the expensive part, so per-item text is computed once and
// reused for every keystroke.
const textCache = new WeakMap();

function searchTextFor(item) {
  let cached = textCache.get(item);
  if (!cached) {
    const parts = [];
    for (const field of TEXT_FIELDS) {
      if (item && item[field]) parts.push(String(item[field]));
    }
    const aliases = item && MEMBER_ALIASES[item.name];
    if (aliases) parts.push(aliases);
    const norm = normalize(parts.join(" "));
    cached = { norm, flat: norm.replace(/\s+/g, "") };
    textCache.set(item, cached);
  }
  return cached;
}

// True when the item's (cached) text contains the query, either as typed or —
// for queries of 3+ characters — with all spaces removed.
export function matchesQuery(item, query) {
  const qn = normalize(query);
  if (!qn) return false;
  const { norm, flat } = searchTextFor(item);
  if (norm.includes(qn)) return true;
  const qc = qn.replace(/\s+/g, "");
  return qc.length >= 3 && flat.includes(qc);
}
