// 위험 신호 정의. 출처: 정책브리핑(2025.11) 해외취업 사기 예방 수칙, 보도된 실제 구인글 문구(머니투데이·뉴시스 2025.10),
// 법률 플랫폼의 경고 신호 정리. 평가 데이터셋을 보기 전에 공개 가이드만으로 작성함.

export type Severity = "critical" | "high" | "medium" | "low";

export interface SignalDef {
  id: string;
  label: string; // 사용자에게 보이는 이름
  why: string; // 왜 위험한지 (쉬운 말)
  check: string; // 어떻게 확인하는지
  severity: Severity;
  weight: number;
  patterns: RegExp[];
}

export const SIGNALS: SignalDef[] = [
  {
    id: "account_phone",
    label: "통장·휴대폰 명의 요구",
    why: "본인 명의 계좌나 휴대폰은 보이스피싱·자금세탁에 쓰입니다. 넘기거나 대신 쓰게 하면 본인이 처벌받을 수 있습니다.",
    check: "어떤 이유로도 통장·유심·휴대폰을 개설해 넘기지 마세요.",
    severity: "critical",
    weight: 5,
    patterns: [
      /통장\s*(삽니다|매입|구매|구입|대여|개설)/,
      /계좌\s*(매입|대여|삽니다|\d+\s*개\s*개설|.{0,6}개설해)/,
      /(본인|개인)\s*명의\s*계좌/,
      /계좌로\s*(받아|입금받아|받아서)/,
      /입출금\s*대행/,
      /대포폰/,
      /(유심|휴대폰|핸드폰)[^.\n]{0,12}개통/,
      /(1|한)\s*계좌당/,
    ],
  },
  {
    id: "safety_claim",
    label: "'안전하다'고 먼저 강조",
    why: "정상 회사는 '범죄 아님', '신변 안전 보장'을 굳이 쓰지 않습니다. 의심을 미리 막으려는 문구입니다.",
    check: "회사가 실제로 등록된 법인인지 KOTRA 해외취업 헬프데스크 '기업정보 확인'으로 점검하세요.",
    severity: "critical",
    weight: 4,
    patterns: [
      /신변\s*안전/,
      /안전\s*(100|보장)/,
      /범죄\s*(조직)?\s*(이\s*)?아(님|니고|닙니다)/,
      /불법\s*아(님|니)/,
      /합법\s*(회사|업체)/,
      /걱정\s*안\s*하셔도/,
      /안전한\s*곳/,
      /신분\s*노출\s*없/,
    ],
  },
  {
    id: "visa_bypass",
    label: "정식 취업비자 없이 근무",
    why: "관광·무비자로 일하면 현지에서 불법체류자가 되어 오히려 처벌받고, 회사에 약점을 잡히게 됩니다.",
    check: "출국 전에 취업비자(노동허가)가 발급되는지, 서류를 직접 확인하세요.",
    severity: "critical",
    weight: 4,
    patterns: [
      /관광\s*비자로/,
      /무비자로/,
      /비자\s*(없이|필요\s*없)/,
      /취업\s*비자\s*필요\s*없/,
      /비자는\s*(현지|입국\s*후)/,
      /입국\s*후\s*(회사가\s*)?(비자|처리)/,
      /enter\s+as\s+tourist/i,
      /handle\s+after\s+arrival/i,
      /학생\s*비자로\s*진행/,
      /단기\s*방문으로\s*입국/,
      /국경\s*왕복/,
      /서류\s*(절차\s*)?없이/,
    ],
  },
  {
    id: "upfront_fee",
    label: "출국 전 돈을 먼저 요구",
    why: "알선비·비자비·계약금을 먼저 받는 것은 대표적인 사기 수법이며, 항공권을 빚으로 떠안기는 경우도 있습니다.",
    check: "정상 채용은 지원자에게 돈을 먼저 받지 않습니다. 송금 요구가 있으면 진행을 멈추세요.",
    severity: "critical",
    weight: 4,
    patterns: [
      /선\s*입금/,
      /송금\s*필요/,
      /계약금\s*명목/,
      /발급비\s*[\d,]+\s*만?원?\s*(선)?입금/,
      /선지급\s*후[^.\n]{0,15}차감/,
    ],
  },
  {
    id: "messenger_only",
    label: "텔레그램 등 메신저로만 연락",
    why: "기록이 남지 않고 추적이 어려운 메신저로만 연락하게 하는 것은 정체를 숨기려는 신호입니다.",
    check: "회사 공식 이메일·대표번호·홈페이지가 있는지 확인하고, 그쪽으로 다시 연락해 보세요.",
    severity: "high",
    weight: 3,
    patterns: [
      /텔레그램/,
      /텔레\s*(DM|상담|문의|번호|@)/,
      /텔레\s*@/,
      /(?<![\w.])@[A-Za-z0-9_]{4,}(?![A-Za-z0-9_.-]*\.(com|kr|net|org))/,
      /오픈\s*(채팅|카톡)/,
      /(카톡|카카오톡|라인|위챗)\s*(ID|아이디|상담|으로|:)/i,
      /위챗/,
      /왓츠앱/,
      /Telegram/i,
    ],
  },
  {
    id: "hidden_info",
    label: "회사·근무지 정보를 숨김",
    why: "회사명, 주소, 실제 근무지를 계약 후나 도착 후에 알려준다는 것은 확인을 피하려는 것입니다.",
    check: "회사명·주소·사업자(법인) 정보를 출국 전에 받고, 지도와 공식 등록 정보로 대조하세요.",
    severity: "high",
    weight: 3,
    patterns: [
      /회사명\s*(은\s*)?(비공개|채용\s*확정\s*시)/,
      /(계약|채용\s*확정|입사)\s*(후|시)\s*(공개|안내)/,
      /보안상/,
      /비공개/,
      /도착하면[^.\n]{0,20}(알려|안내)/,
      /현지에서\s*(설명|안내)/,
      /홈페이지\s*(없음|는\s*리뉴얼)/,
      /공개\s*불가/,
      /근무지는\s*(교육\s*후|추후)\s*안내/,
      /근무지[^.\n]{0,10}(변경될\s*수|이동\s*가능|협의)/,
      /계약서는\s*(현지|도착)/,
    ],
  },
  {
    id: "passport",
    label: "여권을 맡기거나 먼저 요구",
    why: "여권을 회사가 보관하면 귀국할 수 없게 됩니다. 감금 피해의 공통 과정입니다.",
    check: "여권은 어떤 경우에도 본인이 보관해야 합니다.",
    severity: "high",
    weight: 3,
    patterns: [/여권[^.\n]{0,15}보관/, /여권\s*사본\s*먼저/, /여권만\s*(있으면|준비)/],
  },
  {
    id: "confinement",
    label: "외출 제한·단지 내 생활",
    why: "숙소와 일터가 한 단지에 있고 외출이 제한되면 감금 상황으로 이어질 수 있습니다.",
    check: "근무지와 숙소의 정확한 주소를 받고, 가족에게 공유하세요.",
    severity: "high",
    weight: 3,
    patterns: [/외출[^.\n]{0,10}(필요\s*없|회사\s*규정|제한)/, /단지\s*내/],
  },
  {
    id: "debt_target",
    label: "빚·신용불량을 노림",
    why: "돈이 급한 사람을 노려 판단을 흐리게 하는 문구입니다.",
    check: "급한 사정을 이용하는 공고일수록 한 번 더 검색하고 주변에 물어보세요.",
    severity: "high",
    weight: 3,
    patterns: [/신용\s*불량/, /빚\s*(있|다\s*갚)/, /대출\s*막/, /돈\s*급한/],
  },
  {
    id: "risk_area",
    label: "감금 피해가 보고된 지역",
    why: "캄보디아·미얀마·라오스 국경 지대 등은 한국인 취업사기·감금 피해가 집중된 곳입니다.",
    check: "외교부 해외안전여행(0404.go.kr)에서 해당 지역의 여행경보 단계를 확인하세요.",
    severity: "medium",
    weight: 2,
    patterns: [
      /시아누크빌|Sihanoukville|바벳|포이펫|보코|미야와디|골든\s*트라이앵글|몽라/i,
      /캄보디아|프놈펜|미얀마|국경\s*(지역|인근|쪽)/,
    ],
  },
  {
    id: "urgency",
    label: "서두르게 만듦",
    why: "확인할 시간을 주지 않으려고 '선착순', '바로 출국'을 강조합니다.",
    check: "정상 채용은 서류·면접·비자 절차에 몇 주 이상 걸립니다.",
    severity: "medium",
    weight: 2,
    patterns: [
      /급구/,
      /긴급/,
      /선착순/,
      /(바로|즉시|빠른)\s*출국/,
      /\d+\s*(일|주)\s*내\s*출국/,
      /이번\s*주[^.\n]{0,10}(출국|마감)/,
      /오늘\s*마감/,
      /바로\s*(일\s*)?시작/,
      /Start next week/i,
    ],
  },
  {
    id: "vague_work",
    label: "업무가 모호하거나 쉬워 보임",
    why: "'채팅만', '단순 업무', 'TM' 같은 말 뒤에 피싱·불법 도박·투자사기 업무가 숨어 있는 경우가 많습니다.",
    check: "하루 업무를 구체적으로 묻고, 답이 모호하면 진행하지 마세요.",
    severity: "medium",
    weight: 2,
    patterns: [
      /채팅(만|으로)/,
      /단순\s*업무/,
      /\bTM\b|텔레마케/,
      /리딩방/,
      /베팅/,
      /카지노/,
      /게임\s*운영/,
      /말만\s*잘하면/,
      /업무는\s*현지에서/,
    ],
  },
  {
    id: "no_experience",
    label: "경력·자격 없이 누구나",
    why: "그 자체로는 흔한 조건이지만, 높은 급여와 함께 나오면 위험 신호입니다.",
    check: "급여가 경력·자격 요건에 비해 지나치게 높은지 비교해 보세요.",
    severity: "low",
    weight: 1,
    patterns: [
      /경력\s*(무관|X|x|필요\s*없)/,
      /학력\s*(무관|X)/,
      /나이\s*X/,
      /초보/,
      /누구나/,
      /외모\s*무관/,
      /타자만/,
      /영어\s*몰라도/,
      /no experience/i,
    ],
  },
];

// 위험을 낮추는 신호 (정상 채용 절차의 흔적)
export interface MitigatorDef {
  id: string;
  label: string;
  weight: number; // 음수
  patterns: RegExp[];
}

export const MITIGATORS: MitigatorDef[] = [
  {
    id: "official_channel",
    label: "공식 채용 경로",
    weight: -2,
    patterns: [
      /월드잡/,
      /공식\s*(채용|홈페이지)/,
      /채용\s*(페이지|포털|사이트|홈페이지)/,
      /Careers/i,
      /LinkedIn/i,
      /Job Bank/i,
      /[\w.-]+@[\w-]+\.(co\.kr|com|kr|org|net)/,
      /본사\s*(인사|면접)/,
    ],
  },
  {
    id: "proper_visa",
    label: "정식 취업비자·허가",
    weight: -2,
    patterns: [
      /취업\s*비자[^.\n]{0,8}(회사|기관|병원|학교)\s*(지원|처리|진행)/,
      /(워크\s*퍼밋|노동\s*허가|Work Permit|취업\s*허가|체류\s*허가)/i,
      /Employment (Pass|visa)|S Pass|H-1B|LMIA|블루카드|KITAS|Skilled Worker|특정기능|9G|J-1|Non-B|482\s*비자|고도전문직/,
    ],
  },
  {
    id: "requirements",
    label: "구체적 자격 요건",
    weight: -1,
    patterns: [/경력\s*\d+\s*년/, /자격증|면허|학위|IELTS|N2|HSK|전공|Certificate/],
  },
  {
    id: "process",
    label: "정상 채용 절차",
    weight: -1,
    patterns: [/면접\s*\d+\s*회|코딩\s*테스트|과제\s*전형|레퍼런스|신체검사|오퍼\s*레터|의료검진|시범수업/],
  },
];
