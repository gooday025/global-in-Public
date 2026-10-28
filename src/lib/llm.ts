import Anthropic from "@anthropic-ai/sdk";
import { SIGNALS } from "./signals";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

export interface LlmSignal {
  id: string;
  quote: string;
  explanation: string;
}

export interface LlmResult {
  transcribed_text?: string;
  job: {
    title?: string;
    company?: string;
    country?: string;
    country_iso2?: string;
    city?: string;
    salary_text?: string;
    contact_channel?: string;
    visa_info?: string;
  };
  signals: LlmSignal[];
  mitigating: { quote: string; explanation: string }[];
  scam_probability: number;
  summary: string;
  questions_to_ask: string[];
}

const SIGNAL_GUIDE = SIGNALS.map((s) => `- ${s.id}: ${s.label} — ${s.why}`).join("\n") +
  "\n- high_pay: 경력·자격 요건에 비해 비현실적으로 높은 급여\n- other: 위 목록에 없지만 사기·감금·범죄 가담 위험을 높이는 표현";

const SYSTEM = `당신은 해외 취업·유학을 준비하는 한국 청년을 돕는 '공고 안전 점검' 도우미입니다.
입력된 구인 공고(또는 메시지)를 읽고, 해외취업 사기·감금·범죄 가담(보이스피싱, 대포통장, 불법도박 등)으로 이어질 위험 신호를 찾습니다.

원칙:
1. 근거는 반드시 공고 원문에서 그대로 복사한 짧은 구절(quote)로 제시합니다. 원문에 없는 말을 지어내지 않습니다.
2. 띄어쓰기·초성·기호로 바꿔 쓴 표현(예: 'ㅌㄹㄱㄹ', '텔 레 그 램', 'T.G', 'DM', '비밀 대화방', '프로필 링크')도 같은 의미로 판단합니다.
3. 정상 채용의 흔적(회사명·주소 공개, 공식 채용 경로, 정식 취업비자·노동허가, 구체적 자격요건, 다단계 면접)은 mitigating에 적습니다.
4. 숙식·항공권 제공, 경력 무관, 메신저 연락, 동남아 근무는 그 자체만으로는 사기가 아닙니다. 다른 신호와의 조합으로 판단합니다.
5. 단정하지 않습니다. scam_probability는 '이 공고가 사기·감금 위험 공고일 확률'을 0~1로 보수적으로 추정합니다.
6. summary는 지원자에게 하는 쉬운 존댓말 2문장 이내, questions_to_ask는 지원 전에 회사에 꼭 물어볼 질문 3개입니다.

위험 신호 목록(id):
${SIGNAL_GUIDE}`;

const TOOL: Anthropic.Tool = {
  name: "report_assessment",
  description: "공고의 위험 신호 평가 결과를 보고합니다.",
  input_schema: {
    type: "object",
    properties: {
      transcribed_text: { type: "string", description: "이미지가 입력된 경우에만: 이미지 속 공고 글자를 그대로 옮겨 적은 전문" },
      job: {
        type: "object",
        properties: {
          title: { type: "string" },
          company: { type: "string", description: "공고에 회사명이 없으면 빈 문자열" },
          country: { type: "string", description: "근무 국가(한국어)" },
          country_iso2: { type: "string", description: "근무 국가 ISO 3166-1 alpha-2 코드, 불명확하면 빈 문자열" },
          city: { type: "string" },
          salary_text: { type: "string" },
          contact_channel: { type: "string" },
          visa_info: { type: "string" },
        },
      },
      signals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", enum: [...SIGNALS.map((s) => s.id), "high_pay", "other"] },
            quote: { type: "string", description: "공고 원문에서 그대로 복사한 근거 구절(10~40자)" },
            explanation: { type: "string", description: "왜 위험한지 쉬운 말 한 문장" },
          },
          required: ["id", "quote", "explanation"],
        },
      },
      mitigating: {
        type: "array",
        items: {
          type: "object",
          properties: { quote: { type: "string" }, explanation: { type: "string" } },
          required: ["quote", "explanation"],
        },
      },
      scam_probability: { type: "number", minimum: 0, maximum: 1 },
      summary: { type: "string" },
      questions_to_ask: { type: "array", items: { type: "string" } },
    },
    required: ["job", "signals", "mitigating", "scam_probability", "summary", "questions_to_ask"],
  },
};

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 25_000, maxRetries: 1 });
  return client;
}

export function llmAvailable() {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function analyzeWithLlm(input: { text?: string; image?: { data: string; mediaType: string } }): Promise<LlmResult> {
  const c = getClient();
  if (!c) throw new Error("LLM_UNAVAILABLE");
  const content: Anthropic.ContentBlockParam[] = [];
  if (input.image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.image.mediaType as "image/png", data: input.image.data },
    });
    content.push({ type: "text", text: "이미지 속 구인 공고를 먼저 transcribed_text에 그대로 옮겨 적고, 그 글을 기준으로 평가해 주세요." + (input.text ? `\n\n추가로 붙여넣은 글:\n${input.text}` : "") });
  } else {
    content.push({ type: "text", text: `다음 공고를 평가해 주세요.\n\n<공고>\n${input.text}\n</공고>` });
  }
  const res = await c.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "report_assessment" },
    messages: [{ role: "user", content }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("LLM_NO_TOOL_OUTPUT");
  const out = block.input as LlmResult;
  out.scam_probability = Math.max(0, Math.min(1, Number(out.scam_probability) || 0));
  out.signals ??= [];
  out.mitigating ??= [];
  out.questions_to_ask ??= [];
  out.job ??= {};
  return out;
}
