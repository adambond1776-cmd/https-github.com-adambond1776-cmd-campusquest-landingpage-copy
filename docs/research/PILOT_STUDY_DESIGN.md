# Nine-month pilot — study design

The design an institutional research office is going to read. It is written to
survive that reading, which means being explicit about what the study cannot
detect before anybody asks.

---

## The claim we are not making

A nine-month pilot cannot detect a retention effect. This is arithmetic, not
modesty.

To find a 5-percentage-point difference in first-to-second-year retention against
a baseline near 75%, at 80% power and the conventional 5% significance level, you
need roughly 1,300 to 1,500 students **per arm**. A 2-point difference — still
worth real money to an institution — needs upwards of 7,000 per arm.

A pilot of a few hundred students cannot see either. Quoting a retention number
off it is quoting noise, and quoting it to someone whose job is knowing that ends
the conversation and the relationship.

So the pilot is not a retention study. It is a **feasibility and validation
study** that builds the cohort a retention study reads out from in year two.

That framing is a stronger sale, not a weaker one. An institution that is offered
a study it can publish, with its own name on it, is being offered something a
vendor demo cannot match.

---

## Endpoints

Registered before the first student enrols. The whole point of registering them
is that the analysis cannot be rewritten around whatever the data turns out to
show.

### Primary

1. **Completion rate.** Proportion of consented students who submit all five
   sections, with a dropout curve by section. If students stop at C3 we have an
   instrument problem, and that is worth knowing on its own.
2. **Advisor-rated usefulness.** After each advising appointment where a printout
   was available, the advisor rates on a five-point scale whether it changed
   anything about the conversation, plus one free-text line. Rated per session,
   not by a survey at the end of the year, because a survey at the end of the year
   measures how the year went.

### Secondary

3. **Test-retest stability.** A subsample retakes the instrument 8 to 12 weeks
   later. Agreement on the primary working word, reported as a raw percentage and
   as Cohen's kappa. This is the closest thing to a psychometric claim the pilot
   can support, and if the working word is unstable we need to know before an
   institution buys it at scale.
4. **Major confidence and belonging, pre and post.** Existing validated short
   scales rather than items we write. Compared against the waitlist group.
5. **Declaration and change of major** within the study window, treatment versus
   waitlist. Underpowered for a small effect; reported as an estimate with an
   interval and explicitly labelled as hypothesis-generating.
6. **Time on task and sitting count**, from the instrument's own telemetry.
   Whether "about forty minutes" is true, and whether a two-sitting design matches
   what students actually do.

### Exploratory

7. **D1 resolution distribution.** How often the verb tally resolves cleanly,
   ties and resolves on C1, or fails to resolve at all. Pure instrument-design
   data, already surfaced at `/admin/genius-mining`.
8. **Answer length against confidence.** Whether a thin C3 predicts a LOW
   confidence rating. Answerable from the structured corpus with no free text.

### Deferred to year two

9. **First-to-second-year retention**, treatment versus matched comparison, using
   the cohort built here. Named in the year-one report as the pre-registered
   year-two endpoint so nobody has to take it on trust later.

---

## Design

**Quasi-experimental, matched cohort, with a waitlist comparison group.**

Randomising access to something students are told will help them is a hard sell
inside an advising office, and it is not necessary. A waitlist gets most of the
way there and is easier to run: consented students are assigned to take the
instrument in the autumn or in the spring, the spring group serves as the
comparison for the autumn group, and everybody gets it.

Assignment should be random within the waitlist design where the partner will
allow it. If they will not, match on the variables that predict the outcomes —
entering credentials, first-generation status, Pell eligibility, declared versus
undeclared at entry, and college or school — and report the balance table.

**Analysis is intent-to-treat.** Students who consent and never finish stay in
their assigned group. Analysing only completers manufactures an effect out of
conscientiousness, and it is the single most common way pilots like this produce
numbers that do not replicate.

Report a per-protocol analysis alongside it, clearly labelled as secondary.

**Blinding.** Not possible for students or advisors. Say so, and note it as a
limitation rather than leaving it for a reviewer to find.

---

## Timeline

| Phase | Months | Work |
| --- | --- | --- |
| Setup | 1–2 | Co-investigator confirmed. IRB submission. Data-use agreement executed. Endpoints registered. Advisor briefing. Baseline measures collected from both arms. |
| Administration | 3–6 | Autumn arm takes the instrument. Printouts to advisors ahead of scheduled appointments. Per-session usefulness ratings collected. Test-retest subsample at week 8–12. |
| Readout | 7–9 | Post-measures both arms. Advisor interviews. Analysis against registered endpoints. Written report and dataset to the institution's research office. Spring arm takes the instrument. |

Scoped so it can run inside a single department. An athletics academic support
office, an advising centre, or a first-year programme is enough. Campus-wide
approval is not a prerequisite for producing the year-one evidence, and waiting
for it is how a pilot becomes a plan.

---

## Sample

**Target.** 200 to 400 consented students per arm. That is well short of retention
detection and entirely sufficient for the primary endpoints: at n=200 a completion
rate is estimated to within about ±7 points, which is plenty to tell a working
instrument from a broken one.

**Minimum viable.** 60 per arm. Below that the advisor-rating endpoint gets thin
and the test-retest subsample stops being interpretable.

**Why student-athletes are a good first cohort.** A defined roster, existing
mandatory advising touchpoints, academic support staff already tracking eligibility
and progress, and a department with a standing retention mandate. It also gives
natural comparison structure by team. The ethical caveat is real and is handled in
[`IRB_PROTOCOL.md`](./IRB_PROTOCOL.md#participants): an athlete asked to
participate by their academic support staff may not experience the ask as
optional.

---

## Measures

| Construct | Instrument | Notes |
| --- | --- | --- |
| Major confidence | An existing published career/major decision-making self-efficacy short form | Use a validated scale. Writing our own items adds a validation study we did not sign up for. |
| Belonging | An existing published sense-of-belonging short scale | Same reasoning. |
| Advisor usefulness | Five-point item plus one free-text line, per session | Purpose-built; it is a process measure, not a construct. |
| Completion, timing, sittings | Instrument telemetry | Already collected. |
| Enrolment, major, credits | Registrar, via the data-use agreement | Named field by field in the consent. |

Scale selection is the co-investigator's call. They will know which ones their
board and their colleagues accept, and licensing terms vary.

---

## Instrument provenance

Genius Mining v1.3 implements the **Genius Mining Starter**, Tool 7 of *The
Business of Life: Student Edition* (Adam Bond Devereau, Hidden Genius Labs LLC,
2026). The mapping is close to one-to-one:

| Book | Instrument |
| --- | --- |
| Step 1 — pick three moments you handled unusually well | A1, six instances across three moments |
| Step 2 — what did I notice that others missed; what options did I see; what made me choose | A2, A3, C2 |
| Step 3 — extract five to nine operating rules in your own words, each starting with "I" | Partially: collapsed into the working word (D1/D2) and the D3 sentence |
| Step 4 — test a principle against a current challenge | E1 |

**The gap is Step 3, and it matters.** The book asks for a set of operating rules
in the student's own language. The instrument produces a single working word. The
working word is the right anchor — it is countable, auditable, and it is what
makes D1 a computation rather than an opinion — but the operating rules are the
part a student can act on and the part an advisor can use in a session. They are
also the natural bridge to major discovery, because a field of study maps far
better onto a set of rules than onto one verb.

Adding a rules artefact to the output contract is the most substantive instrument
change on the table. It should happen **before** the pilot enrols, not during, or
the study is measuring an instrument we then changed.

The four tracks the book opens with — College, Work, Trade, and Figuring It Out —
are also worth noting to a partner. Genius Mining is the entry point for the
Figuring It Out track specifically, which is the population an advising office
worries about most, and the Trade track means this is not exclusively a
four-year-institution product.

---

## Limitations, stated up front

- No blinding is possible.
- Self-selection into consent. Report the consented-versus-eligible comparison on
  observable characteristics.
- Waitlist rather than true randomisation, unless the partner permits otherwise.
- Underpowered for retention and for major-change effects. Both are reported as
  estimates with intervals and labelled hypothesis-generating.
- Single institution in year one. External validity is exactly why the programme
  targets three.
- The instrument's analysis step uses a large language model. Model version and
  prompt version are stamped on every profile, and a model change mid-study is a
  protocol deviation that has to be reported, not a routine upgrade.

That last one is easy to overlook and is the kind of thing a methodologist will
catch. Freeze the model and the prompt for the duration of enrolment.
