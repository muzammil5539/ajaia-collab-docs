# Submission

## What is included

| Item | Where |
| --- | --- |
| Source code | This folder, and on GitHub at https://github.com/muzammil5539/ajaia-collab-docs |
| Local setup and run instructions | [README.md](README.md) |
| Architecture note | [ARCHITECTURE.md](ARCHITECTURE.md) |
| AI workflow note | [AI-WORKFLOW.md](AI-WORKFLOW.md) |
| PRD, UI screens, backend diagram | Design canvas — https://claude.ai/artifact/2V1GbiyizFMt83oXcadML4 |
| Automated tests | `src/lib/*.test.ts`, `tests/documents.int.test.ts` — `npm test` (23 passing) |
| Seeded review accounts | README, *Seeded accounts* |
| Screenshots and demo GIF | `docs/screenshots/` and `docs/demo.gif`, shown in the README |
| Live product URL | **Not yet deployed** — see below |
| Walkthrough video URL | [**Google Drive**](https://drive.google.com/file/d/1_jvYDk8smrwYxV38GVD-yYs1oJhfdrxo/view?usp=sharing) |

## Review credentials

No passwords. The sign-in page lists three seeded accounts; pick one.

- `maya@ajaia.test` — Maya Fletcher (owns a document shared with both others)
- `dev@ajaia.test` — Dev Shah (**editor** on Maya's document)
- `priya@ajaia.test` — Priya Raman (**viewer** on Maya's document)

Open two browser profiles and sign in as Maya and Dev to see a share land on the other
side.

## Quick start

```bash
npm install
npm run setup
npm run dev
```

## Status

**Working end to end:** sign in and out; create, rename, edit and delete documents;
rich-text formatting (bold, italic, underline, H1–H3, bulleted and numbered lists);
autosave with a visible save state and retry; reopen after refresh with formatting
intact; import `.txt`, `.md` and `.docx` (max 2 MB) as a new document with headings,
lists and emphasis preserved and unsupported files refused clearly; share with a
teammate as viewer or editor; change or revoke that access; owned and shared documents
listed separately with owner and access level; read-only mode for viewers; server-side
access checks with 404 (not 403) for documents you cannot see.

**Incomplete:**

1. **No deployment URL.** `npm run build` passes and the app is production-ready, but it
   was not deployed from this environment. Deploying needs a host account and, on an
   ephemeral-filesystem platform, the Postgres swap described in the README.
2. **No walkthrough video** recorded yet.
3. **No browser end-to-end suite.** Every flow was driven by hand in a browser and the
   API probed directly with curl, but nothing guards those flows in CI.
4. **Last-write-wins** on simultaneous edits, by design and stated in the UI.

**With another 2–4 hours:** deploy to a host with Postgres and record the walkthrough; a
Playwright smoke test over the four main flows; a "changed by someone else" notice to
blunt the last-write-wins edge; export to Markdown.
