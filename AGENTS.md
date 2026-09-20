<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CampusQuest test-build handoff

This is the separate GitHub handoff copy, not the original production checkout:
`adambond1776-cmd/https-github.com-adambond1776-cmd-campusquest-landingpage-copy`.

- Preserve the existing architecture, accounts, styling and directory.
- Node 22 is the verified development runtime.
- Run tests, type checks, lint and a production build before presenting changes.
- Never commit credentials, local environment files, generated build output or
  actual student data. `.env.example` contains placeholders only.
- The student $3/$5 and club $49 billing flows are TEST ONLY.
- Supabase project creation was deferred; Stripe remains disconnected.
- A request to push code is not permission to deploy, enable real charges, send
  email, run migrations against production or change the original repository.
- Confirm the remote before any push. Do not force-push or erase history.
- This copy disables automatic Vercel Git deployments. Do not relink it to
  `campus-quest/campusquest-landingpage` or deploy it without explicit approval.
- Read the current README handoff section before relying on legacy go-live notes.
