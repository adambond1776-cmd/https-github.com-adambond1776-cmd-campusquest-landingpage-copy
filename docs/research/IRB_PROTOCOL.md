# Human subjects protocol — Genius Mining pilot

Draft outline for submission through a partner institution's review board. Written
to be handed to a faculty co-investigator, edited into that board's own forms, and
argued from. It is not itself a submission, and nobody here is an IRB
professional.

---

## Consent is the deadline

**Consent cannot be applied retroactively.** Everything else in this document can
be revised after the first student takes the instrument. This cannot.

There is a cohort of roughly two dozen students already lined up. If they take
Genius Mining under the product consent alone, their answers are product data
permanently. They can be described in a case study or a testimonial; they cannot
appear in an analysis presented as research, and no review board will retroactively
approve them.

Two ways out, in order of preference:

1. **Consent them for research before they take it.** Requires the research
   consent below and, strictly, IRB approval or an exemption determination first.
   If the faculty co-investigator is not in place yet, this is the reason to move
   on that this week rather than after the meeting.
2. **Treat that cohort as pre-study feasibility work**, use it to fix the
   instrument, and start the research cohort clean. Slower, entirely defensible,
   and it costs nothing but the sample.

Do not split the difference by consenting them "just in case" with a document a
review board has not seen. A board that finds an unapproved consent form in the
record trusts nothing else in the submission.

---

## Study framing

**Is this human subjects research?** Right now, arguably not. Running a
diagnostic to help your own students and looking at whether it helped is program
evaluation or quality improvement, and program evaluation is outside the
regulatory definition because it is not designed to produce generalizable
knowledge.

That defence disappears the moment the results are used to sell the product to
another institution, or submitted for publication, or presented as evidence that
Genius Mining works in general. All three are the plan. So the honest position is:
**this is research, treat it as research from the first participant.**

**Whose IRB.** The partner institution's, not ours. Hidden Genius Labs is an
external entity with no review board and no Federalwide Assurance. Two viable
routes:

- **A faculty co-investigator at the partner institution** submits the protocol
  with us named as a collaborator. Strongly preferred. It solves review, registrar
  data access, and credibility in one move, and it is the single highest-leverage
  thing to secure before any vice-president meeting.
- **An IRB authorization agreement** naming the institution's board as the board
  of record for the external party. Slower, and it still needs an internal sponsor
  in practice.

Departments to approach for a co-investigator: Human Development and Family
Science, Education, Psychology, or whoever teaches the research-methods sequence
for advising and student-affairs staff. Somebody who already publishes on
persistence, advising, or first-year experience.

---

## Exemption argument

Two categories under 45 CFR 46.104(d) plausibly apply. The board decides; we do
not.

**(d)(2) — surveys, interviews, and observation of public behaviour with adults.**
Applies when at least one of these holds:

- Information is recorded such that subjects cannot readily be identified,
  directly or through linked identifiers; **or**
- Disclosure outside the research could not reasonably place subjects at risk of
  criminal or civil liability, or damage to financial standing, employability,
  educational advancement, or reputation; **or**
- The information is identifiable but the board conducts a limited review.

**(d)(1) — research in established educational settings** on normal educational
practices, which advising arguably is.

**What preserves the (d)(2) argument, and what threatens it.**

| Preserves it | Threatens it |
| --- | --- |
| Analysis dataset carries a study ID, with the key held separately by the institution | Analysis dataset carries names, emails, or student IDs |
| Research arm restricted to 18 and over | Any participant under 18 |
| Free-text responses excluded from the analysis dataset at pilot scale | Narrative responses circulated with campus attached |
| Registrar outcomes joined by the institution and returned de-identified | We receive an identified registrar extract |

That third row is why the corpus was narrowed to structured data. A student's
account of the night their team fell apart is identifiable by anyone on that
campus who was there, and a review board will see that faster than we did.

**Assume the study is not exempt while designing it.** Building for full review
and being told it is exempt costs nothing. The reverse is a resubmission.

---

## Participants

**Inclusion.** Enrolled students, 18 or older, at a participating institution.

**Exclusion.** Under 18. Dual-enrolment and early-college students are the ones
this actually excludes, and it is worth being explicit with the partner about it:
including minors requires parental permission plus documented minor assent, a
different consent set, and usually full board review. The cost is real and the
benefit at pilot scale is not.

**Recruitment.** Through the partner's existing channels — an advising centre, an
athletics academic support office, a first-year seminar. Not by cold email from
CampusQuest, and not with an incentive large enough to be coercive relative to a
student's means. If an incentive is used, prorate it so a participant who
withdraws partway is still paid for what they did.

**Vulnerable populations.** Student-athletes are a plausible pilot cohort and
warrant a specific note in the submission: an athlete asked by their academic
support staff to participate may not experience the request as optional.
Mitigations to name explicitly — participation and its content are invisible to
coaching staff and to eligibility decisions, recruitment is done by someone with
no authority over playing time, and declining is recorded nowhere.

---

## Consent architecture

**Two consents, deliberately separate.**

| | Product consent | Research consent |
| --- | --- | --- |
| Already exists | Yes, shipped | No, to be drafted with the co-investigator |
| Covers | Processing answers to produce a profile; retention and deletion; the anonymised structured corpus | Analysis of de-identified responses joined to academic outcomes, for research reported outside the institution |
| Required to use the product | Yes | No |
| Withdrawable | Ends the service | Withdraws data from analysis, service continues |

A student can use Genius Mining and decline research. A student can withdraw from
research and keep their profile. Neither decision affects the other, and the
interface has to make that true rather than merely say it.

**Elements the research consent needs**, beyond the product consent already
shipped:

1. That this is research, who is running it, and that a review board approved it.
2. What outcome data is joined in — enrolment status, declared major and changes
   to it, credits attempted and completed, and, if in scope, GPA. Name each field.
   "Academic records" is not informed consent.
3. That findings will be published or presented, and that no individual will be
   identifiable in anything published.
4. How to withdraw, that withdrawal is honoured for anything not yet published,
   and who to contact.
5. That declining costs them nothing — not their profile, not their advising, not
   their standing.
6. Contact details for the institution's human subjects office, independent of us.

**Withdrawal has an engineering consequence.** A withdrawn participant's row has
to leave the analysis dataset and the corpus, and the corpus is deliberately
unlinkable by design. Reconciling those two facts is not free. The workable answer
is a study-scoped table holding `study_id → participant_code`, held by the
institution, kept for the duration of the study, and destroyed at closeout. The
anonymous corpus stays out of the study entirely.

---

## Data handling

**What we hold.** Responses keyed by participant code, with no name on the row.
Identity lives on the account record.

**What the analysis dataset holds.** A study ID, structured responses, the
instrument's output, and the outcome variables the institution returns. No name,
no email, no institutional student ID, and no free text at pilot scale.

**Who holds the key.** The institution. We should not be able to re-identify a
participant, and being unable to is a stronger position than promising not to.

**Registrar data.** Requires a written data-use agreement covering FERPA. Under
the studies exception at 34 CFR 99.31(a)(6) an institution may disclose personally
identifiable information from education records to an organisation conducting a
study on its behalf, under a written agreement specifying purpose, scope,
duration, and destruction of the information. That agreement is the real ask, and
it is a bigger one than permission to run a survey. **A yes on the survey without
a yes on the data agreement produces a pilot that cannot answer its own
questions.** Say so in the meeting.

The cleaner variant, if their institutional research office will do it: they hold
both the outcome data and the key, we send them the instrument output keyed by
study ID, and they run the join and return aggregates. Slower, and it removes the
entire FERPA surface.

**Retention.** Study data for the period the board specifies, then destroyed.
Product data on the existing 30-day post-entitlement schedule. The two clocks are
independent and the consent documents must not imply otherwise.

**Breach.** Notification to the institution within 24 hours of discovery. Put a
number in the agreement; "promptly" is not a commitment.

---

## Risks and mitigations

**The instrument surfaces material a student has not said out loud.** Question E3
asks precisely that, and some answers will be heavy. This is the known risk, and
it is why support resources appear on the final page, never collapsed and never
optional, and why E2 and E3 never enter the corpus. The submission should name
the risk plainly rather than characterising the instrument as low-risk and hoping
nobody reads question E3.

**A student is told something about themselves and believes it.** Genius Mining
is a self-authored diagnostic, not a validated psychometric instrument, and it
must never be described as one. The book's own line is the right one to keep in
the protocol and in the product: *"It's not a personality test. It's a
diagnostic."* Every output carries a confidence rating and an explicit list of
where the read is thin, and the advisor printout says when the result came from a
tally too thin to resolve.

**Advising influence.** An advisor who sees a profile before a student's
appointment may steer differently. That is the intended mechanism, and it is also
a confound and an ethical exposure. Advisors need to be told what the instrument
does not know, and the printout already carries that.

**Re-identification.** Addressed by the structured-only corpus, the study ID, and
the institution holding the key.

---

## Deliverables checklist

- [ ] Faculty co-investigator identified and willing
- [ ] Protocol drafted in the institution's own format
- [ ] Research consent document, separate from product consent
- [ ] Data-use agreement covering registrar fields
- [ ] Human subjects training certificates for everyone on the protocol
- [ ] Analysis plan and endpoints registered before enrolment opens
- [ ] Study ID mapping table specified, with custody and a destruction date
- [ ] Withdrawal procedure implemented, not just described
- [ ] Support-resource escalation path agreed with the institution's counselling
      service, in writing

---

## What this document is not

It is not legal advice, it is not an IRB submission, and it is not a substitute
for the co-investigator who will know the local board's actual preferences. Its
job is to make sure the first conversation with that person starts somewhere
useful.
