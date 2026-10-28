import { Checker } from "./checker";
import results from "../../eval/results.json";
import { REFS } from "@/lib/refs";

const PHRASES = [
  { q: "초보도 월 1000만원", why: "경력 없이 비현실적인 고수익을 약속해요", sev: "high" },
  { q: "신변 안전 보장, 합법 회사", why: "정상 회사는 굳이 안전하다고 먼저 말하지 않아요", sev: "critical" },
  { q: "문의는 텔레그램으로만", why: "기록이 남지 않는 메신저로 정체를 숨겨요", sev: "high" },
  { q: "비자 없이 바로 출국 가능", why: "현지에서 불법체류자가 되어 오히려 처벌받아요", sev: "critical" },
];

export default function Home() {
  const r = results as unknown as Record<string, { hybrid: { recall: number } | null; rules: { recall: number } }> & { quote_check: { total: number; dropped: number } };
  const B = r["B_회피·경계(40)"];
  return (
    <>
      <section className="hero">
        <p className="eyebrow">해외 취업·인턴·유학을 준비하는 청년을 위한 무료 공고 점검</p>
        <h1>
          그 해외 공고,
          <br />
          지원하기 전에 <span className="u">1분만</span> 확인하세요.
        </h1>
        <p className="lede">공고 글·링크·캡처를 넣으면 정부 예방 수칙과 실제 사기 보도에서 뽑은 위험 신호를 원문에 표시하고, 지원 전에 무엇을 확인해야 하는지 알려 드려요.</p>
      </section>

      <Checker />

      <ul className="trust-strip" aria-label="글로벌-인을 믿을 수 있는 이유">
        <li>
          <b>13가지 위험 신호</b>
          <span>정책브리핑 해외취업 사기 예방 수칙과 보도된 유인 문구 기반</span>
        </li>
        <li>
          <b>근거는 원문에서만</b>
          <span>AI가 든 근거를 원문과 다시 대조해, 없는 말은 보여 주지 않아요</span>
        </li>
        <li>
          <b>평가 결과 공개</b>
          <span>
            말을 바꿔 쓴 사기 공고: 규칙만 {Math.round((B?.rules.recall ?? 0) * 100)}% → AI 결합 {Math.round((B?.hybrid?.recall ?? 0) * 100)}% 탐지 (합성 데이터)
          </span>
        </li>
        <li>
          <b>저장하지 않아요</b>
          <span>로그인 없이 쓰고, 넣은 글과 이미지는 분석에만 써요</span>
        </li>
      </ul>
      <p className="trust-more">
        <a href="/trust">판단 근거·정확도·한계를 모두 보기 →</a>
      </p>

      <section className="band">
        <div className="band-stat">
          <p className="big">
            550<small>건</small>
          </p>
          <p>
            주캄보디아 한국대사관에 접수된 한국인 취업사기·감금 피해 (2024년~2025년 8월). 이 중 <b>100건</b>은 피해자 소재가 확인되지 않았어요.
          </p>
          <a className="src-link" href={REFS.news.url} target="_blank" rel="noreferrer">
            출처: {REFS.news.org}, {REFS.news.date}
          </a>
        </div>
        <div className="band-phrases">
          <h2>이런 문구가 보이면 멈추세요</h2>
          <ul>
            {PHRASES.map((p) => (
              <li key={p.q} className={p.sev}>
                <q>{p.q}</q>
                <span>{p.why}</span>
              </li>
            ))}
          </ul>
          <a className="src-link" href={REFS.policy.url} target="_blank" rel="noreferrer">
            참고: {REFS.policy.org} 「{REFS.policy.title}」
          </a>
        </div>
      </section>

      <section className="how">
        <h2>이렇게 확인해요</h2>
        <ol className="steps">
          <li>
            <span className="n">1</span>
            <b>정해진 위험 문구 대조</b>
            <p>통장 명의 요구, 비자 우회, 선입금, 메신저 연락 같은 13가지 신호와 급여를 월 원화로 환산해 비교해요.</p>
          </li>
          <li>
            <span className="n">2</span>
            <b>AI가 문맥 읽기</b>
            <p>초성·띄어쓰기로 바꿔 쓴 표현과 공고에 빠진 정보(회사명·비자)를 AI가 읽고, 근거 문장을 인용해요.</p>
          </li>
          <li>
            <span className="n">3</span>
            <b>근거 검증 후 결론</b>
            <p>AI가 든 근거가 원문에 있는지 다시 확인하고, 규칙 40% + AI 60%로 위험 점수를 내요.</p>
          </li>
        </ol>
      </section>

      <section className="next">
        <div>
          <h2>공고가 괜찮아 보인다면, 출국 준비도 미리</h2>
          <p>목적·국가·출국일을 넣으면 D-60부터 도착 후까지 할 일을 공식 기관 링크와 함께 정리해 드려요.</p>
        </div>
        <a className="btn primary" href="/prepare">
          출국 준비 체크리스트 만들기
        </a>
      </section>
    </>
  );
}
