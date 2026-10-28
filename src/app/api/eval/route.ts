import { NextResponse } from "next/server";
import { analyzeWithLlm } from "@/lib/llm";
import { modelName } from "@/lib/provider";
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
  const limit = Math.min(20, Number(u.searchParams.get("limit") ?? 10));
  const slice = rows.slice(offset, offset + limit);
  const model = await modelName();
  const results = [];
  for (const r of slice) {
    const t = Date.now();
    try {
      const out = await analyzeWithLlm({ text: r.text });
      results.push({ id: r.id, out, ms: Date.now() - t, model });
    } catch (e) {
      results.push({ id: r.id, error: (e as Error).message, ms: Date.now() - t, model });
    }
  }
  return NextResponse.json({ total: rows.length, offset, results }, { headers: { "Cache-Control": "no-store" } });
}
