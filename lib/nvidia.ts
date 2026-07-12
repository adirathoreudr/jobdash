import OpenAI from "openai";

/*
  NVIDIA Nemotron via the OpenAI-compatible NIM endpoint.
  Key + base URL + model come from env (see .env.example). The key is only
  ever read here, server-side.
*/

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";

/**
 * Resolve the API base URL, healing the most common misconfiguration:
 * pasting a build.nvidia.com model-page URL (a website) instead of the API
 * endpoint. The website returns HTML, which the SDK can't use.
 */
function resolveBaseUrl(): string {
  const raw = (process.env.NVIDIA_BASE_URL || "").trim().replace(/\/+$/, "");
  if (!raw) return DEFAULT_BASE_URL;
  try {
    const u = new URL(raw);
    // NVIDIA *website* hosts people paste by mistake (model catalog pages).
    const websiteHosts = [
      "build.nvidia.com",
      "www.nvidia.com",
      "nvidia.com",
      "catalog.ngc.nvidia.com",
      "developer.nvidia.com",
    ];
    if (websiteHosts.includes(u.hostname)) {
      console.warn(
        `NVIDIA_BASE_URL points at ${u.hostname} (a website, not the API); using ${DEFAULT_BASE_URL} instead.`
      );
      return DEFAULT_BASE_URL;
    }
    // Right API host but missing the /v1 path.
    if (u.hostname === "integrate.api.nvidia.com" && !u.pathname.startsWith("/v1")) {
      return `${u.origin}/v1`;
    }
    return raw; // custom proxies / self-hosted NIM / localhost stay untouched
  } catch {
    console.warn(
      `NVIDIA_BASE_URL is not a valid URL; using ${DEFAULT_BASE_URL} instead.`
    );
    return DEFAULT_BASE_URL;
  }
}

const BASE_URL = resolveBaseUrl();
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

type ChatMessage = { role: "system" | "user"; content: string };
type CompletionLike = {
  choices?: { message?: { content?: string | null } }[];
  [key: string]: unknown;
};

/**
 * Run a chat completion against NIM and return the message text.
 * Hardened for NVIDIA-specific behaviour:
 *  - 202 "still processing" responses (long generations) are polled via the
 *    NVCF status endpoint until the completion is ready
 *  - responses without a `choices` array raise a readable error instead of a
 *    TypeError, with the body logged server-side for diagnosis
 *  - API errors (bad key, unknown model, rate limits) become human messages
 */
async function completeText(
  messages: ChatMessage[],
  opts: ChatJSONOptions
): Promise<string> {
  const openai = getClient();

  let completion: CompletionLike;
  try {
    const { data, response } = await openai.chat.completions
      .create({
        model: MODEL,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 4000,
        messages,
      })
      .withResponse();
    completion = data as unknown as CompletionLike;

    // NVIDIA NIM returns 202 + NVCF-REQID when generation outlives the
    // request window; the body has no `choices` until we poll for the result.
    if (response.status === 202) {
      const reqId =
        response.headers.get("NVCF-REQID") ||
        (completion?.requestId as string | undefined);
      if (!reqId) {
        throw new Error(
          "NVIDIA accepted the request (202) but returned no request id to poll."
        );
      }
      completion = await pollNvcfResult(reqId);
    }
  } catch (e) {
    throw asFriendlyError(e);
  }

  // A string body (HTML page) means the base URL points at a website,
  // not the API — e.g. a build.nvidia.com model page.
  if (typeof (completion as unknown) === "string") {
    console.error(
      "NVIDIA returned a non-JSON (webpage) response:",
      String(completion).slice(0, 300)
    );
    throw new Error(
      "NVIDIA returned a webpage instead of an API response. Set NVIDIA_BASE_URL to https://integrate.api.nvidia.com/v1 (Vercel → Settings → Environment Variables) and redeploy."
    );
  }

  const message = completion?.choices?.[0]?.message;
  if (!message) {
    // Log the raw body so Vercel logs show WHAT NVIDIA actually sent.
    console.error(
      "NVIDIA NIM returned no choices:",
      JSON.stringify(completion).slice(0, 800)
    );
    const detail =
      (completion as { detail?: string; title?: string })?.detail ||
      (completion as { error?: { message?: string } })?.error?.message ||
      "";
    throw new Error(
      `The NVIDIA API returned an unexpected response${detail ? `: ${detail}` : ""}. ` +
        "Check NVIDIA_MODEL and try again."
    );
  }
  return (message.content ?? "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
}

/** Poll integrate.api.nvidia.com's status endpoint until the job finishes. */
async function pollNvcfResult(reqId: string): Promise<CompletionLike> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2500));
    const res = await fetch(`${BASE_URL}/status/${reqId}`, {
      headers: {
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        Accept: "application/json",
      },
    });
    if (res.status === 202) continue; // still working
    if (!res.ok) {
      throw new Error(
        `NVIDIA polling failed (${res.status}). Please try again.`
      );
    }
    return (await res.json()) as CompletionLike;
  }
  throw new Error("The AI request timed out. Please try again.");
}

/** Translate SDK/API failures into messages a user can act on. */
function asFriendlyError(e: unknown): Error {
  if (e instanceof OpenAI.APIError) {
    const status = e.status;
    if (status === 401 || status === 403) {
      return new Error(
        "NVIDIA rejected the API key. Check NVIDIA_API_KEY (build.nvidia.com) in your environment variables."
      );
    }
    if (status === 404) {
      return new Error(
        `NVIDIA doesn't recognise the model "${MODEL}". Check NVIDIA_MODEL in your environment variables.`
      );
    }
    if (status === 429) {
      return new Error(
        "NVIDIA rate limit reached (free tier). Wait a moment and try again."
      );
    }
    return new Error(`NVIDIA API error (${status ?? "network"}): ${e.message}`);
  }
  return e instanceof Error ? e : new Error(String(e));
}

/**
 * Run a single completion that must return JSON, and parse it into T.
 * Nemotron is instructed to disable extended reasoning and emit JSON only.
 */
export async function chatJSON<T>(
  system: string,
  user: string,
  opts: ChatJSONOptions = {}
): Promise<T> {
  const raw = await completeText(
    [
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
    { temperature: opts.temperature ?? 0.4, maxTokens: opts.maxTokens ?? 4000 }
  );

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
  return completeText(
    [
      { role: "system", content: "detailed thinking off\n" + system },
      { role: "user", content: user },
    ],
    { temperature: opts.temperature ?? 0.5, maxTokens: opts.maxTokens ?? 1500 }
  );
}
