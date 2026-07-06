import type { JobData, ResumeData } from "@/lib/types";

/* Prompt builders for the Nemotron generation pipeline. Kept together so the
   output contracts (the JSON shapes) are easy to audit in one place. */

export const RESUME_STRUCTURE_SYSTEM = `You are a precise resume parser. Given the raw text of a resume, extract its contents into structured JSON. Do not invent, embellish, or omit real information. Preserve the candidate's exact wording for bullet points.

Return JSON with exactly this shape:
{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "links": string[],
  "headline": string | null,
  "summary": string | null,
  "skills": string[],
  "experience": [{ "company": string, "title": string, "dates": string | null, "location": string | null, "bullets": string[] }],
  "education": [{ "school": string, "degree": string | null, "dates": string | null, "details": string | null }],
  "projects": [{ "name": string, "description": string, "tech": string[] }]
}`;

export function resumeStructureUser(rawText: string) {
  return `Raw resume text:\n"""\n${rawText.slice(0, 16000)}\n"""`;
}

/* ----------------------------------------------------- JD extraction ---- */

export const JD_EXTRACT_SYSTEM = `You extract a clean, structured job description from messy web page text. Focus only on the role being advertised. Ignore navigation, cookie banners, unrelated jobs, and boilerplate. If the company name isn't explicit, infer it from context; otherwise use "Unknown".

Return JSON with exactly this shape:
{
  "title": string,
  "company": string,
  "location": string | null,
  "skills": string[],
  "responsibilities": string[],
  "qualifications": string[],
  "description": string,
  "companyContext": string | null
}`;

export function jdExtractUser(text: string, sourceUrl?: string) {
  return `${sourceUrl ? `Source URL: ${sourceUrl}\n\n` : ""}Page text:\n"""\n${text.slice(0, 16000)}\n"""`;
}

/* ------------------------------------------ Generation: resume + fit ---- */

export const TAILOR_SYSTEM = `You are an expert career strategist and resume writer. Using the candidate's baseline resume and a target job description, produce a TAILORED resume plus a fit analysis.

Rules:
- Never fabricate experience, employers, dates, degrees, or metrics. Only reorder, rephrase, and re-emphasise what already exists in the baseline.
- Surface the experience, skills, and bullet points most relevant to the job; you may rewrite bullets to foreground relevant impact and matching keywords, but they must remain truthful to the original.
- Keep the same set of jobs/education as the baseline (you may drop clearly irrelevant projects).
- fit.score is an honest 0–100 estimate of how well the candidate matches the role.
- missingKeywords = important skills/tools in the JD that are absent from the baseline resume.

Return JSON with exactly this shape:
{
  "tailoredResume": { "name": string|null, "email": string|null, "phone": string|null, "location": string|null, "links": string[], "headline": string|null, "summary": string|null, "skills": string[], "experience": [{ "company": string, "title": string, "dates": string|null, "location": string|null, "bullets": string[] }], "education": [{ "school": string, "degree": string|null, "dates": string|null, "details": string|null }], "projects": [{ "name": string, "description": string, "tech": string[] }] },
  "resumeChangeNotes": string[],
  "fit": { "score": number, "matchedSkills": string[], "missingKeywords": string[], "summary": string }
}`;

/* -------------------------------- Generation: letters + interview ------- */

export const OUTREACH_SYSTEM = `You are an expert career strategist. Using the candidate's resume and the target job, write outreach materials and interview prep. Be specific: map the candidate's REAL achievements to the company's stated needs. Match tone to the company culture implied by the JD. No clichés, no fluff, no invented facts.

Return JSON with exactly this shape:
{
  "coverLetter": string,                      // ~250-320 words, addressed appropriately, no placeholders like [Company]
  "followUpEmail": { "subject": string, "body": string },  // concise cold/follow-up email to the founder or hiring manager
  "interviewQuestions": [{ "question": string, "strategy": string[] }],  // EXACTLY 7, each with 2-4 strategy bullets
  "uniquePitch": string                       // 1 tight paragraph: why THIS candidate for THIS role
}`;

export function generationUser(resume: ResumeData, job: JobData) {
  return `BASELINE RESUME (JSON):\n${JSON.stringify(resume).slice(0, 12000)}\n\nTARGET JOB (JSON):\n${JSON.stringify(job).slice(0, 8000)}`;
}
