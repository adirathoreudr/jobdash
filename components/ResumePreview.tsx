import type { ResumeData } from "@/lib/types";

/** On-screen HTML preview of the tailored resume (mirrors the PDF template). */
export function ResumePreview({ resume }: { resume: ResumeData }) {
  const contact = [
    resume.email,
    resume.phone,
    resume.location,
    ...(resume.links ?? []),
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="thin-scroll max-h-[560px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-line)] bg-white p-7 text-[13px] leading-relaxed text-[#1a1a1a] shadow-sm">
      <div className="text-2xl font-bold tracking-tight text-black">
        {resume.name || "Your Name"}
      </div>
      {resume.headline && (
        <div className="mt-0.5 text-[var(--color-accent)]">{resume.headline}</div>
      )}
      {contact && <div className="mt-1.5 text-xs text-[#666]">{contact}</div>}

      {resume.summary && (
        <Section title="Summary">
          <p className="text-[#333]">{resume.summary}</p>
        </Section>
      )}

      {resume.experience?.length > 0 && (
        <Section title="Experience">
          <div className="space-y-3">
            {resume.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-semibold">
                    {exp.title}
                    {exp.company && (
                      <span className="font-normal"> — {exp.company}</span>
                    )}
                  </div>
                  <div className="shrink-0 text-xs text-[#777]">{exp.dates}</div>
                </div>
                {exp.location && (
                  <div className="text-xs text-[#777]">{exp.location}</div>
                )}
                <ul className="mt-1 space-y-1">
                  {exp.bullets?.map((b, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-[var(--color-accent)]">•</span>
                      <span className="text-[#222]">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {resume.skills?.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {resume.skills.map((sk, i) => (
              <span
                key={i}
                className="rounded border border-[#e2e2e2] px-2 py-0.5 text-xs text-[#333]"
              >
                {sk}
              </span>
            ))}
          </div>
        </Section>
      )}

      {resume.projects && resume.projects.length > 0 && (
        <Section title="Projects">
          <div className="space-y-2">
            {resume.projects.map((p, i) => (
              <div key={i}>
                <div className="font-semibold">{p.name}</div>
                <div className="text-[#333]">{p.description}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {resume.education?.length > 0 && (
        <Section title="Education">
          <div className="space-y-2">
            {resume.education.map((e, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-semibold">{e.school}</div>
                  <div className="shrink-0 text-xs text-[#777]">{e.dates}</div>
                </div>
                {e.degree && <div className="text-[#333]">{e.degree}</div>}
                {e.details && <div className="text-xs text-[#777]">{e.details}</div>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-1.5 border-b border-[#e2e2e2] pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#777]">
        {title}
      </div>
      {children}
    </div>
  );
}
