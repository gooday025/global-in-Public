// LLM 공급자 추상화: GEMINI_API_KEY가 있으면 Gemini, 없고 ANTHROPIC_API_KEY가 있으면 Claude.
import Anthropic from "@anthropic-ai/sdk";

export type JsonSchema = {
  type: "object" | "array" | "string" | "number" | "integer" | "boolean";
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: string[];
};

// 환경변수에 공백·따옴표가 섞여 들어가도 동작하도록 정리한다.
const gkey = () => (process.env.GEMINI_API_KEY ?? "").trim().replace(/^["']|["']$/g, "");

export function provider(): "gemini" | "anthropic" | null {
  if (gkey()) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
let geminiModel: string | null = process.env.GEMINI_MODEL || null;
let geminiList: string[] | null = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : null;
export let usedModel: string | null = null;
export let lastListError: string | null = null;
export let lastCallError: string | null = null;
let forcedModel: string | undefined;
export const setForcedModel = (m?: string) => { forcedModel = m || undefined; };
export const attemptLog: string[] = [];

// 키로 쓸 수 있는 모델 중 텍스트·이미지 입력이 되는 최신 flash 계열을 고른다.
export async function pickGeminiModel(): Promise<string> {
  if (geminiModel) return geminiModel;
  await candidates();
  return geminiModel!;
}

// 사용 가능한 flash 모델을 최신순으로 정렬해 둔다. 최신 모델이 과부하(503)면 다음 모델로 넘어간다.
export async function candidates(): Promise<string[]> {
  if (geminiList) return geminiList;
  const r = await fetch(`${GEMINI}/models?pageSize=200`, { headers: { "x-goog-api-key": gkey() }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) {
    // 목록 조회가 막혀도 키가 유효하면 별칭 모델로 동작한다. 상세 사유는 /api/health에 남긴다.
    lastListError = `GEMINI_LIST_${r.status}: ${(await r.text()).slice(0, 160)}`;
    geminiModel = "gemini-flash-latest";
    geminiList = [geminiModel, "gemini-2.5-flash"];
    return geminiList;
  }
  const j = (await r.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  const names = (j.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => /flash/.test(n) && !/(image|tts|audio|live|exp|preview|thinking|8b|embedding)/.test(n));
  const score = (n: string) => {
    const v = parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) ?? [])[1] ?? "0");
    return v * 10 - (/lite/.test(n) ? 3 : 0) - (/-\d{3}$/.test(n) ? 0.5 : 0);
  };
  names.sort((a, b) => score(b) - score(a));
  if (!names.length) throw new Error("GEMINI_NO_MODEL");
  geminiModel = names[0];
  // 최신 모델은 출시 직후 과부하로 응답이 느려, 시험에서 안정적이던 3.5 flash를 먼저 쓰고 나머지는 대체용으로 둔다.
  const first = names.filter((n) => /^gemini-3\.5-flash$/.test(n));
  geminiList = [...first, ...names.slice(0, 5), "gemini-flash-latest"].filter((n, i, a) => a.indexOf(n) === i);
  geminiModel = geminiList[0];
  return geminiList;
}

export async function modelName(): Promise<string> {
  const p = provider();
  if (p === "gemini") return pickGeminiModel();
  if (p === "anthropic") return process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
  return "none";
}

function toGeminiSchema(s: JsonSchema): Record<string, unknown> {
  const o: Record<string, unknown> = { type: s.type.toUpperCase() };
  if (s.description) o.description = s.description;
  if (s.enum) o.enum = s.enum;
  if (s.properties) o.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, toGeminiSchema(v)]));
  if (s.items) o.items = toGeminiSchema(s.items);
  if (s.required) o.required = s.required;
  return o;
}

// 추론(생각) 단계를 최소로 줄여 응답 시간을 맞춘다. 3.x는 thinkingLevel, 2.5는 thinkingBudget을 쓴다.
function thinkingFor(model: string): Record<string, unknown> {
  return /gemini-2\./.test(model) ? { thinkingBudget: 0 } : { thinkingLevel: "low" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function jsonCall<T>(opts: {
  system: string;
  text: string;
  image?: { data: string; mediaType: string };
  schema: JsonSchema;
  name: string;
  maxTokens?: number;
  timeoutMs?: number;
  model?: string;
}): Promise<T> {
  const p = provider();
  if (!p) throw new Error("LLM_UNAVAILABLE");
  if (p === "gemini") {
    const pin = opts.model ?? forcedModel;
    const models = pin ? [pin] : await candidates();
    let mi = 0;
    const parts: Record<string, unknown>[] = [];
    if (opts.image) parts.push({ inline_data: { mime_type: opts.image.mediaType, data: opts.image.data } });
    parts.push({ text: opts.text });
    const bodyFor = (model: string) => ({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", responseSchema: toGeminiSchema(opts.schema), temperature: 0, maxOutputTokens: opts.maxTokens ?? 4096, thinkingConfig: thinkingFor(model) },
    });
    const t0 = Date.now();
    const budget = opts.timeoutMs ?? 28_000;
    for (let attempt = 0; attempt < 6; attempt++) {
      const model = models[Math.min(mi, models.length - 1)];
      const left = budget - (Date.now() - t0);
      if (left < 3000) break;
      // 응답이 없는 모델에 시간을 다 쓰지 않도록 시도당 상한을 두고, 초과하면 다음 모델로 넘어간다.
      const cap = Math.min(left, opts.image ? 15_000 : 9_000);
      let r: Response;
      try {
        r = await fetch(`${GEMINI}/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": gkey() },
          body: JSON.stringify(bodyFor(model)),
          signal: AbortSignal.timeout(cap),
        });
      } catch (e) {
        attemptLog.push(`${model}:timeout@${Date.now() - t0}ms`);
        lastCallError = `GEMINI_TIMEOUT: ${(e as Error).message}`;
        if (mi < models.length - 1) mi++;
        continue;
      }
      if (r.status === 429 || r.status >= 500) {
        const t = await r.text();
        const m = t.match(/"retryDelay":\s*"(\d+)s"/);
        lastCallError = `GEMINI_${r.status}: ${t.slice(0, 300)}`;
        attemptLog.push(`${model}:${r.status}@${Date.now() - t0}ms`);
        if (mi < models.length - 1) mi++;
        else await sleep(Math.min(3, m ? Number(m[1]) + 1 : 1) * 1000);
        continue;
      }
      if (!r.ok) throw new Error(`GEMINI_${r.status}: ${(await r.text()).slice(0, 200)}`);
      const j = await r.json();
      const txt: string = (j.candidates?.[0]?.content?.parts ?? []).map((x: { text?: string }) => x.text ?? "").join("");
      if (!txt) throw new Error("GEMINI_EMPTY");
      usedModel = model;
      return JSON.parse(txt) as T;
    }
    throw new Error("GEMINI_RATE_LIMIT");
  }
  const c = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: opts.timeoutMs ?? 25_000, maxRetries: 1 });
  const content: Anthropic.ContentBlockParam[] = [];
  if (opts.image) content.push({ type: "image", source: { type: "base64", media_type: opts.image.mediaType as "image/png", data: opts.image.data } });
  content.push({ type: "text", text: opts.text });
  const res = await c.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
    max_tokens: opts.maxTokens ?? 1500,
    system: opts.system,
    tools: [{ name: opts.name, description: "결과를 보고합니다.", input_schema: opts.schema as Anthropic.Tool.InputSchema }],
    tool_choice: { type: "tool", name: opts.name },
    messages: [{ role: "user", content }],
  });
  const b = res.content.find((x) => x.type === "tool_use");
  if (!b || b.type !== "tool_use") throw new Error("LLM_NO_TOOL_OUTPUT");
  return b.input as T;
}
