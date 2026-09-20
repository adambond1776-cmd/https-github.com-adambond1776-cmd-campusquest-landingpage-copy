# Going live

> **Historical checklist, not launch approval.** This copy contains newer
> student and club TEST billing features. Read the current README handoff
> section first. Supabase project creation was deferred and Stripe is not
> connected. Migrations `0007` and `0008` target an isolated test project only.
> Do not deploy this copy to the original production site or enable payments
> based on these older notes.

Everything standing between this repository and a working public site, in the
order it needs doing. Written for whoever picks the repo up next.

The short version: the site **builds and runs today with nothing configured**.
Auth falls back to a localStorage mock, data falls back to JSON files under the
temp directory, email is logged instead of sent, and the analysis engine returns
a stand-in. That is deliberate — nobody should need a credential to run
`npm run dev`. None of it is production.

Two of the items below are code, not configuration. They are called out.

---

## 1. Credentials

Each row says what breaks while it is missing, so the list can be worked in any
order rather than all at once.

### Supabase — required

Without it there is no real account, no shared data, and nothing survives a
restart. This is the one that has to be first.

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API. Server only — never expose it to the browser |

Then two things that are not environment variables:

1. **Run the migrations in order**, in the SQL editor:
   `0001_genius_mining.sql`, `0002_entitlement.sql`, `0003_campus_demand.sql`,
   `0004_activities.sql`, `0005_reports_and_age.sql`.
2. **Allow the auth callback.** Authentication → URL Configuration → Redirect
   URLs. Add `/auth/callback` on every origin in use: production, Vercel preview
   domains, and `http://localhost:43917`. A magic link returning to an origin
   that is not on this list fails with an unhelpful error, and this is the single
   most common reason login appears broken.

### Resend — required for anything to be emailed

| Variable | Effect while unset |
| --- | --- |
| `RESEND_API_KEY` | Every email is written to the server log instead of sent |
| `GM_MAIL_FROM` | Falls back to a default sender |
| `GM_ALERT_EMAIL` | Operational alerts go to the default group |

Five things send mail: guardian consent requests, the "your account is open"
note to a student, directory-correction alerts, retention warnings, and operator
alerts. A guardian consent request that silently fails to send leaves a student
locked out with no way to tell why, so this matters more than it looks. The code
already alerts an operator when that specific send fails.

### Anthropic — required before any student sees a profile

| Variable | Effect while unset |
| --- | --- |
| `ANTHROPIC_API_KEY` | Development uses a stand-in engine. **Production refuses to run an analysis at all** |

That refusal is intentional. Falling back to the stand-in in production would
hand a student a description of how they think that came out of a fixture, with
nothing on the page to say so. Refusing is recoverable: their answers are saved,
no credit is spent, and the run works once the key is set. Students can fill in
the questionnaire before the key exists; they just cannot get a result.

### Stripe — see §2, this is not only a credential

| Variable | Purpose |
| --- | --- |
| `STRIPE_WEBHOOK_SECRET` | Verifies incoming subscription events |
| `STRIPE_PREMIUM_PRICE_IDS` | Comma-separated price IDs that grant Genius Mining |

Point a webhook endpoint at `/api/billing/subscription-event` and subscribe to
the subscription lifecycle events.

### Operations

| Variable | Effect while unset |
| --- | --- |
| `CRON_SECRET` | **The retention endpoint refuses to run**, and correction emails arrive without their one-click resolve links |
| `GM_ADMIN_EMAILS` | `/admin/genius-mining` returns 404 in production |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs and emailed links fall back to the Vercel host |

`CRON_SECRET` is any long random string. Generate one with
`openssl rand -base64 32`. Vercel sends it automatically to the scheduled jobs
in `vercel.json`; nothing else needs to know it.

---

## 2. Work that is code, not configuration

### There is no checkout. Nobody can pay yet.

This is the largest single gap and it is easy to miss, because everything
*around* payment is built. The webhook receives Stripe subscription events,
verifies their signatures, and correctly moves a student between entitled and
not. Entitlement is fully separated from billing, so institutional seats and
admin grants already work.

What does not exist is the part that starts a payment. A student picks Premium
during sign-up and the choice is recorded on their account; no money is ever
requested. Today every account is effectively free.

Building it needs: `STRIPE_SECRET_KEY`, a Checkout Session route, a success and
cancel return path, and a billing portal link on `/settings` so people can
cancel without emailing. The webhook end is done and does not need touching.

Note that `STRIPE_SECRET_KEY` already appears in `.env.example`. Nothing reads
it. Setting it will not make payment work.

### Only one campus has any content.

`src/lib/campuses.ts` lists eleven Rhode Island institutions. Exactly one — URI
— has working feeds and a curated club directory. A student at the other ten
signs up and sees an empty directory, which is worse than not offering their
school at all.

URI works because three sources were found for it: a Sidearm iCal athletics
feed, a Localist events API, and an Anthology Engage organizations endpoint. The
adapters in `src/lib/activities/sources/` are written to take more campuses by
configuration rather than new code — each has a feed table keyed by campus id.
The work per school is finding the three URLs and confirming the shapes match,
not writing an adapter.

Until then, either restrict the campus picker to URI or be explicit in the UI
that other campuses are not populated yet.

---

## 3. Decisions only the owner can make

| Variable | What it needs |
| --- | --- |
| `CQ_LEGAL_ENTITY` | Defaults to `CampusQuest, Inc.` Change only if that is wrong |
| `CQ_LEGAL_ADDRESS` | A real registered postal address. **Missing today** |
| `CQ_LEGAL_REVIEWED` | Set to `true` only once a licensed attorney has actually read `/privacy` and `/terms` |
| `CQ_PARTNERSHIP_EMAIL` | Otherwise `/institutions` shows a placeholder address |
| `CQ_PRIVACY_EMAIL` | Data and deletion requests. Falls back to the partnership address |

`/privacy` and `/terms` display a visible provisional banner until both the
postal address and the attorney review are in place. That banner is honest and
should stay up until it is genuinely no longer true. Do not set
`CQ_LEGAL_REVIEWED=true` to make it go away.

### Optional

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_SOCIAL_INSTAGRAM`, `_TWITTER`, `_LINKEDIN` | The footer renders no social icons rather than dead links |
| `CQ_BOOK_COMMERCE=false` | Removes every book purchase link and QR for an institutional deployment. Provenance stays |
| `NEXT_PUBLIC_BOOK_URL` | Overrides the built-in Amazon listing |

---

## 4. Hosting

1. Import the repository into Vercel.
2. Add every variable above to Production, Preview, and Development as
   appropriate. `NEXT_PUBLIC_*` values are visible in the browser by design;
   nothing else should ever be.
3. Point the domain at the project and set `NEXT_PUBLIC_SITE_URL` to match.
4. Add the production and preview origins to the Supabase redirect allow list.
5. Confirm the two scheduled jobs in `vercel.json` appear under the project's
   cron settings. They will not run without `CRON_SECRET`.

---

## 5. Order of operations

Each step is verifiable before moving on, so a failure is localised.

1. **Supabase + migrations + redirect URLs.** Verify: sign up with a real
   address, follow the magic link, land on `/welcome` signed in.
2. **Resend.** Verify: sign up with a birth year making you 17, confirm the
   guardian email arrives, follow its link, confirm the directory unlocks.
3. **`CRON_SECRET`.** Verify: `curl -X POST` the activities cron with the bearer
   token and confirm the directory repopulates.
4. **Legal address and contact emails.** Verify: the provisional banner on
   `/privacy` now names only the outstanding attorney review.
5. **Anthropic.** Verify: complete the questionnaire and run an analysis.
6. **Stripe.** Only meaningful once checkout exists — see §2.

---

## 6. Checking it locally

```bash
npm install
npm run dev            # http://localhost:43917
npm run typecheck && npm run lint && npm run test
npm run smoke          # headless pass over the marketing pages
npm run smoke:gm       # the Genius Mining flow
npm run smoke:institutions
```

Populate the directory locally with:

```bash
curl -X POST "http://localhost:43917/api/cron/activities?campus=uri"
```

`README.md` explains why each subsystem is shaped the way it is. This file is
only the checklist.
