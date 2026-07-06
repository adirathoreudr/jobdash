import OpenAI from "openai";

/*
  NVIDIA Nemotron via the OpenAI-compatible NIM endpoint.
  Key + base URL + model come from env (see .env.example). The key is only
  ever read here, server-side.
*/

const BASE_URL =
  process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
const MODEL = process.env.NVIDIA_MODEL || "nvidia/nemotron-3-super-120b-a12b";

export function isNvidiaConfigured() {
  return Boolean(process.env.NVIDIA_API_KEY);
}

export class NvidiaNotConfiguredError extends Error {
  constructor() {
    super(
      "NVIDIA_API_KEY is not set. Add it to .env.local (get a free key at https://build.nvidia.com)."
    );
    this.name = "NvidiaNotConfiguredError";
  }
}

let client: OpenAI | null = null;
function getClient() {
  if (!isNvidiaConfigured()) throw new NvidiaNotConfiguredError();
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: BASE_URL,
    });
  }
  return client;
}

/** Strip Nemotron reasoning traces + code fences, then isolate the JSON body. */
function extractJsonBlock(raw: string): string {
  let s = raw.trim();
  // Remove <think>…</think> reasoning if the model emitted any.
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Strip ```json … ``` fences.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // Fall back to the outermost {...} / [...] span.
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  let start = -1;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  if (start > 0) s = s.slice(start);
  const lastObj = s.lastIndexOf("}");
  const lastArr = s.lastIndexOf("]");
  const end = Math.max(lastObj, lastArr);
  if (end !== -1) s = s.slice(0, end + 1);
  return s.trim();
}

type ChatJSONOptions = {
  temperature?: number;
  maxTokens?: number;
};

/**
 * Run a single completion that must return JSON, and parse it into T.
 * Nemotron is instructed to disable extended reasoning and emit JSON only.
 */
export async function chatJSON<T>(
  system: string,
  user: string,
  opts: ChatJSONOptions = {}
): Promise<T> {
  const openai = getClient();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 4000,
    // Many NIM models honour this; harmless where unsupported.
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "detailed thinking off\n" +
          system +
          "\n\nRespond with a single valid JSON value and nothing else. " +
          "No markdown, no code fences, no commentary.",
      },
      { role: "user", content: user },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const jsonText = extractJsonBlock(raw);
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    throw new Error(
      "The AI returned a response that could not be parsed as JSON. Please try again."
    );
  }
}

/** Plain-text completion (used for prose where JSON would be overkill). */
export async function chatText(
  system: string,
  user: string,
  opts: ChatJSONOptions = {}
): Promise<string> {
  const openai = getClient();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: opts.temperature ?? 0.5,
    max_tokens: opts.maxTokens ?? 1500,
    messages: [
      { role: "system", content: "detailed thinking off\n" + system },
      { role: "user", content: user },
    ],
  });
  return (completion.choices[0]?.message?.content ?? "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
}
