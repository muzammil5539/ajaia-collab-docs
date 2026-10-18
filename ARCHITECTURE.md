# Architecture note

## What I optimised for

Depth in three places — the editing loop, import fidelity, and access control — and
visible honesty everywhere else. A 4–6 hour build that tries to cover every Google Docs
surface ends up with five half-features and no story about any of them.

## Shape

One Next.js 16 application (App Router). Pages are server components that read through
one data module; mutations go through route handlers under `/api`. No separate backend
service: a second deployable would have cost setup time and bought nothing at this size.

```
Browser (TipTap editor, list, dialogs)
   │  fetch JSON
Route handlers  ──── session (signed cookie, seeded users)
   │  calls
   ├── documents ──── access (pure)   ← every read and write asks this first
   │        │
   │     Prisma ──── SQLite (local) / Postgres (deployed)
   └── import (pure): .txt / .md / .docx → sanitized HTML
```

### The two pure modules

`access` and `import-file` are plain functions over plain values: no database, no
request, no filesystem. That is the whole reason the test suite is worth anything inside
this timebox — the rules that decide who can read a document and the pipeline that turns
a stranger's file into document content are both exercised directly, in milliseconds,
with no server running.

`documents` is the only module that touches document storage, and every entry point takes
the acting user and calls `access` before it reads or writes. A route handler cannot
reach the database and forget the check, because it has no path to the database.

### Storage format

Documents are stored as **sanitized HTML**, not ProseMirror JSON. The PRD first called
for JSON (the editor's lossless native format); converting HTML to ProseMirror JSON on
the server needs a DOM shim, and the extra dependency and failure surface was not worth
it here. Instead every write — from the editor and from the import pipeline — passes
through one sanitizer with a fixed tag allowlist (`p h1 h2 h3 strong em u s ul ol li
blockquote code pre br`) and no attributes at all. TipTap round-trips that subset
cleanly, and the trust boundary is in exactly one place.

### Access decisions

Four levels: owner, editor, viewer, none. Owner can share, revoke and delete; editor can
change title and content; viewer can read. A request for a document the user cannot read
returns **404, not 403** — a 403 confirms that someone else's document exists.

### Saving

The editor debounces about 800 ms and PATCHes the whole document. Concurrency is
last-write-wins, stated in the UI under the editor and in the README. Operational
transform or a CRDT is the right answer for real collaboration and is roughly the size of
this entire assignment, so it is explicitly out of scope rather than half-built.

## What I deprioritised, and why

| Cut | Reason |
| --- | --- |
| Real-time collaboration | Weeks of work in a 6-hour box; the honest version is to name the limit |
| Real auth | Adds signup, password handling and email, teaches a reviewer nothing about product judgment |
| Comments, version history, export | Stretch items in the brief; core depth first |
| Browser E2E suite | Playwright setup would have eaten the budget reserved for the access and import tests, which protect more per minute |
| Tables, images, links in the editor | Each one widens the sanitizer, the import mapping and the editor surface at once |

## Testing

23 tests, three files:

- `src/lib/access.test.ts` — the full owner/editor/viewer/stranger × read/write/manage
  table, plus an unknown role degrading to view-only rather than to edit.
- `src/lib/import-file.test.ts` — text and markdown conversion, a committed `.docx`
  fixture (`tests/fixtures/quarterly-brief.docx`) asserting heading, emphasis and both
  list kinds survive, script and attribute stripping, dropped-content reporting, and
  each error path (unsupported, too large, empty, unreadable `.docx`).
- `tests/documents.int.test.ts` — one integration test against a real SQLite database:
  share → appears on the other list at the right level → viewer write refused → stranger
  gets not-found → promote to editor → write lands → only the owner can share or delete →
  revoke removes it.

Tests assert on behaviour through each module's public interface, never on internals, so
a refactor that keeps the promises keeps the suite green.

## What I would build next, with another 2–4 hours

1. Deploy to Postgres and wire the two-line adapter swap, then record the walkthrough.
2. Presence and a "saved by someone else" conflict notice — cheap insurance against the
   last-write-wins limit without a CRDT.
3. A Playwright smoke test over the four flows that are currently hand-verified.
4. Export to Markdown, reusing the same allowlist in reverse.
