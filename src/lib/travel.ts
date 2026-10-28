// 외교부 국가·지역별 여행경보 (공공데이터포털). 키가 없거나 응답 형식이 다르면 조용히 건너뛰고 0404 링크만 안내한다.
export interface TravelAlert {
  iso2: string;
  countryName: string;
  level: number | null; // 1 여행유의 ~ 4 여행금지
  levelName: string | null;
  special: boolean; // 특별여행주의보
  regionNote: string | null;
  source: "api" | "none";
  link: string;
}

const LEVEL_NAMES: Record<number, string> = { 1: "여행유의", 2: "여행자제", 3: "출국권고", 4: "여행금지" };

// 공고에 자주 나오는 국가 표기 → ISO2 (LLM이 iso2를 못 줄 때의 보조)
export const COUNTRY_ISO: Record<string, string> = {
  캄보디아: "KH", 프놈펜: "KH", 시아누크빌: "KH", 씨엠립: "KH", 바벳: "KH", 포이펫: "KH", Cambodia: "KH", Sihanoukville: "KH",
  미얀마: "MM", 양곤: "MM", 미야와디: "MM", 라오스: "LA", 비엔티안: "LA", 태국: "TH", 방콕: "TH", 파타야: "TH", 치앙마이: "TH", Bangkok: "TH",
  베트남: "VN", 호치민: "VN", 하노이: "VN", 다낭: "VN", 필리핀: "PH", 마닐라: "PH", 세부: "PH", 클락: "PH",
  말레이시아: "MY", 쿠알라룸푸르: "MY", 페낭: "MY", 인도네시아: "ID", 자카르타: "ID", 발리: "ID", 바탐: "ID",
  두바이: "AE", 아랍에미리트: "AE", 일본: "JP", 도쿄: "JP", 오사카: "JP", 중국: "CN", 상하이: "CN", 칭다오: "CN", 청도: "CN",
  미국: "US", 캐나다: "CA", 호주: "AU", 뉴질랜드: "NZ", 영국: "GB", 독일: "DE", 프랑스: "FR", 싱가포르: "SG", 홍콩: "HK", 대만: "TW",
  몽골: "MN", 카자흐스탄: "KZ", 사우디아라비아: "SA", 카타르: "QA", 인도: "IN", 멕시코: "MX", 폴란드: "PL", 헝가리: "HU",
};

export function guessIso2(text: string): string | null {
  for (const [k, v] of Object.entries(COUNTRY_ISO)) if (text.includes(k)) return v;
  return null;
}

const cache = new Map<string, { at: number; v: TravelAlert }>();

export async function getTravelAlert(iso2: string, countryName = ""): Promise<TravelAlert> {
  const link = "https://www.0404.go.kr/dev/country.mofa";
  const base: TravelAlert = { iso2, countryName, level: null, levelName: null, special: false, regionNote: null, source: "none", link };
  const key = process.env.DATA_GO_KR_KEY;
  if (!key || !iso2) return base;
  const hit = cache.get(iso2);
  if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.v;
  try {
    const url =
      `https://apis.data.go.kr/1262000/TravelAlarmService2/getTravelAlarmList2?serviceKey=${encodeURIComponent(key)}` +
      `&returnType=JSON&numOfRows=10&pageNo=1&cond[country_iso_alp2::EQ]=${iso2}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return base;
    const j = await r.json();
    const rows: Record<string, unknown>[] = j?.data ?? j?.response?.body?.items?.item ?? [];
    if (!Array.isArray(rows) || !rows.length) return base;
    const row = rows[0];
    const lvl = Number(row.alarm_lvl ?? row.alarmLvl ?? row.attention ?? NaN);
    const v: TravelAlert = {
      ...base,
      countryName: String(row.country_nm ?? countryName),
      level: Number.isFinite(lvl) && lvl > 0 ? lvl : null,
      levelName: Number.isFinite(lvl) ? LEVEL_NAMES[lvl] ?? null : null,
      special: /특별/.test(JSON.stringify(row)),
      regionNote: row.remark ? String(row.remark).slice(0, 200) : null,
      source: "api",
    };
    cache.set(iso2, { at: Date.now(), v });
    return v;
  } catch {
    return base;
  }
}
