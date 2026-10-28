// 공고 문장에서 급여를 찾아 '월 원화(만원)'로 환산. 환율은 2026년 10월 기준 대략값(판단용 근사치).
const KRW_PER: Record<string, number> = {
  USD: 1400, "$": 1400, 달러: 1400,
  JPY: 9.4, 엔: 9.4, 만엔: 94000,
  EUR: 1600, "€": 1600, 유로: 1600,
  GBP: 1850, "£": 1850,
  AUD: 900, "A$": 900,
  CAD: 1000, "C$": 1000,
  NZD: 820, "NZ$": 820,
  SGD: 1080, "S$": 1080,
  HKD: 180, "HK$": 180,
  THB: 42,
  PHP: 24,
  AED: 380,
  RMB: 195,
  "NT$": 44,
  RM: 320,
  ISK: 10,
};

export interface SalaryHit {
  text: string;
  index: number;
  monthlyManwon: number; // 월 기준 만원
}

function toNum(s: string) {
  return parseFloat(s.replace(/,/g, ""));
}

// 한국어 금액 "1억 2천", "3000만원", "1,300만원", "월 1000", "월 700~1500"
function parseKoreanMan(raw: string): number | null {
  const s = raw.replace(/\s/g, "");
  let man = 0;
  const eok = s.match(/(\d+(?:\.\d+)?)억/);
  if (eok) man += toNum(eok[1]) * 10000;
  const cheon = s.match(/억?(\d+)천/);
  if (cheon) man += toNum(cheon[1]) * 1000;
  const m = s.match(/([\d,]+(?:\.\d+)?)만/);
  if (m) man += toNum(m[1]);
  if (!eok && !cheon && !m) {
    const n = s.match(/([\d,]+)/);
    if (n) man += toNum(n[1]);
  }
  return man > 0 ? man : null;
}

export function findSalaries(text: string): SalaryHit[] {
  const hits: SalaryHit[] = [];

  // 1) 원화: (월|월급|주급|연봉|일당)? 숫자(억/천/만)원, 범위는 최댓값
  const krw = /(월급?|주급|연봉|일당|초보|숙련자는|정산)?\s*(?:평균\s*)?((?:\d[\d,.]*\s*(?:억|천|만)?\s*)+)(?:~\s*((?:\d[\d,.]*\s*(?:억|천|만)?\s*)+))?\s*(만\s*원|만원|원|만|천)(?![a-zA-Z])/g;
  for (const mt of text.matchAll(krw)) {
    const period = mt[1] ?? "";
    const hi = mt[3] ?? mt[2];
    const unit = mt[4];
    let man = parseKoreanMan(hi + (unit.startsWith("만") ? "만" : unit === "천" ? "천" : ""));
    if (man == null) continue;
    if (unit === "원" && !/[억천만]/.test(hi)) man = man / 10000;
    if (man < 50) continue; // 수당·소액 무시
    let monthly = man;
    const ctx = text.slice(Math.max(0, (mt.index ?? 0) - 6), mt.index ?? 0);
    const p = period || (/(연봉)/.test(ctx) ? "연봉" : /(주급)/.test(ctx) ? "주급" : "");
    if (p === "연봉") monthly = man / 12;
    else if (p === "주급") monthly = man * 4.3;
    else if (p === "일당") monthly = man * 22;
    hits.push({ text: mt[0].trim(), index: mt.index ?? 0, monthlyManwon: Math.round(monthly) });
  }

  // 2) 외화: 통화기호/코드 + 금액 (+ /month, 월, 연봉, 시급)
  const fx = /(연봉|월|시급|일당|주급)?\s*(A\$|C\$|NZ\$|S\$|HK\$|NT\$|\$|€|£|USD|THB|PHP|AED|RMB|RM|ISK|SGD|AUD|CAD|EUR|GBP|JPY)\s?([\d,]+(?:\.\d+)?)(?:\s*~\s*(?:A\$|C\$|NZ\$|S\$|HK\$|NT\$|\$|€|£|[A-Z]{2,3})?\s?([\d,]+))?\s*(만엔|USD)?(\s*(per month|\/month|a month))?/g;
  for (const mt of text.matchAll(fx)) {
    const cur = mt[2];
    const amt = toNum(mt[4] ?? mt[3]);
    if (!amt) continue;
    const rate = KRW_PER[cur] ?? 1400;
    let won = amt * rate;
    const before = text.slice(Math.max(0, (mt.index ?? 0) - 8), (mt.index ?? 0) + 2);
    const after = text.slice((mt.index ?? 0) + mt[0].length, (mt.index ?? 0) + mt[0].length + 12);
    const period = mt[1] || (/연봉/.test(before) ? "연봉" : /시급/.test(before) ? "시급" : /일당/.test(before) ? "일당" : /주급/.test(before) ? "주급" : "");
    if (period === "연봉" || /\/yr|per year|연/.test(after)) won /= 12;
    else if (period === "시급") won *= 170;
    else if (period === "일당") won *= 22;
    else if (period === "주급") won *= 4.3;
    else if (!period && amt > 30000 && !["THB", "PHP", "ISK", "JPY"].includes(cur)) won /= 12; // 큰 금액은 연봉으로 간주
    hits.push({ text: mt[0].trim(), index: mt.index ?? 0, monthlyManwon: Math.round(won / 10000) });
  }

  // 3) 엔화 "480~600만엔", "23만엔", "25만엔"
  for (const mt of text.matchAll(/(연봉|월)?\s*([\d,]+)(?:\s*~\s*([\d,]+))?\s*만\s*엔/g)) {
    const amt = toNum(mt[3] ?? mt[2]) * 10000 * 9.4;
    const before = text.slice(Math.max(0, (mt.index ?? 0) - 6), mt.index ?? 0);
    const yearly = mt[1] === "연봉" || /연봉/.test(before) || toNum(mt[3] ?? mt[2]) >= 200;
    hits.push({ text: mt[0].trim(), index: mt.index ?? 0, monthlyManwon: Math.round((yearly ? amt / 12 : amt) / 10000) });
  }
  return hits;
}

export function maxMonthly(text: string): SalaryHit | null {
  const hits = findSalaries(text);
  if (!hits.length) return null;
  return hits.reduce((a, b) => (b.monthlyManwon > a.monthlyManwon ? b : a));
}
