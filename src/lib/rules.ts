import { SIGNALS, MITIGATORS, type Severity } from "./signals";
import { maxMonthly, type SalaryHit } from "./salary";

export interface Evidence {
  start: number;
  end: number;
  text: string;
}

export interface FiredSignal {
  id: string;
  label: string;
  why: string;
  check: string;
  severity: Severity;
  weight: number;
  evidence: Evidence[];
  source: "rule" | "llm" | "both";
  note?: string;
}

export interface FiredMitigator {
  id: string;
  label: string;
  weight: number;
  evidence: Evidence[];
}

export interface RuleResult {
  signals: FiredSignal[];
  mitigators: FiredMitigator[];
  salary: SalaryHit | null;
  raw: number;
  risk: number; // 0~1
  hasCritical: boolean;
}

function findAll(text: string, patterns: RegExp[]): Evidence[] {
  const out: Evidence[] = [];
  for (const p of patterns) {
    const re = new RegExp(p.source, p.flags.includes("g") ? p.flags : p.flags + "g");
    for (const m of text.matchAll(re)) {
      if (m.index == null || !m[0].trim()) continue;
      out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }
  }
  // 겹치는 구간 제거
  out.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Evidence[] = [];
  for (const e of out) {
    const last = merged[merged.length - 1];
    if (last && e.start < last.end) continue;
    merged.push(e);
  }
  return merged;
}

export const HIGH_PAY_MANWON = 1000; // 월 1,000만원 이상
export const MID_PAY_MANWON = 600;

export function runRules(text: string): RuleResult {
  const signals: FiredSignal[] = [];
  for (const s of SIGNALS) {
    const ev = findAll(text, s.patterns);
    if (ev.length) {
      signals.push({ id: s.id, label: s.label, why: s.why, check: s.check, severity: s.severity, weight: s.weight, evidence: ev, source: "rule" });
    }
  }

  // 급여 신호: 경력 무관 + 고수익 조합이 핵심
  const salary = maxMonthly(text);
  const noExp = signals.some((s) => s.id === "no_experience");
  if (salary && salary.monthlyManwon >= MID_PAY_MANWON) {
    const veryHigh = salary.monthlyManwon >= HIGH_PAY_MANWON;
    const weight = (veryHigh ? 2 : 1) + (noExp ? 2 : 0);
    if (veryHigh || noExp) {
      signals.push({
        id: "high_pay",
        label: noExp ? "경력 무관인데 비현실적 고수익" : "평균보다 매우 높은 급여",
        why: "경력·자격 요건 없이 월 수백만~수천만 원을 약속하는 것은 해외취업 사기의 가장 흔한 미끼입니다.",
        check: "같은 나라·직무의 정상 공고(월드잡플러스 등) 급여와 비교해 보세요.",
        severity: noExp && veryHigh ? "high" : "medium",
        weight,
        evidence: [{ start: salary.index, end: salary.index + salary.text.length, text: salary.text }],
        source: "rule",
        note: `월 약 ${salary.monthlyManwon.toLocaleString()}만원으로 환산`,
      });
    }
  }

  const mitigators: FiredMitigator[] = [];
  const bypass = signals.some((s) => s.id === "visa_bypass");
  for (const m of MITIGATORS) {
    if (m.id === "proper_visa" && bypass) continue;
    const ev = findAll(text, m.patterns);
    if (ev.length) mitigators.push({ id: m.id, label: m.label, weight: m.weight, evidence: ev });
  }

  const pos = signals.reduce((a, s) => a + s.weight, 0);
  const neg = mitigators.reduce((a, m) => a + m.weight, 0);
  const raw = pos + neg;
  const hasCritical = signals.some((s) => s.severity === "critical");
  let risk = Math.max(0, Math.min(1, raw / 8));
  if (hasCritical) risk = Math.max(risk, 0.7);
  return { signals, mitigators, salary, raw, risk, hasCritical };
}

export type Level = "high" | "caution" | "low";
export function levelOf(risk: number): Level {
  if (risk >= 0.6) return "high";
  if (risk >= 0.3) return "caution";
  return "low";
}
