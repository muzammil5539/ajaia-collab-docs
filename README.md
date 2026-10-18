# Ajaia Docs

A lightweight collaborative document editor: create and format documents in the browser,
import a file as a new document, share a document with one teammate at a chosen access
level, and have all of it survive a refresh.

Built against the brief in `../Full Stack Product Engineer - Task.txt` inside a 4–6 hour
timebox. The product decisions, user stories and tradeoffs are in the PRD canvas; the
short version of the architecture is in [ARCHITECTURE.md](ARCHITECTURE.md) and the AI
workflow note is in [AI-WORKFLOW.md](AI-WORKFLOW.md).

## Run it locally

Requires Node 20.9+ to run the app and Node 22.12+ or 24 to run the test suite (Vitest 5
sets that floor). Built and verified on Node 24 with npm 12.

```bash
npm install
npm run setup
npm run dev
```

`npm run setup` generates the Prisma client, creates the SQLite database at
`prisma/dev.db` and seeds three accounts with documents already shared between them.
The app runs at http://localhost:3000.

Useful scripts:

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Vitest: access rules, import pipeline, sharing round-trip |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:reset` | Drop the SQLite file, re-push the schema, reseed |

Two things that bite locally:

- If `better-sqlite3` reports a missing native binding after install (npm 12 blocks
  install scripts by default), run `npm rebuild better-sqlite3`.
- `npm run db:reset` deletes the SQLite file. A dev server that is already running keeps
  the old file handle and every write then fails with *Something went wrong*; restart
  `npm run dev` after a reset.

## What it looks like

![Create, edit, autosave and share a document](docs/demo.gif)

Still frames, captured from a production build: [sign in](docs/screenshots/01-sign-in.png) ·
[document list](docs/screenshots/02-documents-list.png) ·
[editor](docs/screenshots/03-editor.png) ·
[share dialog](docs/screenshots/04-share-dialog.png) ·
[viewer, read-only](docs/screenshots/05-viewer-read-only.png) ·
[rejected file type](docs/screenshots/06-import-error.png)

## Seeded accounts

No passwords — the sign-in page lists the accounts and sets a signed, HTTP-only cookie.

| Account | Email | Starts with |
| --- | --- | --- |
| Maya Fletcher | `maya@ajaia.test` | Owns *Q4 planning notes* (shared with Dev as editor, Priya as viewer) and *Onboarding checklist* |
| Dev Shah | `dev@ajaia.test` | Owns *Pricing experiment brief*, shared with Maya as **editor** |
| Priya Raman | `priya@ajaia.test` | Owns *Support handbook*, shared with Maya as **viewer** |

To see sharing from both sides at once, open the app in two browser profiles (or one
normal and one private window) and sign in as Maya in one and Dev in the other.

## What the product does

- **Create, rename, edit, delete** documents. The toolbar covers bold, italic,
  underline, headings 1–3, and bulleted and numbered lists; the usual keyboard
  shortcuts work. Block quotes have no toolbar button — they come from the `> `
  markdown shortcut and survive import — and that is the only formatting in the
  stored-content allowlist without a button.
- **Autosave** roughly 800 ms after you stop typing, with a visible
  *Saving… / Saved / Not saved* state and a retry button when a save fails.
- **Import** a `.txt`, `.md` or `.docx` file (**max 2 MB**) as a new document. Headings,
  lists and emphasis are preserved; images, tables and links are dropped and the editor
  says so. Unsupported types and oversized files are refused with a readable message.
- **Share** a document with a seeded teammate as *can edit* or *can view*, change that
  level, or revoke it. Owned and shared documents are listed separately, each shared one
  labelled with its owner and your access.
- **Read-only mode** for viewers: no toolbar, no editing, a banner naming the owner.

Access is enforced on the server for every request. A document you have no access to
returns 404 rather than 403, so the existence of other people's documents is not
disclosed.

## Known limits

- **Last-write-wins.** Two people editing at the same moment will overwrite each other;
  the last save stands. No real-time collaboration, presence or merge.
- **Mock authentication.** Anyone who can reach the app can sign in as any seeded
  account. This is a demo auth module, isolated so it can be replaced.
- **SQLite.** Fine locally and on a host with a persistent disk; a platform with an
  ephemeral filesystem (Vercel, for example) needs Postgres — swap the datasource
  provider in `prisma/schema.prisma` and the adapter in `src/lib/prisma.ts`
  (`@prisma/adapter-pg`), then set `DATABASE_URL`. Nothing else changes.
- **No deployment URL yet.** The build is production-ready (`npm run build` passes) but
  it has not been deployed from this environment — see [SUBMISSION.md](SUBMISSION.md).
- **No browser end-to-end suite.** The flows were driven by hand in a browser and the
  API was probed directly; there is no Playwright suite guarding them in CI.

## Environment

`.env.example` lists the two variables. Both have working defaults, so the app runs with
no `.env` at all.

```
DATABASE_URL="file:./prisma/dev.db"
SESSION_SECRET="dev-only-secret-change-me"
```

Set a real `SESSION_SECRET` anywhere this is reachable by someone else — it signs the
session cookie.

## Layout

```
prisma/schema.prisma      User, Document, Share
prisma/seed.ts            Three accounts, four documents, two shares
src/lib/access.ts         Pure authorization rules
src/lib/import-file.ts    Pure import pipeline: bytes -> title + sanitized HTML
src/lib/documents.ts      The only module that touches document storage
src/lib/session.ts        Signed-cookie mock auth
src/app/api/...           Route handlers, thin: validate, call a module, map errors
src/app/, src/components/ List, editor, share dialog, import control
```
