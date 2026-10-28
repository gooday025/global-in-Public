import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { analyze, type Analysis } from "@/lib/analyze";
import { fetchPage, FetchPageError } from "@/lib/fetchPage";

export const maxDuration = 30;

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 12; // 1분 12회
}

// 같은 글은 1시간 동안 같은 결과를 돌려준다(예시 공고처럼 반복되는 요청이 AI 호출 한도를 쓰지 않게). 글 자체는 저장하지 않고 해시만 키로 쓴다.
const cache = new Map<string, { at: number; v: Analysis }>();
const keyOf = (t: string) => createHash("sha256").update(t.trim()).digest("hex");

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return NextResponse.json({ error: "요청이 너무 많습니다. 1분 뒤에 다시 시도하세요." }, { status: 429 });

  let body: { text?: string; url?: string; image?: { data: string; mediaType: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  let text = (body.text ?? "").slice(0, 4000);
  const image = body.image;
  let source: Analysis["source"] = { kind: image ? "image" : "text" };

  if (body.url) {
    try {
      const page = await fetchPage(body.url);
      text = page.text;
      source = { kind: "url", url: page.url, title: page.title };
    } catch (e) {
      const msg = e instanceof FetchPageError ? e.message : "링크에서 글을 가져오지 못했습니다. 공고 글을 복사해 붙여 넣어 주세요.";
      return NextResponse.json({ error: msg }, { status: 422 });
    }
  }

  if (!text.trim() && !image) return NextResponse.json({ error: "공고 글이나 링크를 넣거나 캡처 이미지를 올려 주세요." }, { status: 400 });
  if (image) {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(image.mediaType)) return NextResponse.json({ error: "PNG, JPG, WEBP 이미지만 올릴 수 있습니다." }, { status: 400 });
    if (image.data.length > 5_500_000) return NextResponse.json({ error: "이미지가 너무 큽니다. 4MB 이하로 올려 주세요." }, { status: 400 });
  }

  const k = !image ? keyOf(text) : null;
  const hit = k ? cache.get(k) : null;
  if (hit && Date.now() - hit.at < 3600_000) return NextResponse.json({ ...hit.v, source }, { headers: { "Cache-Control": "no-store" } });

  const result = await analyze({ text, image });
  if (!result.text) return NextResponse.json({ error: "이미지에서 글자를 읽지 못했습니다. 공고 글을 직접 붙여넣어 주세요." }, { status: 422 });
  result.source = source;
  if (k && result.mode === "hybrid") {
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    cache.set(k, { at: Date.now(), v: result });
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
