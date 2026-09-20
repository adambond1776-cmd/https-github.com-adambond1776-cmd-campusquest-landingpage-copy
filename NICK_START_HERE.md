# CampusQuest Basic: Nick’s Launch Handoff

## Status and boundaries

This is a **local-only customer-facing preparation branch**, not a production
release. Nothing has been pushed, merged, deployed, connected or charged.

- Repository: `adambond1776-cmd/https-github.com-adambond1776-cmd-campusquest-landingpage-copy`.
- Branch: `launch/founding-customer-experience`.
- Starting commit: `e668b1c29b456200b56fbac3748c4decbbe12504`.
- Scope: launch presentation, contribution invitations, sponsor proposal and UI
  safeguards. Existing visual system and architecture preserved.
- No new dependencies, lockfile changes, migrations, environment files, account
  data, live sponsor placements or deployment settings.
- Stripe/Supabase code, server actions, API routes, authentication behavior,
  access checks and existing monthly TEST amounts are unchanged.
- `onboarding-view.tsx` changes are display-only. Paid choices remain disabled.
- The original repository is untouched. Adam must approve any remote push or
  deployment. After handoff, Nick becomes the primary editor.

## What is ready for review

| Surface | Local change |
| --- | --- |
| Homepage pricing and signup | Student $5/60 days and club $99/90 days displayed as one-time **offer previews**, not available purchases |
| Hero, student/club sections and free CTAs | Free browsing goes to `/activities`; no perpetual ad-free promise or guaranteed weekly-delivery claim |
| Club policy | Eligible listings and corrections remain free; paid administration does not buy organic ranking |
| Filtered discovery | A successful filtered search shows an offer link, explains browser bookmarking and explicitly says account-based saving is not enabled |
| Reporting | Existing report action retained; UI hides unapproved legacy free-month claims; empty URI directory accepts missing-listing reports; success confirmation receives focus |
| `/contribute` | Six contribution opportunities, safe reporting guidance and evidence-based resume advice; no credential title or award promised |
| `/sponsors` | Proposed $2,500/90-day program, bounded deliverables and no guaranteed reach, data access or university endorsement |
| Sponsor banner | Reusable, explicitly labeled `Advertisement`, HTTPS links only, no trackers; renders nothing by default |
| Contact availability | New pages only use an explicitly configured `CQ_PARTNERSHIP_EMAIL`; otherwise show a truthful unavailable state, not the unverified fallback mailbox |

### Wording-polish follow-up

The follow-up makes the student, club and sponsor copy easier to understand
without changing offer amounts, durations or functionality. Pricing explains
one-time access and no automatic renewal; search explains browser bookmarking
without claiming an account save; contribution copy connects verified work to
honest resume credit without promising certificates. Sponsor copy retains the
defined program, limited labeled messages and no guaranteed outcomes.

Unavailable purchases and unconfigured contact options remain explicit. Nick
still owns final recognition titles, requirements, rewards and implementation.

## Start here tomorrow

1. Review this branch and the baseline diff. Do not merge blindly.
2. Confirm the founding offers and the minimum functionality each purchase buys.
3. Connect and verify the existing account, listing and club workflows.
4. Implement saved searches/events and server-side one-time access before enabling
   the Basic offer. Preserve existing free search and interest-preference behavior.
5. Connect and test payments and access expiration, then review customer-facing
   terms and remove preview messaging only where the functionality is verified.
6. Confirm production configuration and perform a real end-to-end acceptance
   check under your release process. This branch does not authorize deployment.

## Important: presentation is not the billing catalog

`src/lib/launch-offers.ts` owns the new **presentation-only** offer amounts.
`src/lib/pricing.ts` retains the existing monthly TEST prices: Basic $3, Plus $5,
club $49. The underlying billing catalog/configuration has not been changed.

Do not map a $5 founding pass to the existing $5 monthly Plus product, or a $99
club pass to three recurring $49 charges. Do not enable `CHECKOUT_LIVE` alone and
assume the new offers work.

| Proposed offer | Connection required before selling |
| --- | --- |
| Student: $5 once for 60 days | Verified payment, correct Basic entitlement, defined start/end, durable saved searches/events, no automatic renewal |
| Club: $99 once for 90 days | Correct verified owner, admin entitlement, publishing/inquiry permissions, expiration without removing eligible public listings |
| Optional later Basic $3/month or club $49/month | Separate, affirmative subscription choice; never schedule this automatically with the founding pass |
| Sponsor: $2,500 for 90 days | Signed scope, capacity and recipients, payment schedule, remedy for undelivered work, approved creative and measured reporting |

Test success, failure, canceled checkout, duplicate/replayed webhook, wrong user,
refund, expiration and access from another account. Confirm signed webhook
verification, idempotency and server-side access checks, not client UI alone.

## Release blockers and decisions deliberately left to Nick

- **Terms reconciliation:** `/terms` still describes recurring monthly billing,
  continuous price locks and a fourteen-day refund policy. The new offer cards
  do not change those legal terms. Reconcile one-time passes, refund handling,
  optional later subscriptions and any existing commitments before real sales;
  obtain appropriate legal review. No new legal approval is implied.
- **Legacy reward messaging:** `src/app/activities/actions.ts`,
  `src/app/api/reports/resolve/route.ts`, report-resolution email/alert code and
  related reward logic still contain free-month language. The new report UI
  intentionally does not repeat it. Reconcile backend communications and actual
  reward fulfillment before launching a recognition/reward program.
- **Recognition:** Nick owns titles, offers, qualification criteria, evidence
  review, identity/consent, certificates, letters and verification. Recommended
  principles: free users can qualify; payment alone earns no achievement;
  approved evidence precedes recognition; no destructive testing; earned factual
  recognition should not depend on continuing a subscription.
- **Contact mailbox:** Verify `CQ_PARTNERSHIP_EMAIL` is operational. New contact
  links draft an email; they do not send or persist inquiries. The new static
  pages read configuration at build time, so rebuild after configuring it.
- **Sponsor activation:** `ACTIVE_SPONSOR` is `null`. Supply only an approved
  name, message and HTTPS destination after an agreement. The component does not
  measure impressions or provide targeting, consent collection or a marketplace.
- **Sponsor reporting:** No new analytics or access-pass distribution is built.
  Collect only agreed, valid aggregate measures; do not promise unmeasured reach.
- **Production services:** Nick owns Supabase, Stripe, Vercel, email and domain
  configuration. No credentials were requested, copied or embedded.

## Verification

Use Node 22 as the existing repository instructions require.

```sh
npm ci
npm test
npm run build:check
npm run typecheck
npm run lint
```

| Check | Before changes | After changes |
| --- | --- | --- |
| Unit/regression suite | 607 pass; 1 existing failure | 631 pass; same 1 existing failure |
| Added launch regressions | Not present | All 24 pass |
| Production build | Pass | Pass |
| TypeScript | Pass | Pass |
| ESLint | Pass | Pass |
| Diff whitespace check | Clean | Clean |

The single existing failure is
`packages/genius-mining/src/__tests__/prompts.test.ts`, “matches assets/prompts
byte for byte”: source prompt files contain CRLF while generated prompt strings
contain LF. This was reproduced before editing. No test was disabled and no
Genius Mining files were changed. The overall test command still exits nonzero;
the branch must not be described as an entirely green test suite.

Local Chromium checks used fictional data and covered desktop (1440px) and mobile
(375px): offer presentation, free browsing, filtered offer navigation, no-results
behavior, report open/cancel/reopen/type switching, disconnected local report
submission, visible/focused confirmation, empty-directory reporting, contribution
links, sponsor proposal, missing contact configuration and disabled paid signup
options. No real account was created or email sent. No uncaught browser errors or
horizontal overflow were observed in the checked states.

After the wording-polish follow-up, the build, TypeScript, ESLint and full test
suite were rerun. Sixteen browser checks passed across the revised pricing,
contribution, sponsor, search and report surfaces, including no-results recovery,
visible/focused report confirmation and disabled paid signup. Desktop and mobile
screenshots were reviewed. These checks used a fictional local listing and a
disconnected local report submission; no real account, email or payment was used.
Protected integration and deployment paths remain identical to the baseline.

Existing local warnings about absent `metadataBase` and smooth-scroll markup were
observed; those global configuration details were not changed. Live integrations,
delivery, account persistence, payments, entitlement enforcement, refund handling,
recognition issuance and legal compliance are **not** validated by these checks.

## Review and rollback

Inspect the local branch before considering a push:

```sh
git status --short --branch
git diff e668b1c29b456200b56fbac3748c4decbbe12504...HEAD --stat
git diff e668b1c29b456200b56fbac3748c4decbbe12504...HEAD
```

No production rollback or schema rollback is needed because nothing was
deployed and no migrations were added. Before sharing, switching back to the
unchanged `main` restores the baseline checkout. After a future merge, use a
normal reverts of the launch commits under the team's release process; do not
force-push or rewrite shared history.
