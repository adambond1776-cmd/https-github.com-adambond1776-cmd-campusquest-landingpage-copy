# CampusQuest

## Current handoff snapshot

This repository is the September 19, 2026 test-build copy of CampusQuest:
https://github.com/adambond1776-cmd/https-github.com-adambond1776-cmd-campusquest-landingpage-copy

It contains the existing application plus weighted student interests, isolated
$3/$5 student test subscriptions, and the $49 club test workflow. Source snapshot:
`campusquest-landingpage` commit `861363b`. Application code is unchanged from
that verified snapshot; this copy updates repository and deployment instructions.

- Nothing is deployed by this handoff. Automatic Vercel Git deployments are
  disabled in this copy's configuration. Do not link it to the original
  production project or deploy without Adam's explicit approval.
- No credentials or real account data are included. Supabase authorization was
  completed separately, but project creation was deferred; Stripe is disconnected.
- Use Node 22. Run `npm ci`, then `npm run dev`. Local-only workflow simulators:
  `/billing/demo` and `/clubs/demo`.
- Connected payments and club features require the separate TEST setup in
  [September 2026 local test additions and CTO handoff](#september-2026-local-test-additions-and-cto-handoff).
  Simulators are not evidence of functioning live payments or email delivery.
- Validation of the source snapshot: 603 tests passed; one pre-existing Genius
  Mining generated-prompt CRLF/LF test failed. Type checks, lint and build passed.

The legacy overview and go-live checklist below are historical context. The
September test-build section takes precedence for the lean product's readiness.

Marketing site, signup flow, and the Genius Mining questionnaire for CampusQuest, a
personalized discovery layer for college life. Students find the clubs, events, and
opportunities that match their interests; organizations get discovered by the
students who actually want to be there. Piloting in Rhode Island.

> **Taking this to production?** [`GO_LIVE.md`](GO_LIVE.md) is the checklist:
> every credential, what breaks without it, the two gaps that are code rather
> than configuration, and the order to work in. This file explains *why* things
> are shaped the way they are; that one is *what to do*.

## Running locally

Requires Node 20.9 or newer.

```sh
npm install
npm run dev
```

The dev server listens on <http://localhost:43917>.

**Nothing needs configuring to run it.** With no environment variables set at all,
the marketing site and both auth flows work against a `localStorage` mock, and the
Genius Mining questionnaire runs end to end against a file-backed store and a
stand-in analysis engine. That is the intended way to develop: no Supabase project,
no API keys, no spent model calls. See [Environment](#environment) for what each
variable switches on.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 43917 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build on port 43917 |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | ESLint across the repo |
| `npm run test` | Vitest suite (once) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run smoke` | Browser smoke test of auth and consent (needs Chrome) |
| `npm run smoke:gm` | Browser walkthrough of the whole instrument (needs Chrome) |
| `npm run smoke:institutions` | Browser test of the institutional page and demand button (needs Chrome) |
| `npm run build:check` | Build into a scratch directory, safe to run while `dev` is up |
| `npm run og` | Regenerate the social card image (needs Chrome) |
| `npm run gm:prompts` | Rebuild the bundled prompt module from the source `.txt` files |

## Routes

| Path | What it is |
| --- | --- |
| `/` | Marketing page |
| `/signup` | Four-step onboarding: role, interests, plan, then email and birth year |
| `/signup?finish=1` | The same wizard for an account that has a session but no answers yet |
| `/login` | Magic-link login |
| `/welcome` | Post-signup and post-login confirmation |
| `/auth/callback` | Exchanges the emailed code for a session |
| `/auth/auth-code-error` | Expired or rejected link |
| `/activities` | The activity directory: clubs, campus events, and athletics fixtures |
| `/settings` | Account details and self-service deletion |
| `/guardian/confirm` | Where a parent or guardian lands from the approval email |
| `/institutions` | Level Up Rhode Island: the public institutional page and the demand button |
| `/method` | Where Genius Mining comes from: the book, the four tracks, and the full mapping |
| `/privacy` | Privacy and data use notice |
| `/terms` | Terms of use |
| `/genius-mining` | Consent screen and what the instrument is |
| `/genius-mining/questionnaire` | The instrument itself, sections A through E |
| `/genius-mining/profile` | Run the analysis, then the student-facing profile |
| `/genius-mining/profile/advisor` | Advisor printout, built for print and PDF |
| `/admin/genius-mining` | Pathway coverage, instrument health, retention summary |
| `/api/cron/retention` | Daily retention job. Requires `CRON_SECRET` as a bearer token |
| `/api/cron/activities` | Refreshes the directory from every configured feed. Honours `CRON_SECRET` when set |
| `/api/reports/resolve` | Signed one-click links that confirm or close a student correction from the operator's inbox |
| `/api/billing/subscription-event` | Stripe webhook |

## Authentication

Passwordless, on Supabase magic links. `src/lib/auth.ts` is the whole surface:
`signInWithEmail`, `signUpWithEmail`, `completeOnboarding`, `getCurrentUser`, and
`signOut`. Signup carries the role, interests, and plan through as user metadata so
they land on the account when the link is opened.

A magic link creates the account the first time it is used, which means an address
typed into the login form that has never been seen becomes a new account with no
role, plan, or interests. Rejecting unknown addresses instead would leak which
addresses are registered, so `/auth/callback` routes those accounts into the
onboarding wizard at `/signup?finish=1`, which writes the answers to the existing
session rather than sending a second link.

Without Supabase credentials, all of it falls back to a `localStorage` mock that
simulates latency and reports whether an address was already on file. The mock is
never silent about being a mock: the check-your-inbox panel says so and offers a
"Continue without the link" shortcut that lands where the real callback would.

## The activity directory

The directory at `/activities` is the product students actually open. It holds
clubs, campus events, and athletics fixtures in one table (`cq_activities`)
rather than one per source, so the browse view and the Genius Mining pathway
data cannot drift apart.

### Sources

Nothing here scrapes HTML. Every campus already publishes this data in a
machine-readable form, and a published feed does not break when someone
restyles a page.

| Source | What it gives us | Standing |
| --- | --- | --- |
| Athletics (`gorhody.com`) | Every fixture for every sport, home and away | Sidearm Sports iCal, published to be subscribed to |
| Localist (`events.uri.edu`) | The university events calendar | Documented public read-only JSON API, allowed by `robots.txt` |
| Engage (`uri.campuslabs.com`) | The student organization directory | The Engage app's own backing search index — see the caveat below |

A live sync for URI returns 163 clubs, roughly 280 events, and 211 fixtures.

**The Engage caveat.** Unlike the other two, that endpoint is not a published,
supported product API. It is public and unauthenticated, but it can change shape
without notice and nobody owes us warning. The fix is an institution-issued
Engage API key, which a campus administrator can generate. It is isolated in
`src/lib/activities/sources/engage.ts` so swapping in a sanctioned key touches
one file.

### Freshness, which is the part that matters

A directory that sends a first-year to a club that folded last spring does not
get a second chance, so staleness is handled structurally rather than by
remembering to check:

- Ingested rows are `listed`. Only a person can mark a row `verified`, and only
  `verified` rows are eligible to become Genius Mining recommendations.
- A row that stops appearing in its source decays to `stale` on its own after a
  grace window long enough to survive a feed hiccup.
- A re-sync refreshes source fields but can never overwrite a verification, an
  operator's `hidden` flag, or a human's working-word tags. `reconcile` in
  `src/lib/activities/ingest.ts` is a pure function so those rules are testable.
- Every card shows its source and links back to it, because our copy can be
  wrong and a student deciding whether to cross campus should be able to check.

Rows the adapter distrusts are held at `pending` and never render publicly. URI's
directory, for instance, contains organizations its own student senate has
flagged for re-recognition.

### Home games

Filling seats is the athletics department's actual ask, so home fixtures get
their own rail above the directory. Detecting them needs both halves: the
summary saying `vs` **and** the venue matching. Twelve URI fixtures say `vs` but
are played in New Haven, Davidson, and Hampton, and pointing students at a home
game in North Carolina would cost the feature its credibility. 61 of 211
fixtures are genuinely at Kingston.

Run a sync with `curl -X POST localhost:43917/api/cron/activities?campus=uri`,
or on a schedule against the deployed route.

### Student corrections

Feeds know which clubs are registered. They never know which ones stopped
meeting in March, and the students in the room are the only ones who do. So the
directory has a correction form, and corrections are rewarded.

Rewarding them is the part most likely to go wrong, because paying for reports
is paying for volume and volume is the opposite of what a directory needs. Four
rules in `src/lib/activities/reports.ts` buy accuracy instead:

- Credit lands on a **confirmed** report, never on submission, so a fabricated
  one costs time and earns nothing.
- **Three** confirmations make a free month, not one. A month for ten seconds of
  clicking prices the reward far above the work.
- **Two free months per term** is the ceiling, so the incentive cannot scale
  into a job.
- **A report never changes a listing.** Everything queues for a person. One
  student must not be able to delist a rival society, and a hundred students
  saying the same thing can be one person with a hundred addresses.

`still_active` is a first-class report kind for the same reason: confirming a
club is alive is worth as much as reporting one dead, and it is much harder to
fake, because it can be checked by turning up.

## Ownership

Two entities:

```
Hidden Genius Labs LLC          owns the Genius Mining method,
  (IP holder)                   the instrument, and the code
        │
        │  licence
        ▼
CampusQuest, Inc.               operates the service, holds student
  (Delaware C corporation)      accounts, merchant of record
```

Ownership sits in the holding company and economics sit in the operating
company, which is what lets a partner take a stake in CampusQuest without
acquiring any claim on the method. It is also why institutions are scoped as
**evaluators, not co-developers** — co-development is what triggers an
institutional IP claim.

The one part of this a student needs to know is in the privacy notice: the IP
holder owns the instrument, not the responses, and does not receive identified
answers.

## Age

The gate is per capability rather than per site, in `src/lib/age.ts`. Browsing
public campus events and writing several paragraphs about your own life that get
sent to a language model are not the same act, and one checkbox at the door
treats them as though they were.

| | Directory | Corrections | Genius Mining | Own subscription |
| --- | --- | --- | --- | --- |
| 18+ | yes | yes | yes | yes |
| 16–17, guardian consented | yes | yes | **no** | **no** |
| 16–17, awaiting guardian | no | no | no | no |
| Under 16 | no | no | no | no |

Genius Mining stays adults-only regardless of guardian consent. That is where
the sensitive material is, and a study involving minors needs parental
permission plus the child's own assent and lands in a higher review category —
work to be done deliberately rather than inherited by accident. Billing is
adults-only because a minor generally cannot be held to a contract; a guardian
can buy a seat, and institutional coverage works at any age.

Guardian consent is an emailed link with a hashed, expiring token compared in
constant time. The privacy notice states what that does **not** prove: someone
at that address agreed, which is not the same as a family relationship. That
limit is exactly why the minor pathway stops at the directory.

The age question is asked at sign-up as a birth year, not an "I am 18" checkbox.
A checkbox records that someone clicked a checkbox; a year records what they
told us, which is the thing the rule turns on. Only the year is stored — a full
date of birth is more identifying than the rule needs — and the bracket reads
the youngest the student could be, so the uncertainty errs safe.

Signed-out visitors are not gated. An age wall in front of a fixture list anyone
can read on the university's own site would be theatre; the gate exists to keep
the promises made to a guardian about an *account*.

## Deleting an account

`/settings` erases the account outright: the Genius Mining record, directory
corrections, campus interest, the age and guardian record, and the auth user.
`src/lib/account/__tests__/delete.test.ts` asserts the set of tables, because
the real failure is a table added later and quietly never wired in.

Genius Mining goes through the retention job's own purge rather than a direct
delete, so the de-identified corpus copy the privacy notice promises is made
under the same rules the scheduled job uses. If de-identification fails, the
whole deletion stops and alerts — deleting everything else and leaving the
identified answers behind is the worst available outcome.

Two things survive, both described before anyone signs up: the de-identified
corpus record, which carries the shape of an answer set and none of its words,
and the listings themselves. Reporting that a club has folded does not un-fold
the club.

## Legal and consent

`/privacy` and `/terms` are generated from `src/lib/legal.ts`, which is also
where the consent model lives. Consent is three separately granted layers rather
than one signup checkbox:

1. **Running the service** — granted by making an account.
2. **Improving the instrument** — its own checkbox on the Genius Mining consent
   screen. Covers the de-identified structured corpus, which drops free text
   entirely while the cohort is small.
3. **Research** — written but inactive. If it is ever offered it needs an
   institutional review board, its own consent form, and it only covers data
   collected after approval.

The layering is deliberate. Running a product and running human-subjects
research are different activities under different rules, and bundling them is
how a pilot ends up in front of a review board it never applied to. Turning on
the third layer is a switch to flip, not a document to renegotiate.

**These documents have not been reviewed by an attorney and the operating entity
is not named yet.** Until `CQ_LEGAL_ENTITY` and `CQ_LEGAL_ADDRESS` are set, both
pages render a visible provisional banner rather than quietly omitting the
controller.

## The book

Genius Mining v1.3 implements the Genius Mining Starter, Tool 7 of *The Business
of Life: Student Edition* (Adam Bond Devereau, Hidden Genius Labs LLC, 2026).
`src/lib/book.ts` is the single source of truth and `/method` is the public
account of it.

Placement was decided by the research, not by what would convert best:

| Where | What appears | Why |
| --- | --- | --- |
| `/method` | Covers, the four tracks, the full mapping, buy link at the bottom | A university evaluating the instrument will ask for the methodology |
| Consent screen | One sentence and a text link. No cover, no price, no button | A student who reads Tool 7 before answering has seen the answer key, and Phase 2 exists to validate the instrument against students who have not |
| Profile page | The one real purchase prompt, and only after the profile is accepted | The analysis is finished, so nothing there can influence an answer |
| Everywhere else | Nothing | |

The mapping on `/method` marks Step 3 as **not** implemented, because it is not:
the book asks for five to nine operating rules in the student's own words and
the instrument collapses that into one working word. That gap is the honest
reason a student who has taken the questionnaire still has a reason to read, and
`src/lib/__tests__/book.test.ts` asserts the row stays marked uncovered. A
mapping with every row ticked would be a plug rather than an account.

`CQ_BOOK_COMMERCE=false` removes every purchase link and QR code and leaves the
provenance intact. That switch exists for a specific conversation: a university
paying for CampusQuest could reasonably read a buy button inside a tool it funds
as its students being treated as a mailing list, and that objection kills deals
quietly. Being able to offer the switch unprompted turns it into a reason to
trust us. A test covers it, because it is a promise made out loud in a pitch.

Covers in `public/book/` are cropped from the supplied spread by luminance
profiling; the front lands at 601x903, the 6x9 trim a print book uses.

The listing is `https://www.amazon.com/dp/B0H3STH3XP` (ISBN 9798258761231),
built in as the default so nothing has to be configured. That is the canonical
product URL rather than the `a.co` share link on the promotional artwork, which
carries `social_share` and `ref` parameters minted for one particular share and
costs an extra redirect. QR codes are generated server-side as inline SVG from
whatever `bookUrl()` returns, so they cannot drift out of date, need no client
script, and print correctly onto handouts.

## Genius Mining

`packages/genius-mining` is a workspace package **owned by Hidden Genius Labs LLC**
and licensed to CampusQuest. It holds the instrument schema, the prompts, the
output contract, and the policy logic — working-word resolution, the retention
clock, analysis credits, de-identification, and the pathway coverage gate.

The boundary is structural, not just documented: the package performs no I/O,
imports nothing from the host app, and carries no CampusQuest branding, so it can
be licensed to another operator as-is. Read
[`LICENSE`](packages/genius-mining/LICENSE) and
[`NOTICE`](packages/genius-mining/NOTICE) before changing anything in that
directory.

Every product decision it encodes — what starts the 30-day deletion clock, what a
re-run costs, what each engine is allowed to see — is written down in
[`docs/genius-mining/POLICY.md`](docs/genius-mining/POLICY.md), and the code points
back at it. Start there.

Analyses run against a stand-in engine unless `ANTHROPIC_API_KEY` is set, and
profiles produced that way are stamped `mock-engine`, which the advisor printout
displays as a warning. A single analysis run is capped at two model calls.

### Entitlement is not billing

Three things can entitle a student to Genius Mining — an admin grant, an
institutional seat their school bought, or their own subscription — and
`resolveEntitlement` picks between them in that order. **The 30-day deletion clock
reads the resolved entitlement and never the Stripe snapshot.** When a school
covers a student we cancel their subscription and refund the unused days, which
means Stripe emits `customer.subscription.deleted`; a clock keyed to billing would
read that as abandonment and delete their answers on the day their school started
paying for them.

An institutional seat buys the instrument and the advisor printout at the Basic
level. It deliberately does not buy the social layer.

### Pricing lives in one file

[`src/lib/pricing.ts`](src/lib/pricing.ts) is the only place a price is written
down. The introductory offer has no end date on purpose: it promises a price lock
for as long as a subscription stays continuously active, plus 30 days' notice
before it closes to new sign-ups. Set `INTRO_OFFER.closesOn` when that notice
actually goes out.

### Research materials

[`docs/research/`](docs/research/) holds the IRB protocol outline, the nine-month
pilot design, how to source the retention figures, and the partner brief. They are
source material to be carried elsewhere, not something the app reads. The one
irreversible item is in the first: consent cannot be applied retroactively, so a
cohort that takes the instrument under the product consent alone can never become
research data.

## Environment

Copy `.env.example` to `.env.local` and set only what you need; every variable is
optional and documented there. The short version:

| Variable | Effect when unset |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth uses the local mock; both are needed for the real thing |
| `SUPABASE_SERVICE_ROLE_KEY` | The retention job and billing webhook cannot reach rows with no session |
| `ANTHROPIC_API_KEY` | Analyses use the stand-in engine in development, and **are refused outright in production** rather than returning a fabricated profile |
| `RESEND_API_KEY` | Email is logged instead of sent |
| `CRON_SECRET` | The retention endpoint refuses to run at all, and correction emails arrive without their one-click resolve links |
| `GM_ALERT_EMAIL` | Alerts go to the `gm-alerts` group by default |
| `GM_ADMIN_EMAILS` | `/admin/genius-mining` returns 404 in production |
| `CQ_PARTNERSHIP_EMAIL` | `/institutions` shows the `partners@campusquestapp.com` placeholder |
| `CQ_LEGAL_ENTITY`, `CQ_LEGAL_ADDRESS` | Falls back to `CampusQuest, Inc.` with no postal address, which keeps the provisional banner up |
| `CQ_LEGAL_REVIEWED` | The provisional banner stays up. Set to `true` only once counsel has signed off |
| `CQ_PRIVACY_EMAIL` | Data requests fall back to `CQ_PARTNERSHIP_EMAIL` |
| `NEXT_PUBLIC_SOCIAL_INSTAGRAM`, `_TWITTER`, `_LINKEDIN` | The footer renders no social icons rather than dead links |
| `CQ_LOCAL_ACTIVITIES_PATH` | The directory falls back to a JSON file under the temp directory |
| `CQ_LOCAL_AGE_PATH`, `CQ_LOCAL_REPORTS_PATH` | Age records and corrections fall back to JSON files under the temp directory |
| `GM_ALLOW_MOCK_IN_PRODUCTION` | Production refuses to run an analysis with no key. Set to `true` only for a staging deploy where fake profiles are understood |
| `NEXT_PUBLIC_SITE_URL` | Social card and canonical URLs fall back to the Vercel host |
| `NEXT_PUBLIC_BOOK_URL` | The canonical Amazon listing is used; set this only to point somewhere else |
| `CQ_BOOK_COMMERCE` | Purchase links are shown. Set to `false` for an institutional deployment |

## Supabase setup

Two pieces are not code and have to be done in the Supabase dashboard.

1. **Run the migrations**, in order:
   - [`0001_genius_mining.sql`](supabase/migrations/0001_genius_mining.sql) —
     `gm_sessions`, the de-identified `gm_corpus`, the participant-code sequence,
     and the row-level security policies.
   - [`0002_entitlement.sql`](supabase/migrations/0002_entitlement.sql) —
     institutional seats and admin grants, which the deletion clock reads.
   - [`0004_activities.sql`](supabase/migrations/0004_activities.sql) —
     the activity directory, with public read limited to listed and verified rows.
   - [`0005_reports_and_age.sql`](supabase/migrations/0005_reports_and_age.sql) —
     student directory corrections in `cq_activity_reports`, and `cq_age_records`
     for the age bracket and any guardian consent.
   - [`0003_campus_demand.sql`](supabase/migrations/0003_campus_demand.sql) —
     students asking their school to cover Genius Mining.
2. **Point auth at Resend and allow the callback.** Enable the email provider, set
   the SMTP block to Resend with `auth.campusquestapp.com` as the sender, and add
   `/auth/callback` on every origin you use — production, previews, and
   `http://localhost:43917` — to the redirect allow list. A link that comes back to
   an origin not on that list fails with no useful error.

## Deploying

Built for Vercel. [`vercel.json`](vercel.json) schedules the retention job daily at
09:00 UTC against `/api/cron/retention`; that endpoint refuses to run unless
`CRON_SECRET` is set, so set it or the job silently never does anything. Set
`NEXT_PUBLIC_SITE_URL` too, or social previews resolve against the preview host.

For Stripe, `STRIPE_PREMIUM_PRICE_IDS` maps prices to the paid tier, and checkout
has to set `user_id` on the subscription metadata — without it a webhook cannot
tell whose data it is looking at.

## Project layout

```
src/
  app/            App Router: pages, route handlers, server actions
  components/     Marketing sections, form primitives, gm/ questionnaire UI
  lib/            auth, env, alerts, validation, supabase/, gm/ (storage, engine, jobs)
packages/
  genius-mining/  HGL-owned instrument, contracts, and policy logic
docs/
  genius-mining/  POLICY.md — the decisions the code enforces
  research/       IRB protocol, pilot study design, and the institutional briefs
supabase/
  migrations/     SQL applied to the Supabase project
scripts/          Social card generator and the headless-browser smoke suites
```

The `@` alias points at `src/`.

## Tests

```sh
npm run test
```

Vitest, run in a Node environment. The suite covers the policy logic rather than
the markup: working-word resolution including the unresolved tie, the retention
clock and the full warn-then-purge cycle, the analysis credit ceiling, engine
payload filtering and the identifier checks, contract validation,
de-identification, the pathway coverage gate, and section-by-section questionnaire
validation.

None of that touches a browser, which leaves a real gap: if the client bundle
never reaches the page, the server-rendered HTML still looks perfect while nothing
hydrates and every button silently does nothing. Typecheck, lint, the unit suite,
and `next build` all pass through that. `npm run smoke` is the check that does not
— it drives headless Chrome through consent, login, onboarding, and signup, and
starts by clicking a checkbox purely to prove React is attached.

```sh
npm run dev          # in one shell
npm run smoke        # in another — auth and consent
npm run smoke:gm     # the whole instrument, consent through advisor printout
npm run smoke:institutions   # the institutional page and the demand round trip
```

`smoke:gm` deliberately drives the awkward case rather than a clean one. It ties
the verb count three against three and puts both C1 picks on the same verb, so D1
has to resolve through the C1 tiebreak and land on FIXER. That is where the only
real arithmetic in the instrument lives.

Note that `npm run build` writes to the same `.next` the dev server is serving
from, so running it while `dev` is up overwrites those chunks and produces exactly
the dead-page symptom above. Use `npm run build:check` instead when the dev server
is running.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 3, Supabase for auth,
Resend for email, Stripe for billing, Anthropic for the analysis engine, and
lucide-react for icons. Brand colors (`brand`, `cream`, `gold`, `ink`) live in
[`tailwind.config.js`](tailwind.config.js).

## Status

### September 2026 local test additions and CTO handoff

This section is the current status for the lean student/club product. The older
Genius Mining status below describes the legacy prototype, not a verified live
launch or a feature included in these subscriptions.

- Student test subscriptions remain Basic $3 / Plus $5. Club is a separate
  $49/month test subscription; neither product unlocks Genius Mining.
- Reuses Next App Router, Tailwind brand classes, organization signup/email
  verification, age eligibility, Supabase, the existing `cq_activities`
  directory and the shared Stripe test engine. No replacement app or framework.
- Club code: `src/lib/clubs` contains validated data models, an injected
  repository/billing service, the Supabase adapter and an in-memory demo adapter.
  `src/components/clubs` shares the real forms between the demo and connected
  screens. Server actions obtain identity; client-supplied account IDs never
  confer ownership. Reviewer IDs come from server configuration.
- `/clubs/manage`: one page and owner per account; edit details, a small raster
  logo, 1–5 existing interest categories, individual event forms, private join
  requests, notification previews/retry simulation, $49 test checkout and
  period-end cancellation/resumption.
- `/clubs/[slug]`: reviewed public content and consent-based join form. Only the
  public content subset is serialized; owner contact and requests stay private.
- `/clubs/review`: independently confirm ownership, approve content, or hide a
  club and its events. Approvals require a different allowlisted adult account.
- `/clubs/demo`: local-development-only simulator. No provider calls, emails,
  credentials or durable data. Browser refresh resets it; production returns 404.

Connected TEST setup (not performed on a real Supabase/Stripe project here):

1. Use Node 22 and a separate Supabase test project. Apply existing migrations,
   then `0007_test_billing.sql` and `0008_clubs_test.sql`. Do not apply these to
   production as a launch step.
2. Configure test auth and `CQ_CLUB_MODE=test`, `CQ_BILLING_MODE=test`,
   `CQ_CLUB_REVIEWER_IDS` (verified auth UUIDs), the dedicated `sk_test_` secret,
   and `CQ_STRIPE_TEST_CLUB_PRICE_ID` for exactly USD 4900 cents, monthly,
   interval count 1, licensed usage. Student test prices remain separate.
3. An adult organization account saves its draft; a separate reviewer confirms
   affiliation/ownership; the owner completes test checkout; the reviewer
   approves the page. Event changes go through review separately. Review is
   never granted just because the customer paid.
4. Test account signup/verification and two-account isolation against the real
   test services. This is still required; mocked Stripe calls and local
   PostgreSQL tests do not prove connected provider behavior.

Data and access rules:

- RLS denies direct `anon`/`authenticated` access to private club tables.
  Server-side repository access is service-role-only and fenced by action
  identity plus ownership/reviewer checks. Optimistic versions reject stale
  updates. UUID foreign keys cascade on account deletion.
- Transactional triggers project reviewed pages/events into the SAME activity
  table as other campus content. Page edits hide the page and its events until
  reapproved; event edits hide that event. Cancellation removes an event from
  discovery. Existing interest recommendations use the reviewed rows.
- Join requests store name, verified account email, optional message and
  versioned consent. One request per student/club, at most five new clubs in
  24 hours, enforced with a transaction lock and unique constraint.
- Notification bodies and Reply-To are constructed from saved requests and
  the club owner's verified email. Notifications only preview/simulate success
  or failure, with up to ten test attempts. **No Resend transport or delivery
  worker is enabled or implemented for club notifications yet.** Requests
  survive simulated failures. No address book import, bulk mail or texting.
- After subscription expiry, editing/new inquiries pause; approved listings
  remain visible. Existing inquiries and event cancellation remain available.
  No paid club access is inferred from a checkout return URL or user metadata.
- URI is first. Other listed campuses can save drafts but cannot checkout or
  publish until opened. This does not claim JWU/Salve partnerships.

First-version limits and release gates:

- One owner; campus/slug corrections and ownership transfer are operator
  tasks. No multi-admin invitations, tickets, video galleries or analytics.
- Logo is a PNG/JPEG/WebP data URL up to 150 KB, no remote image tracking or SVG.
  Review image decoding/re-encoding and media storage before a public launch.
- Event forms support one event at a time (100 event records per club); owner
  view displays newest 500 inquiries; reviewer view newest 200 clubs. Pagination,
  archive/deletion controls and long-term retention policy require a later pass.
- Review publishing and payments in an actual test database/Stripe sandbox
  before live use. Current email verification and provider age records must
  also be exercised there. Verify retries, service-role authorization and
  production deployment settings.
- Live payments are intentionally unsupported. Before enabling them: finish
  account-deletion/provider-subscription cancellation reconciliation, payment
  recovery/refunds/tax handling, terms/privacy for clubs and contact sharing,
  abuse monitoring, and an idempotent delivery worker with delivery monitoring.
- The tests in `src/lib/clubs/__tests__` include actual local PostgreSQL
  migration/RLS/trigger/rate-limit checks using the dev-only PGlite dependency.
  The known unrelated Genius Mining generated-prompt CRLF/LF fixture failure
  predates these changes.

Local QA commands:

```sh
npm run typecheck
npm run lint
npm test -- src/lib/clubs src/lib/billing --maxWorkers 2
npm run build:check
```

No repository push, hosted deployment, real payment or outgoing club email is
part of this handoff. The code is a local test implementation, not launch signoff.

Verification of this addition:

- Full suite: 603 passing tests, one pre-existing generated-prompt line-ending
  failure. Type checking, ESLint and the optimized production build pass.
- Browser checks at 1280px and 375px cover draft/review/publication, payment
  decline/success, cancellation/resumption, event editing/review/cancellation,
  consented duplicate inquiries, notification failure/retry previews, expired
  access, hidden pages and logo rejection/acceptance/removal.
- Unsupported logos now validate before a React state updater, so rejection
  displays a form error rather than reaching the page error boundary.
- No horizontal overflow or page errors remained in the final checked flows.
  Unconfigured public/reviewer routes returned 404; the owner route explained
  the disconnected test setup. No outgoing provider requests were observed
  from the local simulator. Real-provider end-to-end verification is pending.

Pre-launch. The marketing page, auth, the institutional page, and the full Genius
Mining flow — consent, questionnaire, analysis, student profile, advisor printout,
retention job, admin dashboard — are built and tested.

Outstanding:

- Stripe price-to-tier mapping and `user_id` on subscription metadata, without
  which a webhook cannot tell whose data it is looking at.
- An admin surface for granting and revoking institutional seats. The logic and
  the storage exist; today a seat is set through the admin path on
  `/api/billing/subscription-event`.
- The URInvolved pathway export. Seven of eight working words are below the
  coverage gate, so recommendations stay off.
- Legal review of the consent copy, and a research consent that does not exist yet.
- `CQ_PARTNERSHIP_EMAIL` — the institutional page currently shows a placeholder
  address.
