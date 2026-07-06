import { extractText, getDocumentProxy } from "unpdf";

/**
 * Extract plain text from a PDF buffer using unpdf (a serverless-safe pdf.js
 * build — no native canvas needed for text extraction).
 */
export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(data);
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  // `text` is a string when mergePages is true.
  const merged = Array.isArray(text) ? text.join("\n") : text;
  // Normalise non-breaking spaces (U+00A0) to regular spaces and collapse
  // excess blank lines so the LLM sees clean text.
  return merged
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
