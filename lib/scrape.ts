import * as cheerio from "cheerio";

/*
  Best-effort job-page scraper. Direct company boards / ATS pages (Greenhouse,
  Lever, Ashby, most /careers pages) extract cleanly. Auth-walled aggregators
  (LinkedIn, Wellfound, Glassdoor, Indeed) block bots — for those we surface a
  "paste the description" fallback rather than pretending.
*/

export class BlockedError extends Error {
  constructor(
    message = "This site blocks automated reading. Paste the job description instead."
  ) {
    super(message);
    this.name = "BlockedError";
  }
}

// Hosts that reliably require a login / return anti-bot challenges.
const KNOWN_BLOCKED = [
  "linkedin.com",
  "wellfound.com",
  "angel.co",
  "glassdoor.com",
  "indeed.com",
  "ziprecruiter.com",
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isLikelyBlockedHost(url: string): boolean {
  const host = hostOf(url);
  return KNOWN_BLOCKED.some((b) => host === b || host.endsWith(`.${b}`));
}

export type ScrapeResult = {
  text: string;
  title?: string;
  company?: string;
};

/** Pull a schema.org JobPosting out of embedded JSON-LD, if present. */
function readJsonLdJob($: cheerio.CheerioAPI): ScrapeResult | null {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const el of scripts) {
    const raw = $(el).contents().text();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const nodes: any[] = Array.isArray(parsed)
      ? parsed
      : (parsed as any)?.["@graph"]
        ? (parsed as any)["@graph"]
        : [parsed];
    for (const node of nodes) {
      const type = node?.["@type"];
      const isJob = Array.isArray(type)
        ? type.includes("JobPosting")
        : type === "JobPosting";
      if (isJob) {
        const desc =
          typeof node.description === "string"
            ? node.description.replace(/<[^>]+>/g, " ")
            : "";
        const company =
          node.hiringOrganization?.name ??
          (typeof node.hiringOrganization === "string"
            ? node.hiringOrganization
            : undefined);
        if (desc && desc.length > 200) {
          return {
            text: collapse(`${node.title ?? ""}\n${desc}`),
            title: node.title,
            company,
          };
        }
      }
    }
  }
  return null;
}

function collapse(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .trim();
}

/** Strip chrome and pull the main readable text out of an HTML document. */
function readableText($: cheerio.CheerioAPI): string {
  $(
    "script, style, noscript, svg, nav, header, footer, form, iframe, [aria-hidden='true']"
  ).remove();
  const container = $("main").first().length
    ? $("main").first()
    : $("[role='main']").first().length
      ? $("[role='main']").first()
      : $("article").first().length
        ? $("article").first()
        : $("body");
  const text = container.text().replace(/[ \t]+/g, " ");
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const LOGIN_MARKERS =
  /(sign in to continue|please log in|authwall|join to view|security verification|are you a human|enable javascript|captcha)/i;

export async function scrapeJobPage(url: string): Promise<ScrapeResult> {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Please enter a full URL starting with http(s)://");
  }
  if (isLikelyBlockedHost(url)) {
    throw new BlockedError();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch {
    throw new BlockedError(
      "Couldn't reach that page. Paste the job description instead."
    );
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401 || res.status === 403 || res.status === 429 || res.status === 999) {
    throw new BlockedError();
  }
  const finalUrl = res.url || url;
  if (/\/(login|signin|authwall|challenge)/i.test(finalUrl)) {
    throw new BlockedError();
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const jsonLd = readJsonLdJob($);
  if (jsonLd) return jsonLd;

  const title = $("title").first().text().trim() || undefined;
  const text = readableText($);

  if (text.length < 400 || LOGIN_MARKERS.test(html.slice(0, 4000))) {
    throw new BlockedError();
  }
  return { text: text.slice(0, 20000), title };
}
