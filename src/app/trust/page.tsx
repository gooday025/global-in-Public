import type { Metadata } from "next";
import results from "../../../eval/results.json";
import { SIGNALS } from "@/lib/signals";
import { REFS, refsFor } from "@/lib/refs";

export const metadata: Metadata = {
  title: "글로벌-인을 믿어도 될까요? · 판단 근거와 정확도",
  description: "글로벌-인이 무엇을 근거로 위험을 판단하는지, 얼마나 정확한지, 무엇을 못 하는지 모두 공개합니다.",
};

type M = { tp: number; fp: number; fn: number; tn: number; precision: number; recall: number; f1: number; accuracy: number } | null;
type SetR = { n: number; rules: M; llm: M; hybrid: M };
const SEV = { critical: "치명적", high: "높음", medium: "보통", low: "낮음" } as const;
const pct = (x?: number | null) => (x == null ? "–" : `${Math.round(x * 100)}%`);

function Bar({ label, v, tone }: { label: string; v: number | null | undefined; tone: string }) {
  const p = Math.round((v ?? 0) * 100);
  return (
    <div className="bar">
      <span className="bar-label">{label}</span>
      <span className="bar-track">
        <span className={`bar-fill ${tone}`} style={{ width: `${Math.max(p, 1.5)}%` }} />
      </span>
      <b>{p}%</b>
    </div>
  );
}

export default function Page() {
  const r = results as unknown as Record<string, SetR> & { model: string; date: string; latency_ms: { median: number } | null; quote_check: { total: number; dropped: number } };
  const A = r["A_기본(100)"];
  const B = r["B_회피·경계(40)"];
  return (
    <article className="page trust">
      <p className="eyebrow">믿을 수 있나요?</p>
      <h1>글로벌-인이 위험하다고 말하는 이유를 모두 공개합니다.</h1>
      <p className="lede">어떤 근거로 판단하는지, 직접 시험해 본 정확도는 어떤지, 무엇을 못 하는지 숨기지 않고 적었습니다. 결과를 그대로 믿기보다 아래 근거와 함께 판단해 주세요.</p>

      <ul className="kpis">
        <li>
          <b>{SIGNALS.length}가지</b>
          <span>정부 예방 수칙·보도에서 뽑은 위험 신호</span>
        </li>
        <li>
          <b>
            {r.quote_check.total - r.quote_check.dropped}/{r.quote_check.total}
          </b>
          <span>원문에서 확인된 AI 근거 (나머지는 화면에서 제외)</span>
        </li>
        <li>
          <b>140건</b>
          <span>직접 만든 평가 공고로 측정한 정확도 공개</span>
        </li>
        <li>
          <b>0건</b>
          <span>서버에 저장하는 공고 글·이미지</span>
        </li>
      </ul>

      <section>
        <h2>1. 이렇게 판단해요</h2>
        <ol className="flow">
          <li>
            <b>공고 받기</b>
            <span>글·링크·캡처. 캡처는 AI가 글자를 먼저 옮겨 적어요.</span>
          </li>
          <li>
            <b>규칙 대조</b>
            <span>{SIGNALS.length}가지 위험 문구, 급여를 월 원화로 환산</span>
          </li>
          <li>
            <b>AI 읽기</b>
            <span>바꿔 쓴 표현·빠진 정보 찾기, 근거 문장 인용</span>
          </li>
          <li>
            <b>근거 검증</b>
            <span>AI 인용이 원문에 없으면 버림</span>
          </li>
          <li>
            <b>점수·결론</b>
            <span>규칙 40% + AI 60%. 치명 신호·확인된 AI 근거가 있으면 하한 적용</span>
          </li>
        </ol>
        <p className="note">
          위험 점수 60 이상은 ‘위험 높음’, 30~59는 ‘확인 필요’, 30 미만은 ‘위험 신호 적음’으로 보여 줍니다. 통장·휴대폰 명의 요구, 취업비자 우회, 선입금 요구처럼 피해로 바로 이어지는 신호가 원문에서 확인되면 다른 점수와 관계없이 70점 이상으로 올립니다. 또 규칙은 말을 바꿔 쓴 표현(‘ㅌㄹㄱㄹ’ 등)을 잡지 못하므로, AI가 원문에서 확인된 근거를 2개 이상 들면 규칙 점수가 0이어도 AI 점수의 85%를 하한으로 씁니다.
        </p>
      </section>

      <section>
        <h2>2. 무엇을 근거로 위험하다고 하나요</h2>
        <p>위험 신호는 평가 데이터를 보기 전에 공개 자료만으로 정했습니다. 신호마다 출처를 붙였고, 공식 문서가 아니라 팀이 보도 사례를 정리한 것은 그렇다고 밝혔습니다.</p>
        <div className="scroll">
          <table className="data signals">
            <thead>
              <tr>
                <th>위험 신호</th>
                <th>위험도</th>
                <th>왜 위험한가</th>
                <th>근거</th>
              </tr>
            </thead>
            <tbody>
              {SIGNALS.map((s) => (
                <tr key={s.id}>
                  <td className="nowrap">
                    <b>{s.label}</b>
                  </td>
                  <td>
                    <span className={`sev ${s.severity}`}>{SEV[s.severity]}</span>
                  </td>
                  <td className="why">{s.why}</td>
                  <td className="refs">
                    {refsFor(s.id).map((x) =>
                      x.url ? (
                        <a key={x.key} href={x.url} target="_blank" rel="noreferrer">
                          {x.name}
                        </a>
                      ) : (
                        <span key={x.key}>{x.name}</span>
                      ),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="ref-list">
          {Object.values(REFS).map((x) => (
            <li key={x.key}>
              <b>{x.name}</b> — {x.org}, 「{x.title}」, {x.date}
              {x.url ? (
                <>
                  {" "}
                  <a href={x.url} target="_blank" rel="noreferrer">
                    원문
                  </a>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>3. 얼마나 정확한가요</h2>
        <p>
          보도된 사기 문구 패턴과 정상 해외취업 공고 형식을 참고해 팀이 직접 만든 공고 140건으로 시험했습니다. 실제 배포 서버에서 AI({r.model})를 호출해 {r.date}에 측정했습니다.
        </p>
        <div className="eval-grid">
          <div className="card">
            <h3>말을 바꿔 쓴 사기 공고 20건을 몇 건 잡았나</h3>
            <p className="muted">‘텔레그램’ 대신 ‘ㅌㄹㄱㄹ’, ‘월 1000만원’ 대신 ‘월 천 단위’처럼 단속을 피한 표현</p>
            <Bar label="규칙만" v={B.rules?.recall} tone="weak" />
            <Bar label="규칙 + AI (서비스)" v={B.hybrid?.recall} tone="strong" />
          </div>
          <div className="card">
            <h3>위험해 보이는 정상 공고 20건을 잘못 경고했나</h3>
            <p className="muted">메신저 연락·동남아 근무·경력 무관이지만 실제로는 정상인 공고</p>
            <Bar label="잘못 경고 (규칙만)" v={B.rules ? B.rules.fp / 20 : null} tone="weak" />
            <Bar label="잘못 경고 (규칙 + AI)" v={B.hybrid ? B.hybrid.fp / 20 : null} tone="strong" />
          </div>
        </div>
        <div className="scroll">
          <table className="data compact">
            <thead>
              <tr>
                <th>평가셋</th>
                <th>방식</th>
                <th className="num">정밀도</th>
                <th className="num">재현율</th>
                <th className="num">F1</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["기본 100건 (사기 50·정상 50)", A],
                  ["회피·경계 40건 (사기 20·정상 20)", B],
                ] as const
              ).flatMap(([name, s]) =>
                (["rules", "llm", "hybrid"] as const).map((k) => (
                  <tr key={name + k} className={k === "hybrid" ? "hi" : ""}>
                    <td>{k === "rules" ? name : ""}</td>
                    <td>{k === "rules" ? "규칙만" : k === "llm" ? "AI만" : "규칙 + AI (서비스)"}</td>
                    <td className="num">{pct(s[k]?.precision)}</td>
                    <td className="num">{pct(s[k]?.recall)}</td>
                    <td className="num">{pct(s[k]?.f1)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
        <div className="caution-box">
          <b>이 숫자를 그대로 믿으면 안 되는 이유</b>
          <p>
            평가 공고는 팀이 직접 만든 합성 데이터라 실제 공고보다 단순할 수 있습니다. 100%는 이 140건에서의 결과일 뿐, 실제 공고에서는 정상 공고를 위험하다고 하거나 위험한 공고를 놓칠 수 있습니다. 실제 공고와 피해 사례로 다시 검증하는 것이 다음 단계입니다. AI 응답 시간 중앙값은{" "}
            {r.latency_ms ? `${(r.latency_ms.median / 1000).toFixed(1)}초` : "–"}였습니다.
          </p>
        </div>
      </section>

      <section>
        <h2>4. 이런 것은 못 해요</h2>
        <ul className="limits">
          <li>회사가 실제로 존재하는지, 법인 등록이 되어 있는지 직접 조회하지 않아요. KOTRA 해외취업 헬프데스크의 기업정보 확인을 이용하세요.</li>
          <li>공고에 없는 사실(면접 뒤 말이 바뀌는 경우 등)은 알 수 없어요. 대화가 이어지면 그 내용도 다시 넣어 확인하세요.</li>
          <li>로그인이 필요한 페이지나 텔레그램·카카오톡 대화방 링크는 읽지 못해요. 캡처를 올려 주세요.</li>
          <li>‘위험 신호 적음’은 안전하다는 보증이 아니에요. 계약서와 비자는 출국 전에 꼭 직접 확인하세요.</li>
        </ul>
      </section>

      <section>
        <h2>5. 넣은 내용은 어떻게 되나요</h2>
        <ul className="limits">
          <li>로그인이 없고, 넣은 글·링크·이미지를 글로벌-인 서버에 저장하지 않아요. 같은 글을 반복해서 확인할 때를 위해 글 내용 대신 해시값으로 1시간 동안 결과만 기억해요.</li>
          <li>AI 분석을 위해 공고 글(또는 캡처)이 Google Gemini API로 전송돼요. 이름·전화번호 같은 개인정보는 지우고 넣어도 결과가 같아요.</li>
          <li>‘결과 공유’ 링크에는 공고 글이 주소 안에 담겨요. 받은 사람이 링크를 열면 같은 공고를 다시 확인하는 방식이라, 서버에 기록이 남지 않아요.</li>
        </ul>
      </section>

      <section>
        <h2>6. 누가 만들었나요</h2>
        <p>
          DGIST 학생 차건희·정다혜가 해외 인턴·유학을 준비하며 정보를 찾기 어려웠던 경험에서 시작해, 2026 AI 라이프 솔루션 챌린지(산업통상부·한국산업기술기획평가원)에 출품한 시제품입니다. AI 라이프 아이디어 챌린지 수상 후보작 「글로벌-인(Global-In)」을 구현했습니다. 판단 규칙과 평가 코드는{" "}
          <a href="https://github.com/gooday025/global-in-Public" target="_blank" rel="noreferrer">
            GitHub
          </a>
          에 공개되어 있습니다.
        </p>
      </section>
    </article>
  );
}
