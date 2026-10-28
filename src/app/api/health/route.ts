import { NextResponse } from "next/server";
import { modelName, provider } from "@/lib/provider";

// 배포 상태 점검용: 어떤 AI 공급자·모델로 동작하는지와 외부 API 연결 여부만 알려 준다(키 값은 노출하지 않음).
export async function GET() {
  const p = provider();
  let model = "none";
  let modelError: string | null = null;
  try {
    model = await modelName();
  } catch (e) {
    modelError = (e as Error).message;
  }
  return NextResponse.json(
    { provider: p, model, modelError, travelApiKey: !!process.env.DATA_GO_KR_KEY, time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
