"use client";
import { useRef, useState } from "react";
import type { Analysis } from "@/lib/analyze";

const EXAMPLES = [
  {
    label: "예시: 고수익 동남아 공고",
    text: "[프놈펜 본사 채용] 사무실 확장으로 한국인 상담직 충원합니다. 경력 무관, 초보도 월 1200만원 가능! 숙식·항공권 전액 회사 부담. 신변 안전 보장되는 합법 회사입니다. 문의는 텔레그램 @kh_office_job",
  },
  {
    label: "예시: 바꿔 쓴 표현",
    text: "해외 지사 고객관리 직원 구해요. 월 천 단위 가능하고 일은 컴퓨터로 하는 쉬운 일이에요. 비행기표는 회사에서. 연락은 ㅌㄹㄱㄹ 아이디 프로필 참고, 문자는 안 받아요.",
  },
  {
    label: "예시: 정상 공고",
    text: "베트남 하노이 소재 (주)다온전자 현지법인 품질관리 엔지니어 채용. 연봉 5,200만원(세전), 주택수당 별도. 자격: 전자·기계 전공, 품질 경력 3년 이상, 영어 중급. 노동허가 및 비자 회사 처리. 지원: 회사 채용 홈페이지, 서류 → 화상면접 2회.",
  },
];

const STAMP = {
  high: { word: "위험 높음", sub: "지원 보류 권고", head: "지원하거나 출국하기 전에 멈추고 확인하세요" },
  caution: { word: "확인 필요", sub: "추가 확인", head: "몇 가지는 직접 확인해야 합니다" },
  low: { word: "신호 적음", sub: "그래도 확인", head: "뚜렷한 위험 신호는 적습니다" },
} as const;

const SRC = { rule: "규칙", llm: "AI", both: "규칙+AI" } as const;

type Span = { start: number; end: number; kind: "flag" | "critical" | "good"; n?: number };

function buildSpans(a: Analysis): Span[] {
  const spans: Span[] = [];
  a.signals.forEach((s, i) => {
    for (const e of s.evidence) spans.push({ start: e.start, end: e.end, kind: s.severity === "critical" ? "critical" : "flag", n: i + 1 });
  });
  for (const m of a.mitigators) for (const e of m.evidence) spans.push({ start: e.start, end: e.end, kind: "good" });
  spans.sort((x, y) => x.start - y.start || (x.kind === "good" ? 1 : -1));
  const out: Span[] = [];
  for (const s of spans) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) continue;
    out.push(s);
  }
  return out;
}

function Annotated({ a }: { a: Analysis }) {
  const spans = buildSpans(a);
  const parts: React.ReactNode[] = [];
  let pos = 0;
  spans.forEach((s, i) => {
    if (s.start > pos) parts.push(a.text.slice(pos, s.start));
    parts.push(
      <mark key={i} className={`flag ${s.kind === "flag" ? "" : s.kind}`}>
        {a.text.slice(s.start, s.end)}
        {s.n ? <sup>{s.n}</sup> : null}
      </mark>,
    );
    pos = s.end;
  });
  if (pos < a.text.length) parts.push(a.text.slice(pos));
  return <p className="doc-body">{parts}</p>;
}

async function fileToBase64(f: File): Promise<string> {
  const buf = await f.arrayBuffer();
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function Checker() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Analysis | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function run(t = text) {
    setErr("");
    setBusy(true);
    setRes(null);
    try {
      const body: Record<string, unknown> = { text: t };
      if (file) body.image = { data: await fileToBase64(file), mediaType: file.type };
      const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "분석하지 못했습니다. 잠시 후 다시 시도하세요.");
      setRes(j);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "분석하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const st = res ? STAMP[res.level] : null;

  return (
    <>
      <div className="inspect">
        <label htmlFor="ad" className="sr-only">공고 글</label>
        <textarea
          id="ad"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="구인 공고, 메신저로 받은 제안, 지인이 보낸 글을 그대로 붙여넣으세요."
          maxLength={4000}
        />
        <div className="inspect-bar">
          <div className="chips">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                className="chip"
                type="button"
                onClick={() => {
                  setText(ex.text);
                  setFile(null);
                  run(ex.text);
                }}
              >
                {ex.label}
              </button>
            ))}
          </div>
          <label className="file">
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <span>{file ? `캡처: ${file.name}` : "캡처 이미지 올리기"}</span>
          </label>
          <button className="btn" type="button" disabled={busy || (!text.trim() && !file)} onClick={() => run()}>
            {busy ? "읽는 중…" : "공고 확인하기"}
          </button>
        </div>
        {err ? <p className="err" role="alert">{err}</p> : null}
      </div>
      <p className="hint">예시를 누르면 바로 결과를 볼 수 있습니다. 개인정보(이름·전화번호)는 지우고 넣어도 결과에 영향이 없습니다.</p>

      {res && st ? (
        <div className="result" ref={resultRef} aria-live="polite">
          <div className="doc">
            <p className="doc-head">
              <span>입력한 공고</span>
              <span>표시 {res.signals.length}곳</span>
            </p>
            <Annotated a={res} />
          </div>

          <div className="panel">
            <div className="verdict">
              <div className={`stamp ${res.level} animate`} aria-hidden="true">
                <div>
                  {st.word}
                  <small>{st.sub}</small>
                </div>
              </div>
              <div>
                <h2>{st.head}</h2>
                <p>{res.summary}</p>
                <p className="meter">
                  위험 점수 {Math.round(res.score * 100)} / 100
                  {res.mode === "hybrid" ? ` · 규칙 ${Math.round(res.ruleScore * 100)} · AI ${Math.round((res.llmScore ?? 0) * 100)}` : " · AI 연결 없이 규칙만으로 판단"}
                </p>
              </div>
            </div>

            {res.mode === "rules-only" ? (
              <p className="travel warn" role="note">
                지금은 AI 연결 없이 규칙으로만 확인했습니다. 띄어쓰기·초성으로 바꿔 쓴 표현은 놓칠 수 있으니 잠시 후 다시 확인하세요.
              </p>
            ) : null}

            {res.signals.length ? (
              <>
                <h3>찾은 위험 신호</h3>
                <ol className="signals">
                  {res.signals.map((s, i) => (
                    <li key={s.id + i} className={`sig ${s.severity}`}>
                      <div className="sig-top">
                        <span className="sig-no">{i + 1}</span>
                        <span className="sig-label">{s.label}</span>
                        <span className="src" title="이 신호를 찾은 방법">{SRC[s.source]}</span>
                      </div>
                      <q>{s.evidence[0]?.text}</q>
                      <p>{s.note && s.source !== "rule" ? s.note : s.why}</p>
                      <p className="check">확인: {s.check}</p>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}

            {res.mitigators.length ? (
              <>
                <h3>정상 채용의 흔적</h3>
                <ul className="good-list">
                  {res.mitigators.map((m, i) => (
                    <li key={i}>
                      {m.label}: “{m.evidence[0]?.text}”
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {res.travel ? (
              <>
                <h3>근무 국가 여행경보</h3>
                <div className={`travel ${res.travel.level && res.travel.level >= 3 ? "warn" : ""}`}>
                  {res.travel.source === "api" && res.travel.levelName ? (
                    <>
                      {res.travel.countryName}: <strong>{res.travel.levelName}</strong>
                      {res.travel.special ? " · 특별여행주의보" : ""}
                      {res.travel.regionNote ? <div>{res.travel.regionNote}</div> : null}
                    </>
                  ) : (
                    <>근무 국가의 지역별 경보 단계는 외교부 해외안전여행에서 확인하세요.</>
                  )}{" "}
                  <a href={res.travel.link} target="_blank" rel="noreferrer">해외안전여행 열기</a>
                </div>
              </>
            ) : null}

            <h3>지원 전에 회사에 물어보세요</h3>
            <ol className="asks">
              {res.questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>

            <h3>도움받을 곳</h3>
            <ul className="help">
              <li>
                <strong>이미 출국했거나 위험하다면</strong>
                외교부 영사안전콜센터 24시간 <a href="tel:+82232100404">+82-2-3210-0404</a>
              </li>
              <li>
                <strong>국내에서 피해·의심 신고</strong>
                경찰 <a href="tel:112">112</a>
              </li>
              <li>
                <strong>회사가 진짜인지 확인</strong>
                KOTRA 해외취업 헬프데스크의 기업정보 확인, 자문변호사 계약서 검토
              </li>
              <li>
                <strong>정상 공고와 비교</strong>
                <a href="https://www.worldjob.or.kr" target="_blank" rel="noreferrer">월드잡플러스</a> 해외취업 공식 플랫폼
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
