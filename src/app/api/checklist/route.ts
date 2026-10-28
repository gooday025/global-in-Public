import { NextResponse } from "next/server";
import { buildChecklist, COUNTRIES, PURPOSES, type Purpose } from "@/lib/checklist";
import { jsonCall, provider } from "@/lib/provider";
import { getTravelAlert } from "@/lib/travel";

export const maxDuration = 30;

interface Tip { dday: number; text: string }

async function aiTips(purpose: string, country: string, depart: string, note: string): Promise<Tip[]> {
  if (!provider()) return [];
  const out = await jsonCall<{ tips?: Tip[] }>({
    system:
      "당신은 해외로 나가는 한국 청년의 출국 준비를 돕습니다. 이미 기본 체크리스트(여권, 비자, 계약서, 여행경보, 보험, 동행 서비스, 영사콜센터, 재외국민등록)는 제공되었습니다. " +
      "그 밖에 이 국가·목적에서 특히 놓치기 쉬운 준비사항 4개를 제안하세요. 확실하지 않은 수치·기관명·링크는 쓰지 말고, '공식 사이트에서 확인'처럼 확인 방법을 함께 적으세요. 각 항목은 한 문장, '~하기'로 끝나는 할 일 형태.",
    text: `목적: ${purpose}\n국가: ${country}\n출국 예정일: ${depart}${note ? `\n상황: ${note.slice(0, 300)}` : ""}`,
    name: "tips",
    maxTokens: 2048,
    timeoutMs: 20_000,
    schema: {
      type: "object",
      properties: {
        tips: {
          type: "array",
          items: {
            type: "object",
            properties: { dday: { type: "integer", description: "출국 며칠 전에 할 일인지(60,30,14,7,1,0, 도착 후는 -30)" }, text: { type: "string" } },
            required: ["dday", "text"],
          },
        },
      },
      required: ["tips"],
    },
  });
  return (out.tips ?? []).slice(0, 4).filter((t) => typeof t.text === "string" && t.text.length < 200);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const purpose = (body.purpose ?? "job") as Purpose;
  const iso = String(body.country ?? "");
  const depart = String(body.depart ?? "");
  if (!PURPOSES.some((p) => p.id === purpose)) return NextResponse.json({ error: "목적을 골라 주세요." }, { status: 400 });
  const country = COUNTRIES.find((c) => c.iso === iso);
  if (!country) return NextResponse.json({ error: "국가를 골라 주세요." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(depart)) return NextResponse.json({ error: "출국 예정일을 입력해 주세요." }, { status: 400 });

  const groups = buildChecklist(purpose, iso, depart);
  const [tips, travel] = await Promise.all([
    aiTips(PURPOSES.find((p) => p.id === purpose)!.label, country.name, depart, String(body.note ?? "")).catch(() => []),
    getTravelAlert(iso, country.name),
  ]);
  for (const t of tips) {
    const g = groups.reduce((best, g) => (Math.abs(g.dday - t.dday) < Math.abs(best.dday - t.dday) ? g : best), groups[0]);
    g.items.push({ id: "ai-" + g.items.length, dday: t.dday, text: t.text, for: "all", source: "AI 제안 · 공식 사이트에서 확인 필요", ai: true });
  }
  return NextResponse.json({ groups, travel, country: country.name, aiUsed: tips.length > 0 });
}
