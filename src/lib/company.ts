// 공고 글에서 회사 확인에 필요한 단서(회사명·이메일·웹사이트)를 뽑고, 어디서 확인할지 링크를 만든다.
// 서버 조회는 하지 않는다. 나라마다 법인 등록부 형식이 달라, 공식 조회 페이지로 안내만 한다.

const FREE_MAIL = new Set([
  "gmail.com", "naver.com", "hanmail.net", "daum.net", "kakao.com", "nate.com", "hotmail.com", "outlook.com", "live.com",
  "yahoo.com", "yahoo.co.jp", "icloud.com", "me.com", "qq.com", "163.com", "126.com", "proton.me", "protonmail.com", "mail.ru", "yandex.com",
]);

// 링크로 쓰이지만 회사 자체 사이트가 아닌 곳
const NOT_COMPANY_SITE = /(^|\.)(t\.me|telegram\.(me|org)|open\.kakao\.com|kakao\.com|wa\.me|whatsapp\.com|line\.me|instagram\.com|facebook\.com|fb\.com|x\.com|twitter\.com|youtube\.com|naver\.com|blog\.naver\.com|cafe\.naver\.com|daum\.net|tistory\.com|google\.com|forms\.gle|bit\.ly|linktr\.ee|worldjob\.or\.kr|saramin\.co\.kr|jobkorea\.co\.kr|linkedin\.com|indeed\.com)$/i;

export interface CompanyClues {
  name: string; // 공고에서 찾은 회사명(없으면 "")
  emails: { address: string; domain: string; free: boolean }[];
  sites: string[]; // 회사 사이트로 보이는 도메인
  domainMismatch: boolean; // 회사 메일 도메인과 사이트 도메인이 다름
}

const strip = (d: string) => d.toLowerCase().replace(/^www\./, "").replace(/[.,)]+$/, "");
// 회사 기준 도메인: daon.com.vn, daon.co.kr처럼 국가 2단계 도메인은 세 칸까지 본다
const root = (d: string) => {
  const p = d.split(".");
  const n = p.length >= 3 && /^[a-z]{2}$/.test(p[p.length - 1]) && /^(co|com|net|org|ac|gov|edu|or|ne)$/.test(p[p.length - 2]) ? 3 : 2;
  return p.slice(-n).join(".");
};

const NAME_RE = [
  /(?:\(주\)|㈜|주식회사)\s*[가-힣A-Za-z0-9&]{2,20}/,
  /[가-힣A-Za-z0-9&]{2,20}\s*(?:\(주\)|㈜|주식회사)/,
  /\b[A-Z][A-Za-z0-9&.\-]*(?:\s+[A-Z][A-Za-z0-9&.\-]*){0,4},?\s+(?:Co\.,?\s?Ltd\.?|Company Limited|Ltd\.?|Limited|Inc\.?|LLC|Corp\.?|Corporation|Pte\.?\s?Ltd\.?|Sdn\.?\s?Bhd\.?|JSC|GmbH|PLC)/,
];

export function findClues(text: string, aiCompany?: string | null): CompanyClues {
  let name = (aiCompany ?? "").trim();
  if (/^(없음|미상|불명|unknown|n\/a|-)$/i.test(name)) name = "";
  if (!name) {
    for (const re of NAME_RE) {
      const m = text.match(re);
      if (m) {
        name = m[0].trim();
        break;
      }
    }
  }
  const emails: CompanyClues["emails"] = [];
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g)) {
    const domain = strip(m[1]);
    if (!emails.some((e) => e.address === m[0])) emails.push({ address: m[0], domain, free: FREE_MAIL.has(domain) });
  }
  const sites: string[] = [];
  for (const m of text.matchAll(/\b(?:https?:\/\/)?((?:[A-Za-z0-9-]+\.)+(?:com|net|org|co|io|vn|kh|th|ph|my|id|jp|cn|sg|hk|tw|kr|la|mm|ae|uk|us|au|de)(?:\.[a-z]{2})?)\b(?![@A-Za-z0-9])/gi)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 1), m.index ?? 0);
    if (before === "@") continue;
    const d = strip(m[1]);
    if (NOT_COMPANY_SITE.test(d) || FREE_MAIL.has(d) || emails.some((e) => e.domain === d)) continue;
    if (!sites.includes(d)) sites.push(d);
  }
  const corp = emails.filter((e) => !e.free).map((e) => root(e.domain));
  const domainMismatch = corp.length > 0 && sites.length > 0 && !sites.some((s) => corp.includes(root(s)));
  return { name, emails, sites: sites.slice(0, 3), domainMismatch };
}

// 나라별 공식 법인(사업자) 등록부. search가 있으면 회사명을 넣은 검색 주소로 바로 연다.
const REGISTRY: Record<string, { name: string; url: string; search?: (q: string) => string }> = {
  KH: { name: "캄보디아 상무부 사업자등록 조회", url: "https://www.businessregistration.moc.gov.kh/" },
  VN: { name: "베트남 국가 사업자등록 포털", url: "https://dangkykinhdoanh.gov.vn/" },
  TH: { name: "태국 상무부(DBD) 기업 조회", url: "https://datawarehouse.dbd.go.th/" },
  PH: { name: "필리핀 증권거래위원회(SEC) 조회", url: "https://www.sec.gov.ph/" },
  MY: { name: "말레이시아 회사위원회(SSM) 조회", url: "https://www.ssm.com.my/" },
  ID: { name: "인도네시아 법무인권부(AHU) 법인 조회", url: "https://ahu.go.id/" },
  MM: { name: "미얀마 투자기업청(DICA) 회사 조회", url: "https://www.myco.dica.gov.mm/" },
  JP: { name: "일본 국세청 법인번호 공표사이트", url: "https://www.houjin-bangou.nta.go.jp/" },
  CN: { name: "중국 국가기업신용정보공시시스템", url: "https://www.gsxt.gov.cn/" },
  TW: { name: "대만 상업등기 조회", url: "https://findbiz.nat.gov.tw/" },
  HK: { name: "홍콩 회사등기처 조회", url: "https://www.e-services.cr.gov.hk/" },
  SG: { name: "싱가포르 ACRA Bizfile 조회", url: "https://www.bizfile.gov.sg/" },
  AU: { name: "호주 사업자번호(ABN) 조회", url: "https://abr.business.gov.au/", search: (q) => `https://abr.business.gov.au/Search/ResultsActive?SearchText=${encodeURIComponent(q)}` },
  GB: {
    name: "영국 Companies House 조회",
    url: "https://find-and-update.company-information.service.gov.uk/",
    search: (q) => `https://find-and-update.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(q)}`,
  },
};

export interface CheckLink {
  key: string;
  title: string;
  desc: string;
  href: string;
  needsName: boolean;
  copyName?: boolean; // 등록부 첫 화면으로 가므로 회사명을 복사해 붙여 넣어야 함
}

export function companyLinks(name: string, iso2: string | null | undefined, sites: string[]): CheckLink[] {
  const q = name.trim();
  const iso = (iso2 ?? "").toUpperCase();
  const reg = REGISTRY[iso];
  const g = (s: string) => `https://www.google.com/search?q=${encodeURIComponent(s)}`;
  const links: CheckLink[] = [];
  if (reg) {
    links.push({
      key: "registry",
      title: reg.name,
      desc: reg.search ? "근무 국가의 공식 등록부에서 회사명으로 바로 검색해요" : "근무 국가의 공식 등록부예요. 회사명을 붙여 넣어 검색하세요",
      href: reg.search && q ? reg.search(q) : reg.url,
      needsName: false,
      copyName: !reg.search,
    });
  }
  links.push(
    {
      key: "oc",
      title: "OpenCorporates 세계 법인 검색",
      desc: "140여 개 나라의 법인 등록 정보를 한 번에 찾아봐요",
      href: `https://opencorporates.com/companies?q=${encodeURIComponent(q)}`,
      needsName: true,
    },
    {
      key: "scam",
      title: "‘회사명 + 사기’ 검색",
      desc: "피해 글이나 경고 기사가 있는지 확인해요",
      href: g(`"${q}" 사기 OR scam OR 감금`),
      needsName: true,
    },
    {
      key: "map",
      title: "지도에서 사무실 찾기",
      desc: "주소가 실제 사무실인지, 빈 건물·주택가는 아닌지 봐요",
      href: `https://www.google.com/maps/search/${encodeURIComponent(q)}`,
      needsName: true,
    },
    {
      key: "li",
      title: "링크드인 회사 페이지",
      desc: "실제 직원이 있는지, 언제부터 활동했는지 봐요",
      href: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(q)}`,
      needsName: true,
    },
  );
  for (const s of sites.slice(0, 1)) {
    links.push({
      key: "whois",
      title: `${s} 도메인 만든 날짜`,
      desc: "회사 사이트가 최근 몇 달 안에 만들어졌다면 의심해 보세요",
      href: `https://who.is/whois/${encodeURIComponent(s)}`,
      needsName: false,
    });
  }
  links.push({
    key: "kotra",
    title: "KOTRA 해외취업 헬프데스크",
    desc: "월드잡플러스에서 해외 구인기업 정보 확인을 요청할 수 있어요",
    href: "https://www.worldjob.or.kr",
    needsName: false,
  });
  return links;
}
