"use client";
import { useEffect, useRef, useState } from "react";
import type { Analysis } from "@/lib/analyze";
import { refsFor, REFS, MITIGATOR_REF } from "@/lib/refs";

export const EXAMPLES = [
  {
    label: "고수익 동남아 공고",
    text: "[프놈펜 본사 채용] 사무실 확장으로 한국인 상담직 충원합니다. 경력 무관, 초보도 월 1200만원 가능! 숙식·항공권 전액 회사 부담. 신변 안전 보장되는 합법 회사입니다. 문의는 텔레그램 @kh_office_job",
  },
  {
    label: "말을 바꿔 쓴 공고",
    text: "해외 지사 고객관리 직원 구해요. 월 천 단위 가능하고 일은 컴퓨터로 하는 쉬운 일이에요. 비행기표는 회사에서. 연락은 ㅌㄹㄱㄹ 아이디 프로필 참고, 문자는 안 받아요.",
  },
  {
    label: "정상 해외 채용 공고",
    text: "베트남 하노이 소재 (주)다온전자 현지법인 품질관리 엔지니어 채용. 연봉 5,200만원(세전), 주택수당 별도. 자격: 전자·기계 전공, 품질 경력 3년 이상, 영어 중급. 노동허가 및 비자 회사 처리. 지원: 회사 채용 홈페이지, 서류 → 화상면접 2회.",
  },
];

type Mode = "text" | "url" | "image";

const LEVEL = {
  high: { word: "위험 높음", head: "지원하기 전에 멈추세요", tone: "stop", act: "아래 위험 신호를 하나씩 확인하기 전까지는 지원하거나 출국하지 마세요." },
  caution: { word: "확인 필요", head: "몇 가지를 직접 확인해야 해요", tone: "wait", act: "회사 정보와 비자 절차를 공식 경로로 확인한 뒤에 지원하세요." },
  low: { word: "위험 신호 적음", head: "뚜렷한 위험 신호는 적어요", tone: "go", act: "그래도 회사 정보와 계약서는 출국 전에 꼭 직접 확인하세요." },
} as const;

const SEV = { critical: "치명적", high: "높음", medium: "보통", low: "낮음" } as const;
const SRC = { rule: "규칙이 찾음", llm: "AI가 찾음", both: "규칙·AI 모두 찾음" } as const;

const MIT_ALL = [
  { id: "official_channel", label: "공식 채용 경로", hint: "회사 채용 홈페이지·월드잡플러스·회사 이메일" },
  { id: "proper_visa", label: "정식 취업비자·노동허가", hint: "회사가 취업비자를 처리한다는 내용" },
  { id: "requirements", label: "구체적 자격 요건", hint: "경력 연수·전공·자격증·어학 점수" },
  { id: "process", label: "정상 채용 절차", hint: "면접 횟수·과제·오퍼 레터" },
];

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
  const parts: React.ReactNode[] = [];
  let pos = 0;
  buildSpans(a).forEach((s, i) => {
    if (s.start > pos) parts.push(a.text.slice(pos, s.start));
    parts.push(
      <mark key={i} className={`hl ${s.kind}`}>
        {a.text.slice(s.start, s.end)}
        {s.n ? <sup>{s.n}</sup> : null}
      </mark>,
    );
    pos = s.end;
  });
  if (pos < a.text.length) parts.push(a.text.slice(pos));
  return <p className="doc-body">{parts}</p>;
}

function Meter({ score, tone }: { score: number; tone: string }) {
  const v = Math.round(score * 100);
  return (
    <div className="meter" role="img" aria-label={`위험 점수 100점 중 ${v}점`}>
      <div className="meter-track">
        <span className="z go" style={{ width: "30%" }} />
        <span className="z wait" style={{ width: "30%" }} />
        <span className="z stop" style={{ width: "40%" }} />
        <span className={`meter-pin ${tone}`} style={{ left: `${Math.min(98, Math.max(2, v))}%` }}>
          <b>{v}</b>
        </span>
      </div>
      <div className="meter-scale" aria-hidden="true">
        <span>0 낮음</span>
        <span style={{ left: "30%" }}>30 주의</span>
        <span style={{ left: "60%" }}>60 높음</span>
        <span className="end">100</span>
      </div>
    </div>
  );
}

const ICON = {
  doc: <path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  image: <path d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9.5a1 1 0 1 0 0-.01" />,
  share: <path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  warn: <path d="M12 4l9 16H3zM12 10v4M12 17v.01" />,
  copy: <path d="M9 9h11v11H9zM5 15V4h11" />,
};
export function Icon({ name, size = 18 }: { name: keyof typeof ICON; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON[name]}
    </svg>
  );
}

async function fileToBase64(f: File): Promise<string> {
  const bytes = new Uint8Array(await f.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const b64e = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64d = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

const STEPS = ["공고 글 읽는 중", "위험 신호 13가지 대조 중", "AI 근거를 원문과 맞춰 보는 중"];

export function Checker() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Analysis | null>(null);
  const [shared, setShared] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  async function run(payload?: { text?: string; url?: string }) {
    setErr("");
    setShared("");
    setBusy(true);
    setStep(0);
    setRes(null);
    const timer = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 1600);
    try {
      const body: Record<string, unknown> = {};
      if (payload) Object.assign(body, payload);
      else if (mode === "url") body.url = url.trim();
      else if (mode === "image" && file) body.image = { data: await fileToBase64(file), mediaType: file.type };
      else body.text = text;
      // 글 칸에 링크 하나만 붙여 넣은 경우는 링크로 처리
      if (typeof body.text === "string" && /^https?:\/\/\S+$/.test(body.text.trim())) {
        body.url = body.text.trim();
        delete body.text;
      }
      const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "분석하지 못했습니다. 잠시 후 다시 시도하세요.");
      setRes(j);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "분석하지 못했습니다.");
    } finally {
      clearInterval(timer);
      setBusy(false);
    }
  }

  // 공유 링크(#ad=... 또는 #url=...)로 들어오면 바로 확인
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    try {
      const ad = h.get("ad");
      const u = h.get("url");
      if (ad) {
        const t = b64d(ad);
        setMode("text");
        setText(t);
        run({ text: t });
      } else if (u) {
        setMode("url");
        setUrl(u);
        run({ url: u });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function share() {
    if (!res) return;
    const base = `${window.location.origin}/`;
    const link = res.source?.kind === "url" && res.source.url ? `${base}#url=${encodeURIComponent(res.source.url)}` : `${base}#ad=${b64e(res.text.slice(0, 1500))}`;
    const title = `글로벌-인 공고 점검: ${LEVEL[res.level].word} (위험 신호 ${res.signals.length}개)`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${title}\n지원 전에 함께 확인해 보세요.`, url: link });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setShared("링크를 복사했어요. 카카오톡·메신저에 붙여 넣으면 같은 공고를 바로 확인할 수 있어요.");
    } catch {
      setShared(link);
    }
  }

  const ready = mode === "text" ? text.trim().length > 0 : mode === "url" ? /^https?:\/\/\S+/.test(url.trim()) : !!file;
  const lv = res ? LEVEL[res.level] : null;
  const counts = res
    ? (["critical", "high", "medium", "low"] as const).map((k) => [k, res.signals.filter((s) => s.severity === k).length] as const).filter(([, n]) => n > 0)
    : [];
  const foundMit = new Set(res?.mitigators.map((m) => m.id) ?? []);

  return (
    <>
      <div className="inspect" ref={inputRef} id="check">
        <div className="tabs" role="tablist" aria-label="공고 넣는 방법">
          {(
            [
              ["text", "doc", "글 붙여넣기"],
              ["url", "link", "링크"],
              ["image", "image", "캡처 이미지"],
            ] as const
          ).map(([m, ic, label]) => (
            <button key={m} role="tab" aria-selected={mode === m} className="tab" type="button" onClick={() => setMode(m)}>
              <Icon name={ic} size={16} />
              {label}
            </button>
          ))}
        </div>

        {mode === "text" ? (
          <>
            <label htmlFor="ad" className="sr-only">공고 글</label>
            <textarea
              id="ad"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"구인 공고, 메신저로 받은 제안, 지인이 보낸 글을 그대로 붙여 넣으세요.\n이름·전화번호는 지워도 결과는 같아요."}
              maxLength={4000}
            />
          </>
        ) : mode === "url" ? (
          <div className="url-box">
            <label htmlFor="url">공고가 올라온 페이지 주소</label>
            <input id="url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." onKeyDown={(e) => e.key === "Enter" && ready && !busy && run()} />
            <p>구인 사이트·블로그·카페 글처럼 로그인 없이 열리는 페이지만 읽을 수 있어요. 텔레그램·카카오톡 대화는 캡처를 올려 주세요.</p>
          </div>
        ) : (
          <label className={`drop ${file ? "has" : ""}`}>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Icon name="image" size={28} />
            <strong>{file ? file.name : "공고 캡처를 골라 주세요"}</strong>
            <span>{file ? "다른 이미지를 고르려면 다시 누르세요" : "메신저 대화·SNS 광고 캡처도 됩니다 (PNG·JPG, 4MB 이하)"}</span>
          </label>
        )}

        <div className="inspect-bar">
          <span className="privacy">
            <Icon name="check" size={15} /> 넣은 내용은 저장하지 않아요
          </span>
          <button className="btn primary" type="button" disabled={busy || !ready} onClick={() => run()}>
            {busy ? "확인하는 중…" : "위험 신호 확인하기"}
          </button>
        </div>
        {busy ? (
          <ol className="progress" aria-live="polite">
            {STEPS.map((s, i) => (
              <li key={s} className={i < step ? "done" : i === step ? "now" : ""}>
                {s}
              </li>
            ))}
          </ol>
        ) : null}
        {err ? (
          <p className="err" role="alert">
            <Icon name="warn" size={16} /> {err}
          </p>
        ) : null}
      </div>

      <div className="examples">
        <span>예시로 해 보기</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            className="chip"
            type="button"
            disabled={busy}
            onClick={() => {
              setMode("text");
              setText(ex.text);
              run({ text: ex.text });
            }}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {res && lv ? (
        <section className="result" ref={resultRef} aria-live="polite" aria-label="확인 결과">
          {/* 1. 결론 */}
          <div className={`verdict ${lv.tone}`}>
            <div className="verdict-main">
              <p className="verdict-level">
                <span className={`dot ${lv.tone}`} />
                {lv.word}
              </p>
              <h2>
                {res.signals.length && res.level !== "low" ? (
                  <>
                    위험 신호 <em>{res.signals.length}개</em> · {lv.head}
                  </>
                ) : (
                  lv.head
                )}
              </h2>
              <p className="verdict-act">{lv.act}</p>
              <Meter score={res.score} tone={lv.tone} />
              <ul className="counts">
                {counts.map(([k, n]) => (
                  <li key={k} className={`cnt ${k}`}>
                    {SEV[k]} {n}
                  </li>
                ))}
                <li className="cnt good">안심 요소 {res.mitigators.length}</li>
              </ul>
              {res.signals.length ? (
                <div className="reasons">
                  <p>{res.level === "low" ? "참고할 신호" : "가장 큰 이유"}</p>
                  <ol>
                    {res.signals.slice(0, 3).map((s, i) => (
                      <li key={s.id + i} className={s.severity}>
                        <b>{s.label}</b>
                        <q>{s.evidence[0]?.text}</q>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : res.mitigators.length ? (
                <div className="reasons good">
                  <p>정상 채용의 흔적</p>
                  <ol>
                    {res.mitigators.slice(0, 3).map((m, i) => (
                      <li key={i}>
                        <b>{m.label}</b>
                        <q>{m.evidence[0]?.text}</q>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
            <aside className="verdict-why">
              <h3>이렇게 판단했어요</h3>
              {res.mode === "hybrid" ? (
                <dl>
                  <div>
                    <dt>규칙 점수</dt>
                    <dd>{Math.round(res.ruleScore * 100)}</dd>
                  </div>
                  <div>
                    <dt>AI 점수</dt>
                    <dd>{Math.round((res.llmScore ?? 0) * 100)}</dd>
                  </div>
                  <div className="total">
                    <dt>최종 (규칙 40% + AI 60%)</dt>
                    <dd>{Math.round(res.score * 100)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="warn-note">
                  <Icon name="warn" size={15} /> 지금은 AI 연결 없이 규칙으로만 확인했어요. 말을 바꿔 쓴 표현은 놓칠 수 있으니 잠시 후 다시 확인하세요.
                </p>
              )}
              {res.mode === "hybrid" ? (
                <p className="ok-note">
                  <Icon name="check" size={15} /> 화면의 인용은 모두 원문에서 다시 찾은 문구예요.
                  {res.droppedQuotes ? ` AI가 든 근거 중 원문에 없는 ${res.droppedQuotes}개는 뺐어요.` : ""}
                </p>
              ) : null}
              <p className="summary">{res.summary}</p>
              <div className="verdict-actions">
                <button className="btn ghost" type="button" onClick={share}>
                  <Icon name="share" size={16} /> 결과 공유
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => {
                    setRes(null);
                    setText("");
                    setUrl("");
                    setFile(null);
                    inputRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  다른 공고 확인
                </button>
              </div>
              {shared ? <p className="shared">{shared}</p> : null}
            </aside>
          </div>

          {/* 2. 원문 + 위험 신호 */}
          <div className="evidence">
            <div className="doc">
              <p className="doc-head">
                <span>{res.source?.kind === "url" ? "링크에서 가져온 글" : res.source?.kind === "image" ? "캡처에서 읽은 글" : "입력한 공고"}</span>
                <span className="legend">
                  <i className="hl critical">치명</i> <i className="hl flag">위험</i> <i className="hl good">안심</i>
                </span>
              </p>
              {res.source?.kind === "url" && res.source.url ? (
                <p className="doc-src">
                  <Icon name="link" size={14} /> {res.source.title || res.source.url}
                </p>
              ) : null}
              <Annotated a={res} />
            </div>

            <div className="sigs">
              <h3>
                찾은 위험 신호 <span>{res.signals.length}개</span>
              </h3>
              {res.signals.length ? (
                <ol className="signals">
                  {res.signals.map((s, i) => (
                    <li key={s.id + i} className={`sig ${s.severity}`}>
                      <div className="sig-top">
                        <span className="sig-no">{i + 1}</span>
                        <span className="sig-label">{s.label}</span>
                        <span className={`sev ${s.severity}`}>{SEV[s.severity]}</span>
                      </div>
                      <q>{s.evidence[0]?.text}</q>
                      <p>{s.note && s.source !== "rule" ? s.note : s.why}</p>
                      <p className="check">
                        <b>확인 방법</b> {s.check}
                      </p>
                      <p className="sig-meta">
                        <span>{SRC[s.source]}</span>
                        <span>
                          근거:{" "}
                          {refsFor(s.id).map((r, k) => (
                            <span key={r.key}>
                              {k ? ", " : ""}
                              {r.url ? (
                                <a href={r.url} target="_blank" rel="noreferrer">
                                  {r.name}
                                </a>
                              ) : (
                                r.name
                              )}
                            </span>
                          ))}
                        </span>
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="empty">정해진 위험 문구와 AI 판단 모두에서 뚜렷한 위험 신호를 찾지 못했어요.</p>
              )}
            </div>
          </div>

          {/* 3. 공고 정보 / 안심 요소 */}
          <div className="facts">
            <div className="card">
              <h3>공고에서 읽은 정보</h3>
              <dl className="facts-list">
                {[
                  ["회사명", res.job?.company, "회사명이 없으면 확인할 방법이 없어요"],
                  ["근무지", [res.job?.country, res.job?.city].filter(Boolean).join(" "), "근무 국가·도시가 없어요"],
                  ["급여", res.salary ? `${res.job?.salary_text || res.salary.text} (월 약 ${res.salary.monthlyManwon.toLocaleString()}만원)` : res.job?.salary_text, "급여 조건이 없어요"],
                  ["연락 방법", res.job?.contact_channel, "연락 방법이 없어요"],
                  ["비자", res.job?.visa_info, "비자·노동허가 언급이 없어요"],
                ].map(([k, v, miss]) => (
                  <div key={k as string} className={v ? "" : "miss"}>
                    <dt>{k}</dt>
                    <dd>{v ? (v as string) : <span>공고에 없음 · {miss as string}</span>}</dd>
                  </div>
                ))}
              </dl>
              {res.mode !== "hybrid" ? <p className="muted">AI 연결이 없을 때는 일부 항목을 읽지 못해요.</p> : null}
            </div>
            <div className="card">
              <h3>정상 채용의 흔적</h3>
              <ul className="mit">
                {MIT_ALL.map((m) => {
                  const hit = res.mitigators.find((x) => x.id === m.id);
                  return (
                    <li key={m.id} className={foundMit.has(m.id) ? "yes" : "no"}>
                      <span className="mk">{foundMit.has(m.id) ? <Icon name="check" size={14} /> : "–"}</span>
                      <div>
                        <strong>{m.label}</strong>
                        <span>{hit ? `“${hit.evidence[0]?.text}”` : `찾지 못함 · ${m.hint}`}</span>
                      </div>
                    </li>
                  );
                })}
                {res.mitigators
                  .filter((m) => m.id === "llm")
                  .map((m, i) => (
                    <li key={"l" + i} className="yes">
                      <span className="mk">
                        <Icon name="check" size={14} />
                      </span>
                      <div>
                        <strong>AI가 찾은 흔적</strong>
                        <span>“{m.evidence[0]?.text}”</span>
                      </div>
                    </li>
                  ))}
              </ul>
              <p className="muted">근거: {MITIGATOR_REF.official_channel.map((k) => REFS[k].name).join(", ")} — 공식 구직 플랫폼과 회사 정보 직접 확인을 권고</p>
            </div>
          </div>

          {/* 4. 할 일 */}
          <div className="todo card">
            <h3>지원 전에 할 일</h3>
            <ol className="todo-list">
              <li>
                <strong>회사에 직접 물어보기</strong>
                <ul>
                  {res.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </li>
              <li>
                <strong>회사가 진짜인지 확인하기</strong>
                <span>
                  KOTRA 해외취업 헬프데스크의 기업정보 확인 서비스, 계약서는 자문변호사 검토 · <a href="https://www.worldjob.or.kr" target="_blank" rel="noreferrer">월드잡플러스</a>
                </span>
              </li>
              <li>
                <strong>근무 국가 여행경보 보기</strong>
                <span>
                  {res.travel?.source === "api" && res.travel.levelName ? (
                    <>
                      {res.travel.countryName}: <b className={res.travel.level && res.travel.level >= 3 ? "stop-t" : ""}>{res.travel.levelName}</b>
                      {res.travel.special ? " · 특별여행주의보" : ""} ·{" "}
                    </>
                  ) : null}
                  <a href={res.travel?.link ?? REFS.mofa.url} target="_blank" rel="noreferrer">
                    외교부 해외안전여행
                  </a>
                </span>
              </li>
            </ol>
          </div>

          <div className="help">
            <a className="help-item urgent" href="tel:+82232100404">
              <strong>이미 출국했거나 위험하다면</strong>
              <span>외교부 영사안전콜센터 24시간</span>
              <b>+82-2-3210-0404</b>
            </a>
            <a className="help-item" href="tel:112">
              <strong>국내에서 피해·의심 신고</strong>
              <span>경찰</span>
              <b>112</b>
            </a>
          </div>

          <p className="disclaimer">
            이 결과는 정해진 위험 문구와 AI가 만든 참고 정보이며, 사기 여부를 확정하지 않습니다. 정상 공고를 위험하다고 하거나 위험한 공고를 놓칠 수 있어요.{" "}
            <a href="/trust">판단 근거와 정확도 보기 →</a>
          </p>
        </section>
      ) : null}
    </>
  );
}
