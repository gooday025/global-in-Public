import results from "../../../eval/results.json";
import { SIGNALS } from "@/lib/signals";

type M = { tp: number; fp: number; fn: number; tn: number; precision: number; recall: number; f1: number; accuracy: number } | null;
type SetR = { n: number; rules: M; llm: M; hybrid: M };

const SEV = { critical: "매우 높음", high: "높음", medium: "보통", low: "낮음" } as const;
const pct = (x?: number) => (x == null ? "–" : `${Math.round(x * 100)}%`);

export default function Page() {
  const r = results as unknown as Record<string, SetR> & { model: string; latency_ms: { median: number; p90: number } | null; quote_check: { total: number; dropped: number } };
  const sets = Object.entries(r).filter(([k]) => k.startsWith("A_") || k.startsWith("B_")) as [string, SetR][];
  return (
    <section className="page">
      <h1>글로벌-인은 이렇게 판단합니다</h1>
      <p className="lede">
        규칙은 정해진 위험 문구를 빠짐없이 잡고, AI는 바꿔 쓴 표현과 문맥을 읽습니다. 두 결과를 합쳐 점수를 내고, AI가 든 근거가 원문에 실제로 있는지 다시 확인합니다.
      </p>

      <h2>판단 순서</h2>
      <ol>
        <li>생성형 AI({r.model})가 공고에서 회사·국가·급여·연락 방법·비자 조건을 뽑고, 위험 신호마다 원문 구절을 근거로 붙입니다. 캡처 이미지는 글자를 먼저 옮겨 적습니다.</li>
        <li>규칙 엔진이 공개 가이드(정책브리핑 해외취업 사기 예방 수칙, 보도된 실제 구인 문구)에서 정리한 {SIGNALS.length}가지 위험 신호와 급여 환산(월 원화)을 검사합니다.</li>
        <li>AI가 든 근거가 원문에 없으면 버립니다. 지어낸 근거가 화면에 나오지 않게 하기 위해서입니다.</li>
        <li>최종 점수 = 규칙 40% + AI 60%. 통장·휴대폰 명의 요구, 비자 우회, 선입금 요구 같은 치명적 신호가 확인되면 점수를 '위험 높음' 이상으로 올립니다.</li>
        <li>근무 국가는 외교부 여행경보와 연결해 함께 보여 줍니다.</li>
      </ol>

      <h2>성능 평가</h2>
      <p>
        평가셋 A(100건)는 보도된 사기 공고 문구 패턴과 정상 해외취업 공고 형식을 참고해 만든 합성 공고입니다. 평가셋 B(40건)는 키워드를 피해 바꿔 쓴 사기 공고 20건과, 메신저 연락·동남아 근무·경력 무관처럼 위험해 보이지만 정상인 공고 20건입니다. 위험 점수 50 이상을 '위험'으로 판정했습니다.
      </p>
      <div className="scroll">
        <table className="data">
          <thead>
            <tr>
              <th>평가셋</th>
              <th>방식</th>
              <th>정밀도</th>
              <th>재현율</th>
              <th>F1</th>
              <th>정확도</th>
            </tr>
          </thead>
          <tbody>
            {sets.flatMap(([name, s]) =>
              (["rules", "llm", "hybrid"] as const).map((k) => (
                <tr key={name + k}>
                  <td>{k === "rules" ? name.replace(/^[AB]_/, (m) => m[0] + " · ") : ""}</td>
                  <td>{k === "rules" ? "규칙만" : k === "llm" ? "AI만" : "규칙+AI (서비스)"}</td>
                  <td className="num">{pct(s[k]?.precision)}</td>
                  <td className="num">{pct(s[k]?.recall)}</td>
                  <td className="num">{pct(s[k]?.f1)}</td>
                  <td className="num">{pct(s[k]?.accuracy)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      {r.latency_ms ? (
        <p>
          AI 응답 시간 중앙값 {(r.latency_ms.median / 1000).toFixed(1)}초. AI가 제시한 근거 {r.quote_check.total}개 중 원문에서 찾지 못해 버린 근거 {r.quote_check.dropped}개.
        </p>
      ) : null}
      <p>
        한계: 평가셋은 팀이 직접 만든 합성 데이터라 실제 공고보다 단순할 수 있습니다. 실제 공고와 피해 사례로 검증하는 것이 다음 단계입니다. 결과는 참고 정보이며 사기 여부를 확정하지 않습니다.
      </p>

      <h2>규칙이 보는 위험 신호</h2>
      <div className="scroll">
        <table className="data">
          <thead>
            <tr>
              <th>신호</th>
              <th>위험도</th>
              <th>왜 위험한가</th>
            </tr>
          </thead>
          <tbody>
            {SIGNALS.map((s) => (
              <tr key={s.id}>
                <td>{s.label}</td>
                <td>{SEV[s.severity]}</td>
                <td>{s.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>개인정보</h2>
      <p>입력한 공고와 이미지는 분석에만 쓰고 저장하지 않습니다. 이름·전화번호는 지우고 넣어도 결과가 같습니다.</p>
    </section>
  );
}
