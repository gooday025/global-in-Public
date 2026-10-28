// 사용법: ANTHROPIC_API_KEY=... npx tsx eval/run.ts
// 규칙만 / LLM만 / 하이브리드(서비스 실제 방식)를 두 평가셋에서 비교한다. LLM 응답은 eval/cache에 저장해 재현 가능하게 한다.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { runRules } from "../src/lib/rules";
import { analyzeWithLlm, type LlmResult } from "../src/lib/llm";
import { modelName } from "../src/lib/provider";
import { combine, locate } from "../src/lib/analyze";
import { SIGNALS } from "../src/lib/signals";

const DIR = join(__dirname);
const CACHE = join(DIR, "cache");
mkdirSync(CACHE, { recursive: true });
const THRESH = 0.5;
const CRIT = new Set(SIGNALS.filter((s) => s.severity === "critical").map((s) => s.id));

type Row = { id: string; label: "scam" | "legit"; difficulty: string; text: string };
const load = (f: string): Row[] => readFileSync(join(DIR, f), "utf8").trim().split("\n").map((l) => JSON.parse(l));

async function llmFor(r: Row): Promise<{ out: LlmResult; ms: number } | null> {
  const p = join(CACHE, `${r.id}.json`);
  if (existsSync(p)) {
    const c = JSON.parse(readFileSync(p, "utf8"));
    return c.out ? c : null;
  }
  if (!process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) return null;
  const t = Date.now();
  for (let i = 0; i < 3; i++) {
    try {
      const out = await analyzeWithLlm({ text: r.text });
      const v = { out, ms: Date.now() - t, model: await modelName() };
      writeFileSync(p, JSON.stringify(v, null, 1));
      return v;
    } catch (e) {
      console.error(r.id, "retry", (e as Error).message);
      await new Promise((s) => setTimeout(s, 2000));
    }
  }
  return null;
}

function metrics(pairs: { y: boolean; p: boolean }[]) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const { y, p } of pairs) {
    if (p && y) tp++; else if (p && !y) fp++; else if (!p && y) fn++; else tn++;
  }
  const P = tp + fp ? tp / (tp + fp) : 0, R = tp + fn ? tp / (tp + fn) : 0;
  const F1 = P + R ? (2 * P * R) / (P + R) : 0;
  return { tp, fp, fn, tn, precision: +P.toFixed(3), recall: +R.toFixed(3), f1: +F1.toFixed(3), accuracy: +((tp + tn) / pairs.length).toFixed(3) };
}

async function main() {
  const sets = { "A_기본(100)": load("dataset.jsonl"), "B_회피·경계(40)": load("dataset_hard.jsonl") };
  const report: Record<string, unknown> = { model: "see cache", threshold: THRESH, date: new Date().toISOString() };
  const errors: unknown[] = [];
  let quotesTotal = 0, quotesDropped = 0;
  const latencies: number[] = [];
  for (const [name, rows] of Object.entries(sets)) {
    const R: { y: boolean; p: boolean }[] = [], L: typeof R = [], H: typeof R = [];
    for (const r of rows) {
      const y = r.label === "scam";
      const rules = runRules(r.text);
      R.push({ y, p: rules.risk >= THRESH });
      const l = await llmFor(r);
      if (!l) continue;
      latencies.push(l.ms);
      let crit = false;
      let ver = 0;
      for (const s of l.out.signals) {
        quotesTotal++;
        const ev = locate(r.text, s.quote);
        if (!ev) quotesDropped++;
        else {
          ver++;
          if (CRIT.has(s.id)) crit = true;
        }
      }
      L.push({ y, p: l.out.scam_probability >= THRESH });
      const h = combine(rules.risk, rules.hasCritical, l.out, crit, ver);
      H.push({ y, p: h >= THRESH });
      if ((h >= THRESH) !== y) errors.push({ set: name, id: r.id, label: r.label, rule: +rules.risk.toFixed(2), llm: l.out.scam_probability, hybrid: +h.toFixed(2) });
    }
    report[name] = { n: rows.length, rules: metrics(R), llm: L.length ? metrics(L) : null, hybrid: H.length ? metrics(H) : null };
  }
  const anyCache = Object.values(sets).flat().map((r) => join(CACHE, `${r.id}.json`)).find((p) => existsSync(p));
  if (anyCache) report.model = JSON.parse(readFileSync(anyCache, "utf8")).model ?? report.model;
  latencies.sort((a, b) => a - b);
  report.latency_ms = latencies.length ? { median: latencies[Math.floor(latencies.length / 2)], p90: latencies[Math.floor(latencies.length * 0.9)] } : null;
  report.quote_check = { total: quotesTotal, dropped: quotesDropped };
  report.errors = errors;
  writeFileSync(join(DIR, "results.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main();
