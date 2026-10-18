# AI workflow note

## Tools used

- **Claude Code (Opus 5)** as the primary pair: PRD, UI design boards, scaffold,
  modules, tests, docs.
- **Claude Artifacts (Design canvas)** for the PRD and the UI/architecture boards, so the
  design was something to react to before any component existed.
- **The bundled Next.js docs** (`node_modules/next/dist/docs`) and the generated Prisma
  client source, read directly rather than trusted from memory.

## Where AI materially sped things up

- **The PRD and the user-story list.** Turning a loose brief into 38 stories grouped by
  surface is mechanical work; drafting it took minutes instead of an hour, and the
  grouping made the scope cuts obvious.
- **Boilerplate with a known shape.** Route handlers, Zod schemas, Prisma models, the
  seed script, Tailwind markup for the list and editor chrome.
- **The test table.** The owner/editor/viewer/stranger matrix is exactly the kind of
  exhaustive, boring enumeration that is quick to generate and slow to type.
- **Checking an unfamiliar stack.** Next 16, Prisma 7 and TipTap 3 all differ from what a
  model remembers. Reading the installed packages' own docs and generated sources
  resolved every one of those differences in a few minutes.

## What AI output I changed or rejected

- **Rejected ProseMirror JSON storage**, which the first draft of the PRD specified.
  Converting HTML to ProseMirror JSON server-side needs a DOM shim; storing sanitized
  HTML keeps one trust boundary and one dependency fewer. The architecture note records
  the change rather than hiding it.
- **Rejected a hand-rolled sanitizer.** The first instinct was a regex allowlist. Input
  from someone else's file is a trust boundary; it got `sanitize-html` with an explicit
  tag allowlist and no attributes instead.
- **Rejected the generated project defaults.** `create-next-app` enabled
  `cacheComponents` and `partialPrefetching`; every page here is per-user and dynamic, so
  caching bought nothing and would have forced Suspense scaffolding around auth reads.
  Both were turned off.
- **Dropped a duplicate dependency.** The plan installed `@tiptap/extension-underline`;
  reading StarterKit's exports showed it already ships Underline, so the dependency was
  removed rather than left shadowing the bundled one.
- **Fixed a generated `transformTags` rule** that would have silently emptied the text of
  every link in an imported file.
- **Rewrote error semantics.** The first draft returned 403 for a document the user
  cannot read. That discloses existence; it returns 404 now, and there is a test for it.
- **Avoided a destructive database flag.** `prisma db push --force-reset` is gated behind
  an explicit-consent prompt; the reset script deletes the SQLite file and re-pushes
  instead, which is both safer and simpler.

## How correctness was verified

- **`npm test`** — 23 tests across the two pure modules and one real-database integration
  test for the sharing round-trip. All green.
- **`npm run typecheck` and `npm run build`** — both clean, including Next's own route
  type generation.
- **Driving the running app in a browser**, not just reading the code: signed in as a
  viewer and confirmed the read-only banner with no toolbar; signed in as the owner,
  typed into the document and watched the status go *Saving… → Saved*; opened the share
  dialog, revoked Priya's access and re-granted it as *can view*; imported a markdown
  file and confirmed heading, emphasis and list survived into a new document; and
  uploaded a `.xlsx` to confirm the refusal message reads like a sentence.
- **Probing the running API directly with curl**, not only through the UI: no-session
  requests, a viewer's write (403), a stranger's read (404), a non-owner's share and
  delete (403), empty and blank-title patches (400), a 3 MB upload (413), an `.xlsx`
  upload (400), and a `<script>`/`onerror` payload saved and read back to confirm the
  sanitizer runs on the server, not just in tests. That sweep is also what caught a
  stale SQLite handle after a database reset, now documented in the README.
- **Deliberate gaps are written down** rather than implied: no browser end-to-end suite,
  and no deployment URL from this environment.
