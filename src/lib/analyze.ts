import { runRules, levelOf, type FiredSignal, type Evidence, type Level } from "./rules";
import { analyzeWithLlm, llmAvailable, type LlmResult } from "./llm";
import { SIGNALS } from "./signals";
import { getTravelAlert, guessIso2, type TravelAlert } from "./travel";

export interface Analysis {
  text: string;
  level: Level;
  score: number; // 0~1 최종
  ruleScore: number;
  llmScore: number | null;
  floor: "critical" | "ai" | null; // 점수 하한이 적용된 이유
  mode: "hybrid" | "rules-only";
  signals: FiredSignal[];
  mitigators: { id: string; label: string; evidence: Evidence[]; explanation?: string }[];
  salary: { text: string; monthlyManwon: number } | null;
  source?: { kind: "text" | "image" | "url"; url?: string; title?: string };
  summary: string;
  questions: string[];
  job: LlmResult["job"] | null;
  travel: TravelAlert | null;
  droppedQuotes: number; // 원문에서 찾지 못해 버린 AI 근거 수 (환각 차단)
  elapsedMs: number;
}

// 공백 차이를 무시하고 원문에서 인용구 위치 찾기
export function locate(text: string, quote: string): Evidence | null {
  const q = quote.trim().replace(/^["'“‘]|["'”’]$/g, "");
  if (q.length < 2) return null;
  const i = text.indexOf(q);
  if (i >= 0) return { start: i, end: i + q.length, text: q };
  const pattern = q.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*");
  try {
    const m = new RegExp(pattern).exec(text);
    if (m) return { start: m.index, end: m.index + m[0].length, text: m[0] };
  } catch {}
  return null;
}

export const W_RULE = 0.4;
export const W_LLM = 0.6;

// 규칙은 바꿔 쓴 표현을 못 잡으므로, AI가 원문에서 확인된 근거를 2개 이상 들며 확신하면 규칙 점수가 낮다고 결론을 깎지 않는다.
export const AI_FLOOR = 0.85;
export function combine(ruleRisk: number, ruleCritical: boolean, llm: LlmResult | null, llmCriticalVerified: boolean, llmVerified = 0) {
  return combineWhy(ruleRisk, ruleCritical, llm, llmCriticalVerified, llmVerified).score;
}
export function combineWhy(ruleRisk: number, ruleCritical: boolean, llm: LlmResult | null, llmCriticalVerified: boolean, llmVerified = 0): { score: number; floor: "critical" | "ai" | null } {
  if (!llm) return { score: ruleRisk, floor: null };
  let s = W_RULE * ruleRisk + W_LLM * llm.scam_probability;
  let floor: "critical" | "ai" | null = null;
  if (llmVerified >= 2 && AI_FLOOR * llm.scam_probability > s) {
    s = AI_FLOOR * llm.scam_probability;
    floor = "ai";
  }
  if ((ruleCritical || llmCriticalVerified) && s < 0.7) {
    s = 0.7;
    floor = "critical";
  }
  return { score: Math.max(0, Math.min(1, s)), floor };
}

const DEF = Object.fromEntries(SIGNALS.map((s) => [s.id, s]));

export async function analyze(input: { text?: string; image?: { data: string; mediaType: string } }): Promise<Analysis> {
  const t0 = Date.now();
  let llm: LlmResult | null = null;
  let text = (input.text ?? "").trim();
  if (llmAvailable()) {
    try {
      llm = await analyzeWithLlm(input);
      if (input.image && llm.transcribed_text) text = (llm.transcribed_text + (text ? "\n\n" + text : "")).trim();
    } catch (e) {
      console.error("llm failed", e);
      llm = null;
    }
  }
  const rules = runRules(text);
  const signals: FiredSignal[] = rules.signals.map((s) => ({ ...s }));
  let dropped = 0;
  let llmCritical = false;
  let llmVerified = 0;

  if (llm) {
    for (const ls of llm.signals) {
      const ev = locate(text, ls.quote);
      if (!ev) {
        dropped++;
        continue;
      }
      const existing = signals.find((s) => s.id === ls.id && ls.id !== "other");
      if (existing) {
        existing.source = "both";
        if (!existing.evidence.some((e) => e.start < ev.end && ev.start < e.end)) existing.evidence.push(ev);
        existing.note = existing.note ?? ls.explanation;
      } else {
        const d = DEF[ls.id];
        signals.push({
          id: ls.id,
          label: d?.label ?? (ls.id === "high_pay" ? "비현실적 고수익" : "그 밖의 위험 표현"),
          why: d?.why ?? ls.explanation,
          check: d?.check ?? "회사 정보와 계약 조건을 공식 경로로 다시 확인하세요.",
          severity: d?.severity ?? "medium",
          weight: d?.weight ?? 2,
          evidence: [ev],
          source: "llm",
          note: ls.explanation,
        });
      }
      llmVerified++;
      if (d_isCritical(ls.id)) llmCritical = true;
    }
  }

  // 여행경보
  const iso = (llm?.job?.country_iso2 || "").toUpperCase() || guessIso2(text);
  const travel = iso ? await getTravelAlert(iso, llm?.job?.country ?? "") : null;
  let ruleRisk = rules.risk;
  if (travel?.level && travel.level >= 3) ruleRisk = Math.min(1, ruleRisk + 0.25);

  const { score, floor } = combineWhy(ruleRisk, rules.hasCritical, llm, llmCritical, llmVerified);
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  signals.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity] || b.weight - a.weight);

  const mitigators: Analysis["mitigators"] = rules.mitigators.map((m) => ({ id: m.id, label: m.label, evidence: m.evidence }));
  if (llm) {
    for (const m of llm.mitigating) {
      const ev = locate(text, m.quote);
      if (!ev) continue;
      if (mitigators.some((x) => x.evidence.some((e) => e.start < ev.end && ev.start < e.end))) continue;
      mitigators.push({ id: "llm", label: "정상 채용의 흔적", evidence: [ev], explanation: m.explanation });
    }
  }

  return {
    text,
    level: levelOf(score),
    score,
    ruleScore: ruleRisk,
    llmScore: llm ? llm.scam_probability : null,
    floor,
    mode: llm ? "hybrid" : "rules-only",
    signals,
    mitigators,
    salary: rules.salary ? { text: rules.salary.text, monthlyManwon: rules.salary.monthlyManwon } : null,
    summary: llm?.summary ?? defaultSummary(levelOf(score), signals.length),
    questions: llm?.questions_to_ask?.slice(0, 3) ?? [
      "회사의 정식 법인명, 주소, 사업자(등록) 번호를 알려 주실 수 있나요?",
      "출국 전에 취업비자(노동허가)가 발급되나요? 서류를 미리 받을 수 있나요?",
      "하루 업무를 구체적으로 설명해 주시고, 근로계약서를 출국 전에 보내 주실 수 있나요?",
    ],
    job: llm?.job ?? null,
    travel,
    droppedQuotes: dropped,
    elapsedMs: Date.now() - t0,
  };
}

function d_isCritical(id: string) {
  return DEF[id]?.severity === "critical";
}

function defaultSummary(level: Level, n: number) {
  if (level === "high") return `위험 신호가 ${n}개 보입니다. 지원하거나 출국하기 전에 아래 항목을 반드시 확인하세요.`;
  if (level === "caution") return `확인이 필요한 부분이 ${n}개 있습니다. 회사 정보와 비자 절차를 공식 경로로 점검해 보세요.`;
  return "뚜렷한 위험 신호는 적습니다. 그래도 회사 정보와 계약서는 출국 전에 꼭 직접 확인하세요.";
}
