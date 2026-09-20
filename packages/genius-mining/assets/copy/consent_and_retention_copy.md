# Consent & Retention — Student-Facing Copy

**Genius Mining · Phase 1 · Hidden Genius Labs LLC**

Drop-in copy for the build. Adam should have someone qualified review before launch — this
is drafted to be honest and readable, not to be a legal opinion.

---

## 1. On the consent screen, before the questionnaire starts

> **What happens to what you write**
>
> Your answers are analyzed to produce your Genius Profile. Your name is removed before that
> analysis happens — your form is tracked by a participant code, not by you.
>
> Your profile comes back to you. You can change anything on it. Nothing is filed until you
> say it's finished.
>
> We keep an anonymized copy of your answers — no name, no email, no contact details — to
> improve the questionnaire itself. That copy stays even if you cancel, because it is no
> longer connected to you.

**Implementation:** this must be an affirmative action — a checkbox or a button that says
"I understand." Not a pre-ticked box, not a footer link. Record the timestamp and the version
of this text the student agreed to.

---

## 2. Beside the A4 consent checkbox

> ☐ Campus Quest may contact me about campus activities related to what I wrote above.
>
> This is the only part of the form that travels with your name. Leave it blank and nothing
> from this question leaves the form attached to you.

Default unchecked. Always. This is the single route by which a name leaves the form.

---

## 3. On the membership / account page

> **If your membership ends**
>
> Your profile, your saved answers and your recommendations are deleted 30 days after your
> membership lapses or is cancelled. We'll email you at 7 days and again at 25 days before
> that happens.
>
> Deletion is permanent. If you come back later, you take the questionnaire again from the
> start — we won't have your old answers to restore.
>
> If you downloaded or printed your profile, that copy is yours and stays yours.
>
> The anonymized copy of your answers described when you started is not part of this
> deletion. It carries no name, no email and no way to identify you, and it is kept to improve
> the questionnaire.

---

## 4. Retention behaviour to implement

| Trigger | Action |
|---|---|
| Membership lapses or is cancelled | Set `retention.membership_status`, stamp `lapsed_at`, compute `purge_due_at` = lapsed_at + 30 days |
| Day 7 after lapse | Send warning email. Stamp `warning_7_sent_at` |
| Day 25 after lapse | Send second warning. Stamp `warning_25_sent_at` |
| Day 30 | De-identify, then purge. Set `deidentified_copy_retained: true`, status `purged` |
| Payment resumes before day 30 | Clear the lapse fields. Nothing is deleted |

**The de-identify step runs before the purge, not after.** Copy responses, working word,
confidence, `d1_resolution` and `thin_spots` into the development corpus keyed by participant
code. Drop name, email, contact details, A4 free text, and anything in E3.

**Do not purge on a schedule that can silently fail.** If the de-identify step errors, the
purge must not proceed — alert instead. Losing the corpus copy is worse than a late deletion.

---

## 5. What this copy deliberately does not say

- It does not promise the anonymized copy is deleted. It isn't, and saying so would be false.
- It does not claim analysis is done in-house. A third party processes name-stripped
  responses. If a student asks, that is the honest answer.
- It does not mention Phase 2. Using these responses to suggest academic direction is a
  separate purpose that gets its own consent when it's built.
