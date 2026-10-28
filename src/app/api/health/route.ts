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
    const forced = new URL(req.url).searchParams.get("model") || undefined;
    try {
      const out = await P.jsonCall<{ ok: boolean }>({ system: "JSON만 답하세요.", text: "ok를 true로", name: "p", maxTokens: 64, timeoutMs: 20_000, model: forced, schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] } });
      probe = { ok: true, used: P.usedModel, ms: Date.now() - t, out };
    } catch (e) {
      probe = { ok: false, attempts: P.attemptLog.slice(-8), ms: Date.now() - t, error: (e as Error).message, callError: P.lastCallError };
    }
  }
  let travel: unknown = undefined;
  const iso = new URL(req.url).searchParams.get("travel");
  if (iso && process.env.DATA_GO_KR_KEY) {
    const { keyParam } = await import("@/lib/travel");
    const k = process.env.DATA_GO_KR_KEY;
    const url = `https://apis.data.go.kr/1262000/TravelAlarmService2/getTravelAlarmList2?serviceKey=${keyParam(k)}&returnType=JSON&numOfRows=5&pageNo=1&${encodeURIComponent("cond[country_iso_alp2::EQ]")}=${iso}`;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
      travel = { status: r.status, keyHasPercent: /%/.test(k), keyLen: k.trim().length, body: (await r.text()).slice(0, 500) };
    } catch (e) {
      travel = { error: (e as Error).message };
    }
  }
  return NextResponse.json(
    { probe, travel, models: provider() === "gemini" ? await P.candidates().catch(() => null) : null, provider: p, model, modelError, listError: P.lastListError, keyLength: (process.env.GEMINI_API_KEY ?? "").trim().length, travelApiKey: !!process.env.DATA_GO_KR_KEY, time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
