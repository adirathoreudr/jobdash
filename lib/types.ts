// Shared domain types used across the app + API boundary.

export type ResumeExperience = {
  company: string;
  title: string;
  dates?: string;
  location?: string;
  bullets: string[];
};

export type ResumeEducation = {
  school: string;
  degree?: string;
  dates?: string;
  details?: string;
};

/** Structured form of the user's baseline resume (the anchor context). */
export type ResumeData = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: string[];
  headline?: string;
  summary?: string;
  skills: string[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  projects?: { name: string; description: string; tech?: string[] }[];
};

export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  rawText: string;
  structured: ResumeData | null;
  updatedAt: string;
};

/** Extracted job description + context. */
export type JobData = {
  title: string;
  company: string;
  location?: string;
  skills: string[];
  responsibilities?: string[];
  qualifications?: string[];
  description: string;
  companyContext?: string;
  sourceUrl?: string;
};

export type InterviewQuestion = {
  question: string;
  strategy: string[]; // strategic bullet points on how to answer
};

/** Everything the generation engine produces for one job (State 2). */
export type Artifacts = {
  tailoredResume: ResumeData;
  resumeChangeNotes: string[]; // what was emphasised/added vs the baseline
  coverLetter: string;
  followUpEmail: { subject: string; body: string };
  interviewQuestions: InterviewQuestion[]; // exactly 7
  uniquePitch: string;
  fit: {
    score: number; // 0–100
    matchedSkills: string[];
    missingKeywords: string[];
    summary: string;
  };
};

export type ApplicationRecord = {
  id: string;
  company: string;
  role: string;
  url: string | null;
  status: string;
  fitScore: number | null;
  notionPageId: string | null;
  appliedAt: string;
};
