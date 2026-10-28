// 출국 준비 체크리스트 지식베이스. 링크는 공식 기관 사이트만 쓴다.
export type Purpose = "job" | "study" | "wh" | "intern";
export const PURPOSES: { id: Purpose; label: string }[] = [
  { id: "job", label: "해외 취업" },
  { id: "intern", label: "해외 인턴·파견" },
  { id: "study", label: "유학·어학연수" },
  { id: "wh", label: "워킹홀리데이" },
];

export const COUNTRIES: { iso: string; name: string; visa?: string }[] = [
  { iso: "US", name: "미국", visa: "https://travel.state.gov/content/travel/en/us-visas.html" },
  { iso: "JP", name: "일본", visa: "https://www.kr.emb-japan.go.jp/" },
  { iso: "AU", name: "호주", visa: "https://immi.homeaffairs.gov.au/" },
  { iso: "CA", name: "캐나다", visa: "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
  { iso: "GB", name: "영국", visa: "https://www.gov.uk/browse/visas-immigration" },
  { iso: "DE", name: "독일", visa: "https://seoul.diplo.de/" },
  { iso: "NZ", name: "뉴질랜드", visa: "https://www.immigration.govt.nz/" },
  { iso: "SG", name: "싱가포르", visa: "https://www.mom.gov.sg/" },
  { iso: "VN", name: "베트남" },
  { iso: "TH", name: "태국" },
  { iso: "PH", name: "필리핀" },
  { iso: "MY", name: "말레이시아" },
  { iso: "ID", name: "인도네시아" },
  { iso: "KH", name: "캄보디아" },
  { iso: "LA", name: "라오스" },
  { iso: "MM", name: "미얀마" },
  { iso: "CN", name: "중국" },
  { iso: "AE", name: "아랍에미리트" },
  { iso: "FR", name: "프랑스" },
  { iso: "TW", name: "대만" },
];

export interface KbItem {
  id: string;
  dday: number; // 출국일 기준 며칠 전(음수=도착 후)
  text: string;
  for: Purpose[] | "all";
  source: string;
  url?: string;
  risky?: boolean; // 사기 예방 핵심 항목
}

const ALL: "all" = "all";
const WORK: Purpose[] = ["job", "intern", "wh"];

export const KB: KbItem[] = [
  { id: "company", dday: 60, for: ["job", "intern"], risky: true, text: "회사의 정식 법인명·주소·등록번호를 받아 공식 등록 정보, 지도와 대조하기", source: "KOTRA 해외취업 헬프데스크 기업정보 확인 (정책브리핑 2025.10)", url: "https://www.worldjob.or.kr" },
  { id: "contract", dday: 60, for: WORK, risky: true, text: "근로계약서를 출국 전에 서면으로 받기: 급여, 근무시간, 숙소, 귀국 비용, 해지 조건 확인", source: "KOTRA 자문변호사 계약서 검토 (정책브리핑 2025.10)" },
  { id: "visa-work", dday: 60, for: WORK, risky: true, text: "취업비자·노동허가가 출국 전에 발급되는지 확인하기. 관광·무비자로 일하면 현지에서 불법체류가 됨", source: "정책브리핑 해외취업 사기 예방 수칙 (2025.10)" },
  { id: "visa-study", dday: 60, for: ["study"], text: "입학허가서와 학생비자 요건(재정증명, 보험, 서류 원본) 확인하고 신청 일정 잡기", source: "해당국 이민·비자 공식 사이트" },
  { id: "passport", dday: 60, for: ALL, text: "여권 유효기간이 체류 기간 + 6개월 이상 남았는지 확인하기", source: "외교부 여권안내", url: "https://www.passport.go.kr" },
  { id: "no-fee", dday: 45, for: WORK, risky: true, text: "알선비·비자비·보증금을 먼저 보내라는 요구가 있으면 진행 멈추기", source: "정책브리핑·보도된 사기 수법" },
  { id: "alert", dday: 30, for: ALL, risky: true, text: "근무·체류 지역의 여행경보 단계 확인하기 (도시·지역 단위로)", source: "외교부 해외안전여행", url: "https://www.0404.go.kr" },
  { id: "insurance", dday: 30, for: ALL, text: "체류 기간 전체를 보장하는 해외 체류·유학생 보험 가입하기", source: "일반 안내" },
  { id: "address", dday: 30, for: ALL, risky: true, text: "숙소와 근무지(학교)의 정확한 주소를 받아 가족에게 공유하기", source: "보도된 감금 피해 사례(근무지 비공개)" },
  { id: "embassy", dday: 21, for: ALL, text: "현지 한국 대사관·총영사관 주소와 긴급 연락처 저장하기", source: "외교부 해외안전여행", url: "https://www.0404.go.kr" },
  { id: "dongheng", dday: 14, for: ALL, text: "해외안전여행 '동행' 서비스에 체류 일정 등록하기 (현지 안전정보 문자 수신)", source: "외교부 해외안전여행", url: "https://www.0404.go.kr" },
  { id: "callcenter", dday: 14, for: ALL, text: "영사안전콜센터 +82-2-3210-0404(24시간)를 휴대폰에 저장하기", source: "외교부 영사안전콜센터" },
  { id: "copies", dday: 14, for: ALL, text: "여권·비자·계약서·입학허가서 사본을 클라우드에 저장하고 가족과 공유하기", source: "일반 안내" },
  { id: "phone", dday: 7, for: ALL, text: "현지 유심 또는 로밍, 해외 결제 카드 준비하기", source: "일반 안내" },
  { id: "final-check", dday: 7, for: WORK, risky: true, text: "최종 점검: 출국 직전에 근무지·조건이 바뀌거나 '비자는 와서 처리'라고 하면 출국 보류하기", source: "보도된 사기 수법 (머니투데이·뉴시스 2025.10)" },
  { id: "family", dday: 1, for: ALL, text: "가족과 도착 후 연락 시간·방법을 약속하고, 연락이 끊기면 영사콜센터에 신고하도록 알려 두기", source: "일반 안내" },
  { id: "passport-keep", dday: 0, for: ALL, risky: true, text: "여권은 누구에게도 맡기지 않고 본인이 보관하기", source: "보도된 감금 피해 사례" },
  { id: "register", dday: -30, for: ALL, text: "90일 이상 체류하면 재외국민등록 하기", source: "외교부 영사민원24", url: "https://consul.mofa.go.kr" },
];

export interface Group {
  dday: number;
  date: string; // YYYY-MM-DD
  items: (KbItem & { ai?: boolean })[];
}

export function buildChecklist(purpose: Purpose, iso: string, depart: string): Group[] {
  const country = COUNTRIES.find((c) => c.iso === iso);
  const items: KbItem[] = KB.filter((k) => k.for === "all" || k.for.includes(purpose)).map((k) =>
    (k.id === "visa-work" || k.id === "visa-study") && country?.visa ? { ...k, url: country.visa, source: `${country.name} 이민·비자 공식 사이트` } : k,
  );
  const base = new Date(depart + "T00:00:00Z");
  const buckets = [60, 30, 14, 7, 1, 0, -30];
  const groups: Group[] = [];
  for (const b of buckets) {
    const g = items.filter((k) => bucketOf(k.dday) === b);
    if (!g.length) continue;
    const d = new Date(base.getTime() - b * 864e5);
    groups.push({ dday: b, date: d.toISOString().slice(0, 10), items: g });
  }
  return groups;
}

function bucketOf(d: number) {
  if (d >= 45) return 60;
  if (d >= 21) return 30;
  if (d >= 10) return 14;
  if (d >= 2) return 7;
  if (d >= 1) return 1;
  if (d >= 0) return 0;
  return -30;
}
