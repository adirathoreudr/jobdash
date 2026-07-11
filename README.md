# JobDash

A minimal, editorial AI studio for job applications. Upload your resume once,
paste any job, and get a tailored resume, cover letter, follow-up email,
interview prep, and a unique pitch — then track every application (optionally
synced to Notion).

Built with **Next.js 15**, **Tailwind v4**, **Prisma + Postgres**, and
**NVIDIA Nemotron** (via the OpenAI-compatible NIM endpoint).

---

## Quick start

```bash
pnpm install
cp .env.example .env           # then fill in the values (see below)
pnpm db:push                   # create the tables in your Postgres
pnpm dev                       # http://localhost:3000
```

> Use **`.env`**, not `.env.local`. Next.js reads both, but the Prisma CLI
> (`prisma db push`, `prisma studio`) only reads `.env` — keeping everything
> in one file avoids commands silently seeing different variables.

## ⭐ Where the NVIDIA Nemotron API key goes

1. Get a free key at **https://build.nvidia.com** → open any Nemotron model →
   **Get API Key**.
2. Put it in **`.env`**:
   ```
   NVIDIA_API_KEY=nvapi-xxxxxxxx
   NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
   NVIDIA_MODEL=nvidia/nemotron-3-super-120b-a12b
   ```
3. On **Vercel**: Project → Settings → Environment Variables → add the same
   keys. It is only ever read server-side (`lib/nvidia.ts`); `.env` is
   gitignored.

## Environment variables

| Variable             | Required | Purpose                                            |
| -------------------- | -------- | -------------------------------------------------- |
| `NVIDIA_API_KEY`     | ✅       | Nemotron access (build.nvidia.com)                 |
| `NVIDIA_BASE_URL`    | ✅       | `https://integrate.api.nvidia.com/v1`              |
| `NVIDIA_MODEL`       | ✅       | e.g. `nvidia/nemotron-3-super-120b-a12b`           |
| `DATABASE_URL`       | ✅       | Postgres (Neon / Vercel Postgres), pooled string   |
| `NOTION_TOKEN`       | optional | Internal integration secret for Notion sync        |
| `NOTION_DATABASE_ID` | optional | Target Notion database for logged applications     |

See `.env.example` for detailed setup notes (including Notion).

## The flow

1. **Onboard** — drop your baseline resume (`.pdf`). It's parsed and stored.
2. **Point at a job** — paste a URL; JobDash reads the description. If the site
   blocks scraping (LinkedIn/Wellfound), paste the description instead.
3. **Generate** — a tailored resume (PDF export), cover letter, follow-up
   email, 7 interview questions with strategy, and a unique pitch.
4. **Track** — "Did you apply?" → logs it locally and (optionally) to Notion.
   Review everything at `/history`.

## Smart extras built in

- **Fit score + gap analysis** — an honest 0–100 match with the skills you
  already cover and the JD keywords you're missing.
- **Generation cache** — revisiting a job URL you already generated for
  restores the documents instantly instead of re-billing the LLM
  (with a one-click Regenerate).
- **Status pipeline** — flip Applied → Interview → Offer / Rejected inline in
  `/history`; the change is mirrored to Notion when the row is synced.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel (framework auto-detects).
2. Add the environment variables above (Settings → Environment Variables).
3. Provision Postgres (Vercel → Storage → Postgres, or neon.tech) and set
   `DATABASE_URL` to the **pooled** string.
4. Run `pnpm db:push` once locally against that URL to create the tables.
5. Deploy. `pnpm build` runs `prisma generate` automatically.

Scraping note: LinkedIn/Wellfound/Indeed block *all* server-side readers —
that's not a bug; the UI falls back to paste-the-JD for those. Direct company
boards (Greenhouse, Lever, Ashby, `/careers` pages) extract automatically.

## Ideas for later

- Follow-up nudges ("no reply in 7 days → send the follow-up email")
- Baseline vs. tailored resume diff view
- Export the whole dashboard as one PDF packet
- Weekly pipeline digest (email or Notion comment)
- Multi-resume anchors (e.g. an IC resume and a management resume)

## Project layout

```
app/            routes + API (parse-resume, scrape, generate, apply, history)
components/      UI (design system, dashboard, artifact cards, history)
lib/            nvidia (Nemotron), scrape, pdf, notion, prisma
prisma/         schema
```

## License

Personal project.
