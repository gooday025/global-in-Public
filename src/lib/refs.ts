// 위험 신호별 판단 근거(출처). 화면과 신뢰 페이지에서 "왜 이걸 위험하다고 하나"의 근거로 보여 준다.
export interface Ref {
  key: string;
  name: string; // 짧은 이름
  title: string; // 원문 제목
  org: string;
  date: string;
  url?: string;
}

export const REFS: Record<string, Ref> = {
  policy: {
    key: "policy",
    name: "정책브리핑 해외취업 사기 주의보",
    title: "무자격 고수익 보장?! 해외 취업 사기 주의보",
    org: "대한민국 정책브리핑(KTV)",
    date: "2025.11.19",
    url: "https://www.korea.kr/news/policyNewsView.do?newsId=148954930",
  },
  news: {
    key: "news",
    name: "뉴시스 캄보디아 구인 유인 보도",
    title: "'고수익, 안전보장'…캄보디아 구인·구직 유인 여전히 활개",
    org: "뉴시스",
    date: "2025.10.23",
    url: "https://www.newsis.com/view/NISX20251023_0003373513",
  },
  mofa: {
    key: "mofa",
    name: "외교부 해외안전여행 여행경보",
    title: "국가·지역별 여행경보",
    org: "외교부",
    date: "상시",
    url: "https://www.0404.go.kr/dev/country.mofa",
  },
  team: {
    key: "team",
    name: "보도된 유인 문구 패턴(팀 정리)",
    title: "해외취업 사기 보도에 반복된 유인 문구를 팀이 분류한 것",
    org: "글로벌-인 팀",
    date: "2026.10",
  },
};

// 신호 id → 근거
export const SIGNAL_REF: Record<string, string[]> = {
  account_phone: ["policy"], // 대포통장 거래 유의
  safety_claim: ["news"], // '고수익, 안전보장'
  visa_bypass: ["policy"], // 취업비자 없이 일하면 불법체류자
  upfront_fee: ["team"],
  messenger_only: ["team"],
  hidden_info: ["policy"], // 회사명·주소 직접 확인
  passport: ["policy"], // 여권과 휴대전화를 빼앗기고
  confinement: ["policy"],
  debt_target: ["team"],
  risk_area: ["mofa", "news"],
  urgency: ["team"],
  vague_work: ["policy"], // 계약 내용이 불분명하면
  no_experience: ["policy"], // 무자격 고수익 보장
  high_pay: ["policy", "news"],
};

export const MITIGATOR_REF: Record<string, string[]> = {
  official_channel: ["policy"], // 공식 구직 플랫폼
  proper_visa: ["policy"],
  requirements: ["team"],
  process: ["team"],
};

export function refsFor(id: string): Ref[] {
  return (SIGNAL_REF[id] ?? ["team"]).map((k) => REFS[k]);
}
