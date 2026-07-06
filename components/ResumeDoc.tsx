"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { useState } from "react";
import type { ResumeData } from "@/lib/types";
import { Button, Spinner } from "@/components/ui";

/*
  Clean, ATS-friendly resume template rendered with @react-pdf/renderer.
  Uses the built-in Helvetica family (no network font fetch). Loaded client-side
  only (via next/dynamic ssr:false) so it never runs during SSR.
*/

const INK = "#111111";
const MUTED = "#555555";
const LINE = "#DDDDDD";
const ACCENT = "#E1261C";

const s = StyleSheet.create({
  page: {
    paddingVertical: 44,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: INK,
    lineHeight: 1.4,
  },
  name: { fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: -0.5 },
  headline: { fontSize: 10.5, color: ACCENT, marginTop: 2 },
  contact: { fontSize: 8.5, color: MUTED, marginTop: 5 },
  section: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: MUTED,
    marginTop: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 3,
  },
  summary: { color: "#333333" },
  role: { marginBottom: 8 },
  roleHead: { flexDirection: "row", justifyContent: "space-between" },
  roleTitle: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  roleCompany: { color: INK },
  roleMeta: { fontSize: 8.5, color: MUTED },
  bulletRow: { flexDirection: "row", marginTop: 2, paddingRight: 8 },
  bulletDot: { width: 10, color: ACCENT },
  bulletText: { flex: 1, color: "#222222" },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  skill: {
    fontSize: 8.5,
    color: "#222222",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 4,
    marginBottom: 4,
  },
  eduRow: { marginBottom: 4 },
  eduSchool: { fontFamily: "Helvetica-Bold" },
});

export function ResumeDoc({ resume }: { resume: ResumeData }) {
  const contact = [resume.email, resume.phone, resume.location, ...(resume.links ?? [])]
    .filter(Boolean)
    .join("   ·   ");
  return (
    <Document
      title={`${resume.name ?? "Resume"} — Resume`}
      author={resume.name ?? undefined}
    >
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{resume.name || "Your Name"}</Text>
        {resume.headline ? <Text style={s.headline}>{resume.headline}</Text> : null}
        {contact ? <Text style={s.contact}>{contact}</Text> : null}

        {resume.summary ? (
          <>
            <Text style={s.section}>Summary</Text>
            <Text style={s.summary}>{resume.summary}</Text>
          </>
        ) : null}

        {resume.experience?.length ? (
          <>
            <Text style={s.section}>Experience</Text>
            {resume.experience.map((exp, i) => (
              <View key={i} style={s.role} wrap={false}>
                <View style={s.roleHead}>
                  <Text style={s.roleTitle}>
                    {exp.title}
                    {exp.company ? (
                      <Text style={s.roleCompany}> — {exp.company}</Text>
                    ) : null}
                  </Text>
                  <Text style={s.roleMeta}>{exp.dates}</Text>
                </View>
                {exp.location ? (
                  <Text style={s.roleMeta}>{exp.location}</Text>
                ) : null}
                {exp.bullets?.map((b, j) => (
                  <View key={j} style={s.bulletRow}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {resume.skills?.length ? (
          <>
            <Text style={s.section}>Skills</Text>
            <View style={s.skillsWrap}>
              {resume.skills.map((sk, i) => (
                <Text key={i} style={s.skill}>
                  {sk}
                </Text>
              ))}
            </View>
          </>
        ) : null}

        {resume.projects?.length ? (
          <>
            <Text style={s.section}>Projects</Text>
            {resume.projects.map((p, i) => (
              <View key={i} style={s.eduRow} wrap={false}>
                <Text style={s.eduSchool}>{p.name}</Text>
                <Text style={s.bulletText}>{p.description}</Text>
              </View>
            ))}
          </>
        ) : null}

        {resume.education?.length ? (
          <>
            <Text style={s.section}>Education</Text>
            {resume.education.map((e, i) => (
              <View key={i} style={s.eduRow} wrap={false}>
                <View style={s.roleHead}>
                  <Text style={s.eduSchool}>{e.school}</Text>
                  <Text style={s.roleMeta}>{e.dates}</Text>
                </View>
                {e.degree ? <Text style={s.bulletText}>{e.degree}</Text> : null}
                {e.details ? <Text style={s.roleMeta}>{e.details}</Text> : null}
              </View>
            ))}
          </>
        ) : null}
      </Page>
    </Document>
  );
}

function safeName(name?: string | null) {
  return (name || "resume").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
}

export function DownloadResumeButton({
  resume,
  company,
}: {
  resume: ResumeData;
  company?: string;
}) {
  const [busy, setBusy] = useState(false);
  async function onClick() {
    setBusy(true);
    try {
      const blob = await pdf(<ResumeDoc resume={resume} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName(resume.name)}${
        company ? "_" + safeName(company) : ""
      }.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button variant="primary" size="sm" onClick={onClick} disabled={busy}>
      {busy ? <Spinner /> : <DownloadGlyph />}
      Download PDF
    </Button>
  );
}

function DownloadGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}
