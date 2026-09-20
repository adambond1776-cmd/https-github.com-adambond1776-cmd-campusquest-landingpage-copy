# Genius Mining — Build Brief for Cursor

**Instrument v1.3 · Engine spec v1.2 · Phase 1 · Hidden Genius Labs LLC**

Paste this into Cursor as project context before generating code.

**Companion files:** `questionnaire_schema_v1_3.json`, `profile_output_contract.schema.json`,
`pathways_uri.json`, `analysis_prompt_v1_2_json.txt`, `recommendations_prompt_v1_0.txt`,
`example_response_GM000.json`, `gm001_expected.json`, `consent_and_retention_copy.md`.

---

## What Phase 1 delivers

A paying student completes a 7-page questionnaire. Two engines run. They get back a working
word with evidence, plus real activities on their campus they'd plausibly want.

**Phase 1 promises activities. It does not promise a major.** The instrument treats domain as
a decoy and discards it, so it cannot recommend a field of study. That's Phase 2, a separate
engine and separate consent. Keep it out of the marketing copy until it exists.

There is no scoring algorithm to write. The prompts are the engines and they work. You are
building a form, storage, two API calls, a validator, a review screen, and two renderings.

---

## Architecture — two engines, deliberately separated

```
                    ┌─ ENGINE 1 (analysis) ────────────────┐
form ─> responses ─>│ sees: A1 A2 A3 B C1 C2 C3 D1 D2 D3 E │─> working word
        (name       │ NEVER sees: A4, name                 │   + 8 fields
         stripped)  └──────────────────────────────────────┘
                                    │
                                    v
                    ┌─ ENGINE 2 (recommendations) ─────────┐
                    │ sees: working word, D3, A4, pathways │─> activities
                    │ NEVER sees: C2 C3 E2 E3, name        │   + cross-over
                    └──────────────────────────────────────┘
                                    │
                    student review & sign-off ─> filed + PDF
```

**Why two.** A4 holds contact-adjacent interest data. C2, C3 and E3 hold body signals and
things students say they've never told anyone. Those two sets must never sit in the same
model context. Engine 1 gets the intimate material and no A4. Engine 2 gets A4 and a role, and
none of the intimate material.

This is the only exception to "A4 never reaches an engine," and it is narrow on purpose: A4
reaches a *recommendation* engine, never an *analysis* engine.

---

## Non-negotiables

1. **Form renders from `questionnaire_schema_v1_3.json`.** Never hardcode a question string.
2. **Filter the engine payload on the `sent_to_engine` flag**, not a hand-written field list —
   hand-written lists drift.
3. **Strip `name` before either engine call.** Payloads key on `participant_code`.
4. **Sequential only.** Section D must not be visible until A–C are submitted. A student who
   can see the eight working words while answering A1 will write toward one, and the
   instrument stops working.
5. **Support-resources block on the final page of every version.** Never collapsed, never
   optional. E3 asks students to write things they've never said out loud.
6. **Sign-off state machine:** `draft → returned_to_student → edited → accepted → filed`.
   Only `accepted` enters reporting.
7. **Both prompts are versioned config values**, not string literals.
8. **Two sittings.** Persist partial progress, allow resume, timestamp each.
9. **Two-credit-per-student analysis ceiling.** Both engine calls together stay within it.
   Cost is a standing constraint, not a later optimization.
10. **The profile never cites anything listed in `thin_spots`.** If the engine discounted an
    answer as too sparse, the rendered profile must not quote it back as evidence.

---

## Section B — the shape that matters most

Six A1 instances, each tagged with one verb from a fixed list of eight. Repeats allowed.

**Store the binding, not just the verbs:**

```json
"B": [
  { "instance": 1, "verb": "BUILT" },
  { "instance": 2, "verb": "REPAIRED" },
  { "instance": 3, "verb": "EXPLAINED" },
  { "instance": 4, "verb": "SORTED" },
  { "instance": 5, "verb": "REPAIRED" },
  { "instance": 6, "verb": "BUILT" }
]
```

**Never** `["BUILT","REPAIRED",...]` or `{"BUILT": 2}`. Both lose the index, and D1's tiebreak
needs it. `C1` stores two instance numbers: `"C1": [2, 5]`.

---

## D1 and D2 — computed, with a student fallback

D1 is the modal verb across the six B tags. On a tie, restrict to verbs sitting on the two C1
instances. D2 is a fixed lookup from D1.

Six tags across eight verbs means ties are common and the modal verb is often circled only
twice. This is expected, and it's why C3 outranks Section B in the weighting.

```js
const VERB_TO_WORD = {
  EXPLAINED: "TEACHER",   BUILT:     "BUILDER",
  SORTED:    "ORGANIZER", NOTICED:   "ANALYST",
  CONNECTED: "CONNECTOR", REPAIRED:  "FIXER",
  PROTECTED: "PROTECTOR", PERFORMED: "PERFORMER",
};

function resolveD1(B, C1) {
  const counts = {};
  for (const t of B) counts[t.verb] = (counts[t.verb] || 0) + 1;

  const top  = Math.max(...Object.values(counts));
  const tied = Object.keys(counts).filter(v => counts[v] === top).sort();

  if (tied.length === 1) return { computed_verb: tied[0], resolution: "modal" };

  const c1Verbs = [...new Set(B.filter(t => C1.includes(t.instance)).map(t => t.verb))]
    .filter(v => tied.includes(v)).sort();

  if (c1Verbs.length === 1)
    return { computed_verb: c1Verbs[0], resolution: "tie_broken_by_C1" };

  return {
    computed_verb: null,
    resolution: "UNRESOLVED",
    candidates: c1Verbs.length ? c1Verbs : tied,
  };
}
```

### The UNRESOLVED case — ask the student

The paper form's tiebreak doesn't cover every case. When the count ties *and* the two C1
instances carry two different tied verbs, there is no rule.

**This is not hypothetical. GM-001 — the only validated run in existence — is this case.**
BUILT ×2, SORTED ×2, C1 on instances 1 (BUILT) and 4 (SORTED). Following the form literally,
he could not have completed D1.

When `resolution === "UNRESOLVED"`:

1. Show the student their tied verbs: *"Your count tied between BUILT and SORTED. Which is
   closer to what you were actually doing?"*
2. Store their pick in `d1_resolution.student_tiebreak_choice`.
3. Keep `computed_verb: null` and `resolution: "UNRESOLVED"`. **Do not overwrite them.**
4. Run the analysis regardless — Engine 1 ranks D1 fifth and returns a working word without it.

The student isn't stuck, the profile shows a real answer, and the record still says the tally
was thin rather than dressing a coin flip as arithmetic. Track how often this fires — it's
instrument-design data Adam needs.

---

## Engine 1 — analysis

Prompt: `analysis_prompt_v1_2_json.txt`, verbatim. Replace `{{STUDENT_RESPONSES}}` with the
filtered payload.

```js
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    temperature: 0.1,
    messages: [{ role: "user", content: prompt }],
  }),
});
```

Validate against `profile_output_contract.schema.json`. Retry once on schema failure. Never
hand-repair malformed output. Strip markdown fences before parsing — models add them anyway.

Stamp `engine_version`, `model`, `run_at`, `instrument_version` on every profile.

---

## Engine 2 — recommendations

Prompt: `recommendations_prompt_v1_0.txt`. Four substitutions: `{{WORKING_WORD}}`,
`{{D3_SENTENCE}}`, `{{A4_ENTRIES}}`, `{{PATHWAYS}}`.

Pass **only verified pathway rows for that campus**. Engine 2 is instructed not to invent
activities; passing unverified rows is how a folded club ends up recommended.

Output lands in `profile.recommendations`. The `cross_over` object is the highest-value part —
it names the thing sitting where the student's role and their interests overlap. Adam wrote
that section by hand for the Athletics pitch; this prompt automates it.

If `cross_over.found` is false, render nothing rather than filler.

---

## Pathways

`pathways_uri.json`, keyed by campus. **Only rows with `verified: true` are ever shown or sent
to Engine 2.**

**Coverage gate:** every working word needs at least three verified entries before a cohort
runs. Block launch on it and surface the check in the admin view.

Current state: BUILDER has 4. Every other word has fewer than 3, most have zero. The URInvolved
export fills this. A student who returns PROTECTOR and lands on an empty page has had a worse
experience than if they'd never taken the form.

`adjacent_fields` on each row is Phase 2 groundwork — the academic directions an activity sits
next to. Populate it as rows are added; do not show it to students in Phase 1.

---

## Two renderings, one profile object

**Student profile** — second person, warm, concrete. Working word, their D3 sentence, where it
already showed up, the recommendations, the cross-over. This is Nick's profile in shape.

**Advisor printout** — same data, different job. The student takes it to a parent or academic
advisor, so it must show the evidence, the confidence level, the thin spots, the instrument
version and the run date. An advisor who sees MEDIUM confidence and three sparse answers reads
it correctly as a conversation starter. One who sees a confident word in a nice font may treat
it as a result.

Put **"a starting place, not a verdict"** where the advisor reads it, not only the student.
Include `for_the_mentor` — the counter-example question exists so a human can break the
finding if it deserves breaking.

Both render from the same profile object. Neither cites anything in `thin_spots`.

---

## Consent, retention and purge

Implement from `consent_and_retention_copy.md`. Summary:

- Consent screen before the questionnaire. Affirmative action, never pre-ticked. Record
  timestamp and copy version.
- A4 checkbox defaults unchecked, always.
- Purge identified data 30 days after lapse. Warn at day 7 and day 25.
- **De-identify before purging.** Copy responses, working word, confidence, `d1_resolution`
  and `thin_spots` to the development corpus. Drop name, email, contact, A4 free text, E3.
- If de-identification fails, **do not purge** — alert. Losing the corpus is worse than a late
  deletion.
- Re-apply policy stated plainly: deletion is permanent, returning means retaking the form.
- Payment resuming before day 30 clears the lapse and deletes nothing.

---

## Build order

1. Form renders from schema. Sequential, resumable, two sittings.
2. Consent screen and A4 gating. Build these before storage, not after.
3. Store by `participant_code`. Build the name-strip now.
4. `resolveD1` + D2 lookup. Unit-test modal, tie-broken-by-C1, and UNRESOLVED.
5. Engine 1. Validate against the contract.
6. GM-001 golden test *(see below)*.
7. Engine 2 + pathways resolver + coverage gate.
8. Student review and sign-off.
9. Both renderings, then PDF.
10. Retention job with warnings and de-identify-then-purge.

---

## Test fixtures

`example_response_GM000.json` — fictional, complete, includes a Section B tie that resolves
cleanly through C1. Use for steps 1–5.

`gm001_expected.json` — the real GM-001 finding: BUILDER, MEDIUM confidence, and
`d1_resolution: UNRESOLVED`. **The matching responses file does not exist yet** — his original
pages are photographs only, never transcribed. Until Adam transcribes them the golden test
can't run automatically.

Note GM-001 took **instrument v1.1** — five pages, no A4, before the CONNECTED verb swap. It
tests the engine for regression. It does not validate v1.3.

---

## Outstanding from Adam

- `gm001_responses.json` — transcribe the photographed pages.
- URInvolved export — seven of eight working words are below the coverage gate.
- Legal review of the consent copy before launch.
- Licence vs. joint ownership between Hidden Genius Labs and CampusQuest. Unresolved, and the
  first commit is the practical deadline.
