import { NextResponse } from "next/server";
import * as P from "@/lib/provider";
import { modelName, provider } from "@/lib/provider";

// 배포 상태 점검용: 어떤 AI 공급자·모델로 동작하는지와 외부 API 연결 여부만 알려 준다(키 값은 노출하지 않음).
export async function GET(req: Request) {
  const p = provider();
  let model = "none";
  let modelError: string | null = null;
  try {
    model = await modelName();
  } catch (e) {
    modelError = (e as Error).message;
  }
  let probe: unknown = undefined;
  if (new URL(req.url).searchParams.get("probe")) {
    const t = Date.now();
    try {
      const out = await P.jsonCall<{ ok: boolean }>({ system: "JSON만 답하세요.", text: "ok를 true로", name: "p", maxTokens: 64, timeoutMs: 20_000, schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] } });
      probe = { ok: true, used: P.usedModel, ms: Date.now() - t, out };
    } catch (e) {
      probe = { ok: false, attempts: P.attemptLog.slice(-8), ms: Date.now() - t, error: (e as Error).message, callError: P.lastCallError };
    }
  }
  return NextResponse.json(
    { probe, provider: p, model, modelError, listError: P.lastListError, keyLength: (process.env.GEMINI_API_KEY ?? "").trim().length, travelApiKey: !!process.env.DATA_GO_KR_KEY, time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
