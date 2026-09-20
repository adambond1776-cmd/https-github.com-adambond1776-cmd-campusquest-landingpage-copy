# CampusQuest Basic: Nick’s Launch Handoff

Prepared September 20, 2026. This document introduces the product from scratch; no prior knowledge of CQ Basic or the planning conversation is assumed. It is the current product-and-launch guide for the copy repository and takes precedence over older README and `GO_LIVE.md` launch claims where they conflict.

## Start here

CampusQuest Basic helps URI students find relevant clubs, meetings, events and activities, while helping authorized club representatives keep their public information accurate. The immediate business goal is a small, useful, monetized launch with students, clubs and sponsors, not completion of every future CampusQuest feature.

Adam authorized consolidating the prepared work into **`main` in `adambond1776-cmd/https-github.com-adambond1776-cmd-campusquest-landingpage-copy`**, without deployment. This repository is the handoff; Nick does not need to combine development branches. The original repository is outside this work.

**Current readiness: customer-facing offer previews and local workflows, not a connected or monetized production service.** The founding offer pages are built. Live payments, durable saved searches, production club access and sponsor fulfillment are not established by this handoff. Connecting credentials alone will not complete them.

- **Adam:** Approves product scope, prices, commercial commitments, recognition rules and release decisions. Discuss proposed changes with him before implementing a different direction.
- **Nick:** Connects and verifies the services, assesses existing code, and implements the agreed launch requirements. Propose final recognition structures and titles to Adam before building or promising them.
- **Deployment:** Requires a separate, explicit approval from Adam after readiness checks. This merge does not authorize deployment, production migrations, live charges, sending messages or activating sponsor placements.
- **Existing safeguards:** Automatic Vercel Git deployment is disabled by `vercel.json`. No credentials, live account records, new dependencies or new migrations were added in this preparation.

## The product, in plain language

### Student experience

Students can start at the homepage or go directly to `/activities` without paying. The directory presents available clubs, campus events and athletics listings, with search/filter controls and original-source links. Public data may be incomplete or stale; the page tells students to confirm details with the organizer.

Signup and settings code already support student interests, including weighted preferences. Account persistence and verification require correctly configured services. A saved interest profile is **not** the same feature as saving a search, saving an activity or maintaining a personal activity list.

After a successful filtered search, a new invitation explains the proposed Founding Basic offer: **$5 once for 60 days**. For now, it suggests bookmarking the page in the browser and explicitly says the search has not been saved to a CampusQuest account. Account-based search/activity saving still needs implementation.

Students can report incorrect or missing listings without buying a membership. Reports go to review; a submission does not automatically change a listing or earn verified credit. `/contribute` explains additional ways to help and how documented, reviewed work could support truthful resume descriptions.

### Club experience

Clubs do not have to pay to appear in discovery, and listing corrections remain free. Paid tools must not buy higher organic placement. The purpose of club administration is to let a verified representative maintain information rather than relying exclusively on publicly collected details.

The proposed Founding Club offer is **$99 once for 90 days**. The presented value is maintaining club/meeting information, publishing and updating events, and organizing membership inquiries. Existing test code includes owner verification, content review, club pages, event management and private membership requests, but is not a live implementation of this new offer.

Clubs must not lose their eligible public-directory presence simply because they do not purchase or renew administration tools. Nick must check this distinction when adapting the test implementation, which currently gates several club operations on a $49 monthly test subscription.

### Sponsor experience

`/sponsors` presents a proposed **$2,500, 90-day program**, not a functioning checkout or a sale of future audience reach. Its proposed scope is:

- **Student access:** 50 passes, each lasting 60 days, activated during the first 30 days so access ends within the program term.
- **Club access:** Five club administration places for 90 days from program launch, with club authorization and verified representatives.
- **Onboarding:** One student session and two club sessions scheduled with the launch team.
- **Visibility:** A limited, clearly labeled homepage banner and acknowledgment, with placement dates and any rotation agreed in writing.
- **Reporting:** Available, verified aggregate measures such as activated passes, participating clubs, published activities and reported improvements.

Capacity, recipients, dates, payment schedule and remedies for undelivered work must be agreed before accepting money. There is no promised number of signups, impressions, leads or sales, and no student contact list, private-profile access, equity, exclusivity or university endorsement.

The homepage has a sponsor-banner component, but `ACTIVE_SPONSOR` is `null`, so no sponsor is displayed. It does not yet provide impression analytics or targeting. Future student-requested company introductions are an idea, not a launched feature.

### Contributions and recognition

The new contribution page invites six types of useful work: reporting a reproducible problem, correcting a listing, retesting a fix, improving usability/accessibility, helping an authorized club representative get started, and proposing a specific improvement.

Free users may contribute. Buying access does not itself establish leadership or earn an achievement credential. A useful recognition program should record what the person did, the dates, the evidence reviewed and the confirmed outcome.

Certificates, appreciation letters, any “Founding Partner” title, qualification rules, rewards and issuance/verification processes are **not implemented or finalized**. Nick and Adam must agree on those details. They should recognize real contributions without implying accreditation, employment, ownership or an unearned achievement. Automated certificates are not a prerequisite to the first paid launch if no such automation is promised.

## What is actually in the application

“Present” below describes inspected code or locally tested presentation, not production acceptance. All connected behavior still needs the relevant services and end-to-end verification.

| Surface | What exists | Readiness and limitation |
| --- | --- | --- |
| `/` | Homepage, student/club explanations, founding offer cards, contribution/sponsor links | Locally checked; paid cards are unavailable previews |
| `/activities` | Directory, search, filters, source links, interest-based recommendation code, correction form | Local search/reporting checked with fictional data; real feed freshness and database operation not verified here |
| Search follow-up | Founding Basic invitation after a successful filtered search | No account save occurs; browser bookmarking is the current workaround |
| `/signup` | Role/interests/onboarding, birth-year/guardian logic, campus-email code verification, display of offer information | Existing implementation; real identity, email and persistence require verification; paid student selections remain disabled |
| `/login`, `/auth/callback`, `/welcome` | Login/session return and onboarding completion flows | Existing account implementation; verify real email links, redirects and session behavior |
| `/settings` | Account controls, interest-preference saving and deletion code | Requires connected identity/storage and privacy acceptance tests |
| `/clubs/manage`, `/clubs/review`, `/clubs/[slug]` | Test club workspace, separate reviewer, public approved pages, events and membership inquiries | Test-only access rules; not the $99 founding pass implementation |
| `/billing`, `/api/billing/test-webhook` | Test subscription checkout/status and webhook processing | Test mode only; rejects live secret keys |
| `/billing/demo`, `/clubs/demo` | Local workflow simulators | Development only; no proof of payments or email delivery |
| `/contribute` | Safe contribution guidance and evidence-based resume recognition explanation | Page complete; no credential or contribution-ledger automation |
| `/sponsors` | Bounded sponsor proposal and conditional email contact | Page complete; no payment, allocation, fulfillment or reporting system |
| Contact links | Draft email when `CQ_PARTNERSHIP_EMAIL` is explicitly configured | Otherwise truthful unavailable state; no automatic email submission |
| `/privacy`, `/terms` | Existing legal pages and provisional-review settings | Must reconcile with new offers and confirm operator/contact details |
| `/institutions` | Existing institutional/Level Up Rhode Island material | Separate from the commercial sponsor offer; not evidence of an institutional agreement |
| `/method` and Genius Mining routes | Existing method explanation, consent/questionnaire/profile/advisor/admin code | Separate future work; not included in Basic/Plus founding offers or required for their initial launch |
| Cron/report-resolution routes | Existing activity refresh, retention and report-review plumbing | Requires secure configuration, durable storage and operational review; legacy rewards remain in backend code |

## Original version compared with this version

For this comparison, “original” means the copy repository's pre-launch-preparation `main` at **`e668b1c29b456200b56fbac3748c4decbbe12504`**. It does not mean an inspected live production deployment. The copy's older README also refers to an upstream `861363b` snapshot; that is historical provenance, not the comparison baseline used here.

| Area | Before this preparation | Consolidated version |
| --- | --- | --- |
| Offer presentation | Free plus planned Basic $3/month, Plus $5/month and club $49/month; recurring/price-lock framing | Free, Founding Basic $5/60 days and Founding Club $99/90 days; one payment, no automatic renewal |
| Later subscriptions | Existing monthly test catalog | Numeric test catalog unchanged; possible later Basic $3/month and club $49/month require a separate choice |
| Free entry | Several marketing calls to action led to signup | Free browsing calls to action lead directly to `/activities` |
| Saving a search | No new founding-offer prompt | Prompt explains the planned paid benefit and clearly says nothing was saved to the account |
| Club policy | Existing public directory and separate paid test administration | Explicit free-listing/free-correction policy and no paid organic ranking |
| Listing report interface | Legacy reward messaging; report access depended on populated directory state | No unapproved reward promise in UI; empty URI directory can report a missing listing; success receives focus |
| Recognition | No dedicated contribution page in the baseline | New contribution page, six opportunities and truthful-credit principles; actual recognition remains to be designed |
| Sponsor program | No dedicated commercial founding-sponsor page or new placement component | Defined $2,500 proposal and labeled banner component, inactive by default |
| Advertising copy | Ad-free claims appeared in affected plan copy | Limited labeled sponsorship allowed, including paid plans; no pop-ups or paid organic recommendations |
| Plus/Genius Mining | Existing future-product content | Still separate, future work; no claim that Genius Mining is included in these offers |
| Contacts | Existing institutional/fallback contact behavior | New pages require explicit mailbox configuration rather than presenting an unverified fallback |
| Connected services | Existing disconnected/test implementations | Unchanged: no new Supabase, Stripe, Vercel or email connection |
| Tests | 607 passing tests and one existing failure at the local baseline | 631 passing tests and the same existing failure; 24 new launch regressions pass |

The changes preserve the existing architecture, styling, accounts, directory and test workflows. They do not replace the application with a new landing-page-only build.

## Commercial decisions already reflected in the copy

| Offer | Customer promise being prepared | Must be true before selling |
| --- | --- | --- |
| Free discovery | Browse available activities, use search/source links, submit corrections | Real listings, accurate availability messaging and a working review channel |
| Founding Basic | $5 once for 60 days; planned saved searches and activities | Implement the advertised paid value, verified payment and server-enforced start/end dates |
| Founding Club | $99 once for 90 days; verified administration tools | Ownership review, correct admin permissions, publishing/review and private inquiry workflow |
| Optional later subscriptions | Proposed Basic $3/month or club $49/month | Separate explicit selection; never automatically begin after a founding pass |
| Sponsor program | Proposed $2,500 for a defined 90-day scope | Written agreement, real fulfillment capacity, assigned recipients and support/reporting process |

**Do not confuse a matching price with a matching product.** The $5 founding student pass is not the existing $5 monthly Plus subscription. The $99 club offer is not three recurring $49 charges. `src/lib/launch-offers.ts` controls presentation, while the unchanged billing catalog still describes test subscriptions.

## Ordered route to deployment and revenue

This is the recommended implementation sequence, not authorization to execute it. Nick should discuss scope changes and release decisions with Adam; existing safeguards should not be removed merely to make a demonstration appear connected.

| Order | Work | Type | Acceptance evidence |
| --- | --- | --- | --- |
| A | Walk through the product with Adam and confirm the first sellable scope | Product agreement | Shared understanding of offers, supported users, delivery obligations, refunds and which later features stay unavailable |
| B | Establish the intended Supabase environment and review applicable migrations | Configuration + review | Durable data, verified row access, least-privilege server keys and a documented migration plan; no blind application of test billing/club schemas to production |
| C | Verify signup, email, sessions, interests and privacy controls | Connection + end-to-end tests | Actual permitted test recipient receives code/link; verification, login/logout, saved interests, account deletion and guardian/age cases work without development fallbacks |
| D | Make the directory and correction loop operational | Connection + operations | Real URI data/source links, refresh handling, stale-data states and a responsible person who receives and reviews reports |
| E | Implement Basic's missing paid value | New feature work | Save/reopen/delete searches and activities on the correct account, persist across sessions/devices, prevent another account reading them; agree post-expiry behavior with Adam |
| F | Implement one-time student and club entitlements | Billing development, not just keys | Correct one-time amount/duration; verified server-side grant, start/end rules, refund/revocation handling and no automatic renewal |
| G | Adapt and verify the club workspace for launch | Existing test code + production work | Separate owner/reviewer checks, approved changes, event update/cancellation, private inquiries and any promised notification delivery; preserve free directory discovery |
| H | Prepare sponsor fulfillment and contribution handling | Operations + only necessary development | Agreed sponsor scope; access allocation, onboarding schedule and valid aggregate records; contribution review without unapproved automatic rewards |
| I | Reconcile legal/customer copy and production configuration | Business/legal + engineering review | Offer terms match implementation; real operator/contact details; working support; all unfinished functionality still labeled accurately |
| J | Perform release acceptance, then request deployment approval | Verification + explicit approval | End-to-end evidence below, known issues accepted or fixed, rollback/support plan and Adam's go/no-go |

The minimum monetized launch should prove one complete student journey and one complete club journey, not every future roadmap item. Sponsor administration and reviewed appreciation letters can start as controlled manual processes if Adam approves and the customer promise accurately describes that process. Do not build an elaborate sponsor portal or credential engine merely to launch these offers.

## Connections Nick will need

Use `.env.example` as an inventory, not evidence that any mailbox, sender or service is currently operational. Do not send credentials through this handoff or commit them to Git.

| Connection | Existing configuration/code pointers | Required caution |
| --- | --- | --- |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server-only `SUPABASE_SERVICE_ROLE_KEY`; `src/lib/supabase`; `supabase/migrations` | Review schemas and row policies before migration; never expose the service-role key to the browser |
| Account/report email | `RESEND_API_KEY`, `GM_MAIL_FROM`, `GM_ALERT_EMAIL`, `EMAIL_VERIFICATION_SECRET`; signup/email/report modules | Verify sender, recipient routing, failures and actual delivery; existing comments do not establish readiness |
| Commercial/feedback contact | `CQ_PARTNERSHIP_EMAIL` | New pages create email drafts only; static pages require rebuilding after configuration changes |
| Test billing | `CQ_BILLING_MODE=test`, `CQ_STRIPE_TEST_*`, `CQ_BILLING_TEST_ORIGIN`; `src/lib/billing`; `/api/billing/test-webhook` | Existing Basic/Plus/club catalog is monthly and test-only; live keys are explicitly refused |
| Test club tools | `CQ_CLUB_MODE`, `CQ_CLUB_REVIEWER_IDS`; `src/lib/clubs`; migrations `0007` and `0008` | Test notifications are previews/simulations, not outgoing club email; reviewer identity must not rely on editable user metadata |
| Production hosting/domain | Vercel, `NEXT_PUBLIC_SITE_URL`, auth redirects and environment separation | Keep automatic Git deployment disabled until Adam approves; do not link this copy to the original project by assumption |
| Operational jobs | `CRON_SECRET`, activity refresh and retention routes | Verify authentication, schedules, logs and data-retention effects before enabling |
| Legal identity/support | `CQ_LEGAL_ENTITY`, `CQ_LEGAL_ADDRESS`, `CQ_PRIVACY_EMAIL`, `CQ_LEGAL_REVIEWED` | Set reviewed status only after actual review; confirm separation of commercial, nonprofit and IP interests |

There is currently **no supported live-mode switch** for the social test billing implementation. The older `STRIPE_SECRET_KEY`/subscription-event path exists for other behavior; setting it is not a solution for founding-pass sales. Do not simply enable `CHECKOUT_LIVE`, substitute a live key for a test key, or reinterpret a successful checkout redirect as proof of payment.

## Specific blockers and decisions to resolve

- **Offer fulfillment:** Durable search/activity saving is not built by this preparation. Confirm what the $5 purchase buys before enabling it.
- **Entitlements:** Design and test the new one-time access model. Existing monthly test subscription gates are not equivalent.
- **Club visibility and expiry:** Existing test code ties several operations and review actions to paid status. Ensure nonpayment never incorrectly removes eligible free-directory coverage; agree which administrative capabilities expire.
- **Club notifications:** Existing test workspace simulates notifications. Either implement promised delivery or explicitly scope the first release to an approved in-app workflow.
- **Terms:** `/terms` still describes recurring billing, continuous price locks and a fourteen-day refund policy. Reconcile terms, checkout, receipts and actual behavior before selling the new passes. This document is not legal approval.
- **Legacy rewards:** `src/app/activities/actions.ts`, `/api/reports/resolve` and associated email/reward code still contain free-month logic. The new UI does not repeat it. Reconcile backend messages and fulfillment before processing real rewarded contributions.
- **Recognition:** Decide titles, evidence standards, eligibility, review ownership, consent and whether initial letters are manual. Payment alone must not be presented as an earned leadership achievement.
- **Sponsor execution:** The proposal is not an executed agreement. Establish recipients, access start dates, scope, reporting capacity and remedies before taking sponsorship money.
- **Sponsor display:** `ACTIVE_SPONSOR=null` remains intentional. Activate only approved creative and a safe destination after agreement. Do not report unmeasured impressions.
- **Wider product:** Plus social/planning features and Genius Mining remain outside the founding launch scope. Avoid turning them on or collecting extra data just because routes exist.

## Release acceptance checklist

Record results against the intended release environment. A simulator or screenshot is not evidence that a real integration works.

- [ ] Free visitor can search real listings, reach original sources and submit a correction without payment.
- [ ] Signup, campus verification, login/session return, interests, age/guardian cases and deletion work with the chosen services.
- [ ] Student purchase grants exactly the correct 60-day access after verified payment; search/activity saves persist and remain private.
- [ ] A failed or canceled checkout grants nothing; duplicate/replayed/out-of-order events do not duplicate or incorrectly restore access.
- [ ] Refreshing or changing a redirect URL cannot fake payment; entitlements are enforced server-side.
- [ ] Refund, expiry and any future subscription choice behave as the approved terms specify; no surprise renewal.
- [ ] Club owner and separate reviewer can complete the approved 90-day workflow; another account cannot read inquiries or edit the club.
- [ ] Corrections/cancellations remain possible as agreed after expiry, and free eligible discovery is preserved.
- [ ] Report and contact delivery reach a responsible person; no stale reward promise is sent.
- [ ] Sponsor access and reporting can actually be fulfilled for the promised term; no private student data is exposed.
- [ ] Terms, privacy/operator details, prices, unavailable states, emails and checkout agree.
- [ ] Build, types, lint, tests and desktop/mobile critical journeys are checked against the release candidate.
- [ ] Logging, support responsibility and rollback approach are agreed; no secrets or real student records are committed.
- [ ] Adam explicitly approves deployment and any live-payment activation.

## Verification already performed

The customer-facing code at `dd6681c` was checked locally before this handoff was expanded. This final consolidation adds documentation, not additional product functionality.

| Check | Result |
| --- | --- |
| Full unit/regression suite | 631 passed; one pre-existing failure |
| Added launch regressions | All 24 passed |
| Production build | Passed |
| TypeScript and ESLint | Passed |
| Wording-pass browser checks | 16 passed |
| Desktop/mobile review | Revised pricing, contribution, sponsor, search and report surfaces inspected at 1440px/375px |
| Selected recovery checks | No-results recovery, focused report confirmation and disabled paid signup passed |

The existing failure is `packages/genius-mining/src/__tests__/prompts.test.ts`, “matches assets/prompts byte for byte”: source prompt files contain CRLF while generated strings contain LF. It was reproduced before these changes. No test was disabled or Genius Mining code changed; **the overall test command is not green**. Fix it or explicitly document an accepted exception before release.

Browser checks used fictional local data and a disconnected report submission. No real account, email, charge or production migration was performed. No uncaught browser errors or horizontal overflow were observed in the checked states. Existing metadata-base and smooth-scroll warnings were not changed.

Live integrations, durable account persistence, payments, refund/expiry behavior, club email, sponsor delivery, recognition issuance and legal compliance were **not validated** by these local checks.

## Developer navigation

Use Node 22, then:

```sh
npm ci
npm run dev
```

The existing development script uses port `43917`. Run local checks with:

```sh
npm test
npm run build:check
npm run typecheck
npm run lint
```

| Work area | Start with |
| --- | --- |
| Founding offer presentation | `src/lib/launch-offers.ts`, `src/components/Pricing.tsx`, `src/app/signup/onboarding-view.tsx` |
| Existing test plan catalog | `src/lib/pricing.ts`, `src/lib/billing/catalog.ts`, `src/lib/billing/config.ts` |
| Search and corrections | `src/app/activities/page.tsx`, `src/components/activities`, `src/lib/activities`, `src/app/activities/actions.ts` |
| Account preferences | `src/app/settings/preference-actions.ts`, `src/lib/interests.ts` |
| Club implementation | `src/app/clubs`, `src/lib/clubs` |
| Contribution/sponsor pages | `src/app/contribute/page.tsx`, `src/app/sponsors/page.tsx`, `src/components/LaunchContact.tsx` |
| Sponsor placement | `src/components/SponsorBanner.tsx`, `ACTIVE_SPONSOR` in `src/lib/launch-offers.ts` |
| New regression coverage | `src/lib/__tests__/launch-presentation.test.ts` |

Historical comparison, from the repository checkout:

```sh
git diff e668b1c29b456200b56fbac3748c4decbbe12504..main --stat
git diff e668b1c29b456200b56fbac3748c4decbbe12504..main
```

Customer-facing preparation commits are `c935661` and `dd6681c`; the subsequent handoff commit completes the documentation. No branch reconciliation is required for Nick after consolidation into `main`. If an approved rollback is later needed, preserve history with reviewed revert commits; do not force-push or reset shared history.
