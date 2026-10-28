import { NextResponse } from "next/server";
import { analyzeWithLlm } from "@/lib/llm";
import { modelName, usedModel } from "@/lib/provider";
import { runRules } from "@/lib/rules";
import { combine, locate } from "@/lib/analyze";
import { SIGNALS } from "@/lib/signals";
import setA from "../../../../eval/dataset.json";
import setB from "../../../../eval/dataset_hard.json";

export const maxDuration = 300;

// 평가셋을 배포 서버에서 LLM으로 돌린다. EVAL_TOKEN이 맞아야 실행된다.
// GET /api/eval?token=...&set=A|B&offset=0&limit=10  →  [{id, out, ms}]
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (!process.env.EVAL_TOKEN || u.searchParams.get("token") !== process.env.EVAL_TOKEN) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = (u.searchParams.get("set") === "B" ? setB : setA) as { id: string; text: string }[];
  const offset = Number(u.searchParams.get("offset") ?? 0);
  const limit = Math.min(25, Number(u.searchParams.get("limit") ?? 10));
  const slice = rows.slice(offset, offset + limit);
  const model = await modelName();
  const compact = u.searchParams.get("compact") === "1";
  const CRIT = new Set(SIGNALS.filter((x) => x.severity === "critical").map((x) => x.id));
  const results: unknown[] = [];
  for (const r of slice) {
    const t = Date.now();
    try {
      const out = await analyzeWithLlm({ text: r.text });
      if (compact) {
        const rules = runRules(r.text);
        let crit = false, total = 0, dropped = 0;
        for (const sg of out.signals) {
          total++;
          if (!locate(r.text, sg.quote)) dropped++;
          else if (CRIT.has(sg.id)) crit = true;
        }
        results.push({ id: r.id, rule: +rules.risk.toFixed(3), llm: out.scam_probability, hybrid: +combine(rules.risk, rules.hasCritical, out, crit).toFixed(3), q: [total, dropped], ms: Date.now() - t, model: usedModel ?? model });
      } else results.push({ id: r.id, out, ms: Date.now() - t, model });
    } catch (e) {
      results.push({ id: r.id, error: (e as Error).message, ms: Date.now() - t, model });
    }
  }
  return NextResponse.json({ total: rows.length, offset, results }, { headers: { "Cache-Control": "no-store" } });
}
