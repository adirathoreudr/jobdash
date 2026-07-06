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
cp .env.example .env.local     # then fill in the values (see below)
pnpm db:push                   # create the tables in your Postgres
pnpm dev                       # http://localhost:3000
```

## ⭐ Where the NVIDIA Nemotron API key goes

1. Get a free key at **https://build.nvidia.com** → open any Nemotron model →
   **Get API Key**.
2. Put it in **`.env.local`**:
   ```
   NVIDIA_API_KEY=nvapi-xxxxxxxx
   NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
   NVIDIA_MODEL=nvidia/nemotron-3-super-120b-a12b
   ```
3. On **Vercel**: Project → Settings → Environment Variables → add the same
   keys. It is only ever read server-side (`lib/nvidia.ts`); `.env.local` is
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

## Project layout

```
app/            routes + API (parse-resume, scrape, generate, apply, history)
components/      UI (design system, dashboard, artifact cards, history)
lib/            nvidia (Nemotron), scrape, pdf, notion, prisma
prisma/         schema
```

## License

Personal project.
