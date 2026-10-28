import { NextResponse } from "next/server";
import { analyze } from "@/lib/analyze";

export const maxDuration = 30;

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 12; // 1분 12회
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "요청이 너무 많습니다. 1분 뒤에 다시 시도하세요." }, { status: 429 });

  let body: { text?: string; image?: { data: string; mediaType: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const text = (body.text ?? "").slice(0, 4000);
  const image = body.image;
  if (!text.trim() && !image) return NextResponse.json({ error: "공고 글을 붙여넣거나 캡처 이미지를 올려 주세요." }, { status: 400 });
  if (image) {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(image.mediaType)) return NextResponse.json({ error: "PNG, JPG, WEBP 이미지만 올릴 수 있습니다." }, { status: 400 });
    if (image.data.length > 5_500_000) return NextResponse.json({ error: "이미지가 너무 큽니다. 4MB 이하로 올려 주세요." }, { status: 400 });
  }
  const result = await analyze({ text, image });
  if (!result.text) return NextResponse.json({ error: "이미지에서 글자를 읽지 못했습니다. 공고 글을 직접 붙여넣어 주세요." }, { status: 422 });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
