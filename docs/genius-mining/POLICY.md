# Genius Mining — operating policy

Decisions Adam has made, and where each one is enforced in code. This file is the
answer to "why does it do that", and it is meant to be edited when a decision
changes — the code points back here.

Companion documents: [`CURSOR_BUILD_BRIEF.md`](../CURSOR_BUILD_BRIEF.md) for the
build itself, and
[`consent_and_retention_copy.md`](../../packages/genius-mining/assets/copy/consent_and_retention_copy.md)
for the student-facing wording.

---

## Ownership

Hidden Genius Labs LLC owns Genius Mining. CampusQuest holds a non-exclusive,
non-transferable license to use it in this web app and its successor mobile app.
HGL reserves the right to license it to other operators, including competitors.

The brief called the first commit the practical deadline on this question. It is
settled in [`packages/genius-mining/LICENSE`](../../packages/genius-mining/LICENSE),
and the boundary it describes is kept structurally: the module performs no I/O,
imports nothing from the host app, and carries no CampusQuest branding, so a
second licensee gets that directory unchanged. See
[`NOTICE`](../../packages/genius-mining/NOTICE).

Derived data splits: a student's profile belongs to the student and to
CampusQuest as operator. The de-identified instrument-development corpus belongs
to HGL.

---

## Phase scope

Phase 1 promises **activities**, not a major. The instrument treats the domain a
student works in as a decoy and discards it, so it cannot recommend a field of
study, and the marketing copy must not imply otherwise.

Engine 2 (recommendations) is **off** until pathway coverage is sufficient. The
gate is per working word rather than per campus, so BUILDER — which already has
four verified rows at URI — can start recommending without waiting for the other
seven. `engine2Enabled(campusId, workingWord)` in
[`pathways.ts`](../../packages/genius-mining/src/pathways.ts) is the switch.

`adjacent_fields` is collected on every pathway row as Phase 2 groundwork and is
never shown to a Phase 1 student, nor sent to Engine 2.
`renderRecommendationsPrompt` strips it, and a test asserts that.

Campus scope is URI only.

---

## Entitlement, subscription, and retention

Three things can entitle a student to Genius Mining, resolved in this order by
`resolveEntitlement` in
[`entitlement.ts`](../../packages/genius-mining/src/entitlement.ts):

1. **An admin grant** — support cases, paper participants, testing. Records who
   granted it and why.
2. **An institutional seat** — a school covering the student. Buys the instrument
   and the advisor printout at the Basic level. Deliberately does *not* buy the
   social layer, because a university purchasing a diagnostic for academic
   advising should not simultaneously be buying a student social network for its
   general counsel to think about.
3. **Their own subscription** — the paid student tier. `GENIUS_MINING_TIERS` in
   [`subscription.ts`](../../packages/genius-mining/src/subscription.ts) is the
   list.

**The deletion clock reads the resolved entitlement, never the subscription
directly.** This is not a stylistic preference. When a school buys a seat we
cancel the student's own subscription and refund the unused days, Stripe emits
`customer.subscription.deleted`, and a clock keyed to billing would read that as
abandonment and schedule their answers for deletion on the day their school
started paying for them.

`billingAdjustmentFor` returns the corresponding billing action: cancel as
redundant, refund prorated, and hold the price the student signed up at so being
covered never costs them their rate.

### What starts the 30-day deletion clock

| Event | Clock |
| --- | --- |
| Downgrade from the Genius Mining tier to Basic or Free, with no seat | **Starts** |
| Subscription cancelled, with no seat | **Starts** |
| Institutional seat expires and the student is not paying | **Starts** |
| `past_due` — card failed, Stripe retrying | Does not start |
| `unpaid` — retries still running | Does not start |
| Subscription cancelled *because* a school picked the student up | Does not start |
| Access restored by any route before day 30 | **Cleared**, nothing deleted |

A failing payment is not a loss of the tier. Deleting a paying student's profile
because their card expired is the specific failure this distinction prevents;
when Stripe gives up it emits `canceled`, and that is the event acted on.

Restoring the tier clears `lapsed_at`, `purge_due_at` and both warning
timestamps. A record that has already been purged stays purged — deletion is
permanent, and the consent copy tells the student exactly that.

### The schedule

Day 7 and day 25 after the lapse, a warning email. Day 30, de-identify and then
purge. A record the job reaches late is still purged.

**The de-identify step runs before the purge, and a failure blocks the purge.**
Losing the corpus copy is worse than a late deletion, so a failure alerts a human
rather than retrying on a schedule nobody is watching. Implemented in
[`retention-job.ts`](../../src/lib/gm/retention-job.ts).

### What the corpus keeps

The corpus has two modes, chosen by cohort size in `corpusModeFor`.

**`structured` — the pilot default, and the only honest one at this scale.**
Kept: the verb tags, the C1 picks, A4's three tags, how D1 resolved, the working
word, the confidence, `thin_spots`, how many A1 moments there were, and the
character count of every free-text answer. Dropped: **every word the student
wrote**, plus name, date, participant code, A4's activity text, E2, and E3.

A student who writes two hundred words about the night their team fell apart is
identifiable to anyone on that campus who was there, whatever the key on the row
is. Removing a name from a story is not the same as anonymising it, and the
consent screen calls this corpus anonymous. Structured fields have no such
problem: `["notice", "steady", "notice"]` describes hundreds of people. The
lengths are what most of the open instrument questions actually need — does a
thin C3 predict a LOW confidence, does A2 length fall off across sittings.

**`full`** additionally keeps the free text, and unlocks only at
`CORPUS_FREE_TEXT_MIN_COHORT`. Raise that threshold with whoever reviews the
study, not because a model would like more text to learn from.

The corpus record is keyed by a **random `corpus_id`, not the participant code**.
Keeping the participant code would make the copy pseudonymous, because that code
is the join key back to the student's account row. E3 is dropped in both modes —
it is what a student has never said out loud, and it does not belong in a corpus
that outlives their consent.

---

## Analysis credits and re-runs

Two budgets, easy to confuse:

**Entitlement**, in student-facing terms:

- One complete analysis is **included** with the subscription.
- **Editing and refining** the resulting profile is free and unlimited for as long
  as the subscription is active. A student sharpening a thin C3 answer should
  never hit a paywall.
- A **full restart from scratch** — discarding a completed run and taking the
  instrument again — costs **US$25**. That figure is one constant,
  `FULL_RESTART_FEE` in [`credits.ts`](../../packages/genius-mining/src/credits.ts).
- An **admin override** exists for legitimate support and testing. Every use
  records who granted it and why.

**Call ceiling**, in engineering terms: at most **two model calls per analysis
run** — one Engine 1 call, plus one retry and only when the first response fails
contract validation. A second failure surfaces to an operator instead of spending
a third call, because output that fails the contract twice is a prompt or model
problem that retrying will not fix. Malformed output is never hand-repaired.

---

## Operational alerts

Alerts go to `gm-alerts@campusquestapp.com`, a group that reaches both Adam and
Nick. The address is **environment-configurable** through `GM_ALERT_EMAIL` rather
than hardcoded, so it can change without a deploy and staging can point somewhere
harmless. `DEFAULT_ALERT_RECIPIENTS` in [`env.ts`](../../src/lib/env.ts) is the
fallback.

Delivery goes through Resend, which is already live and sending CampusQuest auth
mail from the verified `auth.campusquestapp.com`.

`sendOperatorAlert` never throws and always logs. It is the safety net on paths
where the alert *is* the recovery — a blocked purge, an engine that failed the
contract twice — so the alert path cannot be the thing that fails.

Alerts currently fire on: a blocked purge (de-identification or corpus write
failed), an Engine 1 call that threw, Engine 1 output that failed the contract
twice, an undelivered retention warning, and a retention clock starting.

---

## Privacy boundaries

Two engines exist so that two sets of data never share a model context.

- **Engine 1** sees A1, A2, A3, B, C1, C2, C3, D1, D2, D3 and E. It never sees A4
  or the name.
- **Engine 2** sees the working word, D3, A4 and the verified pathways. It never
  sees C2, C3, E2, E3 or the name.

A4 reaching Engine 2 is the only exception to "A4 never reaches an engine", and it
is narrow on purpose: a *recommendation* engine, never an *analysis* engine.

The payload filter reads the `sent_to_engine` flag off the instrument schema
rather than a list written out in code, because a hand-written list drifts from
the schema and what it drifts into is a privacy incident. `assertNoIdentifiers`
re-checks immediately before the call — the one place where being wrong is
unrecoverable.

Storage keys on `participant_code` and holds no name. Identity lives on the
account (`user_id`); the response row holds answers. Contact details are read from
the account at the moment a warning email is sent, and are never copied onto the
response row.

A4's consent checkbox defaults unchecked, always, and is the single route by which
a name leaves the form.

---

## Instrument rules that the UI must not relax

- **Sequential only, no backtracking.** Section D is unreachable until A through C
  are submitted. A student who can see the eight working words while answering A1
  will write toward one, and the instrument stops working.
- **Support resources on the final page, never collapsed, never optional.** E3
  asks students to write things they have never said out loud, and some will.
- **C3 soft-warns and never hard-blocks.** A thin C3 degrades the whole reading,
  but the students most likely to write one are the students a hard block would
  push out of the instrument entirely. The first submit that raises the warning
  stops on the section so the note is actually read, and the button becomes
  "Continue anyway"; pressing it again submits the answer exactly as written.
  Warning without stopping was the same as no warning, because validation passed
  and the section advanced before the student saw anything.
- **Nothing is filed until the student signs off.** Only `accepted` and `filed`
  enter reporting.
- **The profile never cites anything in `thin_spots`.** Both renderings run every
  quoted line through `safeText` first.
- **Two sittings, resumable.** Progress autosaves continuously and is keyed to the
  account so a student can start on a laptop and finish on a phone. Each sitting
  is timestamped.

### The unresolved D1 case

When the verb count ties *and* the two C1 instances carry two different tied
verbs, the paper form's tiebreak does not resolve and there is no rule left. This
is not hypothetical — GM-001, the only validated run in existence, is this case.

The student is asked which verb is closer. Their pick is stored in
`d1_resolution.student_tiebreak_choice`; `computed_verb` stays null and
`resolution` stays `UNRESOLVED`. The student sees a real answer, and the record
still says the tally was thin rather than dressing a coin flip as arithmetic. The
advisor printout says so explicitly.

How often this fires is instrument-design data, surfaced at
`/admin/genius-mining`.

---

## Mobile

C3 is the heaviest input in the instrument and students will write it on a phone.
Three things address that: continuous autosave (including a flush when the tab is
backgrounded, which is the most likely way to lose a long answer), progress keyed
to the account so a student can switch devices mid-instrument, and a hint pointing
at the dictation microphone already on the phone keyboard.

Dictation uses the keyboard's own microphone rather than speech capture of our
own. Recording a student's voice and sending it somewhere to solve a
short-answer problem is a worse trade than the short answer.

---

## Club portal (later)

Clubs will pay for tools, not for placement. Listings need admin approval and
periodic reconfirmation, because an unverified row is how a club that folded last
spring ends up recommended to a freshman. Only `verified: true` rows are ever
shown or sent to Engine 2, and that is enforced in `buildRecommendationInputs`,
which throws on an unverified row rather than filtering it out quietly.

---

## Still outstanding

- `gm001_responses.json` — GM-001's pages exist only as photographs. Until someone
  transcribes them the golden test cannot run end to end. What is testable now is
  that the recorded finding fits the contract and that `resolveD1` independently
  agrees it is the unresolved case.
- The URInvolved export. Seven of eight working words are below the coverage gate.
- Legal review of the consent copy before launch.
- Stripe price-to-tier mapping (`STRIPE_PREMIUM_PRICE_IDS`) and setting
  `user_id` on subscription metadata at checkout, which is how a webhook knows
  whose data it is looking at.
