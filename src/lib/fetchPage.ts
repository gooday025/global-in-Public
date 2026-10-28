// 공고 링크(URL)에서 본문 글을 가져온다. 공개된 페이지만 대상으로 하고, 내부망 주소는 막는다.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class FetchPageError extends Error {}

function privateIp(ip: string) {
  if (isIP(ip) === 6) return /^(::1|fc|fd|fe80|::ffff:(10|127|192\.168|169\.254|172\.(1[6-9]|2\d|3[01]))\.)/i.test(ip);
  return /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip);
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function htmlToText(html: string): { title: string; text: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const og = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i)?.[1] ?? "";
  let body = html
    .replace(/<(script|style|noscript|svg|head|nav|footer|header|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const decode = (s: string) =>
    s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] === "#") return String.fromCodePoint(parseInt(e.slice(1).replace(/^x/i, ""), e[1]?.toLowerCase() === "x" ? 16 : 10));
      return ENT[e.toLowerCase()] ?? m;
    });
  body = decode(body)
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .filter((l) => l.length > 1)
    .join("\n");
  const text = (body.length < 80 && og ? decode(og) + "\n" + body : body).slice(0, 4000);
  return { title: decode(title).slice(0, 120), text };
}

async function checkHost(u: URL) {
  if (!/^https?:$/.test(u.protocol)) throw new FetchPageError("https:// 또는 http:// 주소만 확인할 수 있습니다.");
  if (u.port && !["80", "443"].includes(u.port)) throw new FetchPageError("이 주소는 확인할 수 없습니다.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new FetchPageError("이 주소는 확인할 수 없습니다.");
  try {
    const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (addrs.some((a) => privateIp(a.address))) throw new FetchPageError("이 주소는 확인할 수 없습니다.");
  } catch (e) {
    if (e instanceof FetchPageError) throw e;
    throw new FetchPageError("사이트 주소를 찾지 못했습니다. 링크를 다시 확인해 주세요.");
  }
}

export async function fetchPage(raw: string): Promise<{ url: string; title: string; text: string }> {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new FetchPageError("링크 형식이 올바르지 않습니다. https://로 시작하는 주소를 넣어 주세요.");
  }
  let r: Response | null = null;
  // 리다이렉트는 한 단계씩 따라가며 매번 주소를 다시 검사한다.
  for (let hop = 0; hop < 4; hop++) {
    await checkHost(u);
    try {
      r = await fetch(u, {
        redirect: "manual",
        signal: AbortSignal.timeout(7000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; GlobalInChecker/1.0; +https://global-in-public.vercel.app/trust)", Accept: "text/html,*/*;q=0.5", "Accept-Language": "ko,en;q=0.8" },
      });
    } catch {
      throw new FetchPageError("사이트가 응답하지 않습니다. 공고 글을 복사해 붙여 넣어 주세요.");
    }
    const loc = r.status >= 300 && r.status < 400 ? r.headers.get("location") : null;
    if (!loc) break;
    u = new URL(loc, u);
    r = null;
  }
  if (!r) throw new FetchPageError("주소가 여러 번 다른 곳으로 넘어가 확인하지 못했습니다. 공고 글을 복사해 붙여 넣어 주세요.");
  if (!r.ok) throw new FetchPageError(`사이트가 글을 내주지 않았습니다(${r.status}). 로그인이 필요한 페이지일 수 있어요. 공고 글을 복사해 붙여 넣거나 캡처를 올려 주세요.`);
  const type = r.headers.get("content-type") ?? "";
  if (!/text\/html|text\/plain|xml/.test(type)) throw new FetchPageError("웹페이지가 아닌 파일입니다. 공고 글을 복사해 붙여 넣어 주세요.");
  const buf = await r.arrayBuffer();
  const html = new TextDecoder(/euc-kr|ks_c_5601/i.test(type) ? "euc-kr" : "utf-8").decode(buf.slice(0, 1_500_000));
  const { title, text } = htmlToText(html);
  if (text.replace(/\s/g, "").length < 40) throw new FetchPageError("이 페이지에서 공고 글을 찾지 못했습니다(앱 전용 화면이거나 로그인 필요). 공고 글을 복사해 붙여 넣거나 캡처를 올려 주세요.");
  return { url: u.toString(), title, text };
}
