# Level Up Rhode Island — partner brief

Internal. School names appear here and not on the public page, because nobody has
signed anything and naming an institution as a partner before they have agreed is
the kind of thing that gets found and remembered.

---

## The programme

Three founding partner institutions in Rhode Island. One nine-month pilot each,
running concurrently where possible. $25 per student per year, held at that rate
for the term of any renewal.

Framing it as a state programme with a fixed number of slots does several things
at once. It makes a small pilot look like a deliberate cohort rather than a
shortage of customers. It creates competitive pressure between three institutions
who all know each other. And it turns "will you try our product" into "will you be
one of three", which is a materially different question to bring to a vice
president.

Three is also the right number methodologically: single-institution findings get
discounted, and three gives the year-two retention analysis somewhere to look for
external validity.

---

## Targets, in order

### University of Rhode Island — in motion

The athletic department has seen it and is enthusiastic enough to escalate. A
meeting with the vice president for student development is being arranged through
Nick's mentors.

**Nothing is agreed.** All copy, public and private, says "selecting three
founding partners" until there is a signature.

**The specific ask, in priority order:**

1. **A faculty co-investigator.** Human Development and Family Science, Education,
   or Psychology. This is the highest-value thing to leave the meeting with, and
   it is worth asking for it explicitly rather than hoping it emerges. It solves
   IRB access, registrar access, and credibility simultaneously, and a vice
   president can make the introduction in one email.
2. **A data-use agreement** covering the registrar fields the study needs. Bigger
   ask than permission to run a survey, and easy to leave the room without.
   Permission to survey with no data agreement produces a pilot that cannot answer
   its own question.
3. **A department to run in.** Athletics is already warm and is genuinely the best
   pilot population — defined roster, existing advising touchpoints, staff already
   tracking academic progress, standing retention mandate. Scoping to athletics
   also means the pilot does not need campus-wide approval to start.

**Consider proposing athletics as the whole of year one.** It is a smaller yes,
it can start sooner, it produces the same year-one endpoints, and it converts the
eventual campus-wide conversation from "approve this" into "scale the thing that
already ran here". A vice president who can approve a departmental pilot today is
worth more than one who needs a committee for a campus-wide one.

### Johnson & Wales University — next

Adam and his wife are both alumni and both live in Rhode Island. Planned approach
within about a week of the site going live, **regardless of where URI lands**.

The alumni connection is the warm door. The stronger argument is institutional:
JWU's programme mix and its emphasis on applied and career-directed study line up
unusually well with an instrument that asks how a student actually works rather
than what they scored. The book's Work and Trade tracks are a natural fit for a
population that is not exclusively traditional four-year.

### Salve Regina University — third

Smallest of the three, which is an advantage. Small institutions feel first-year
attrition immediately, decisions route through fewer people, and a student-affairs
office there can pilot something without a committee. Approach once one of the
first two is real enough to reference.

### Worth keeping in view

CCRI and New England Institute of Technology. The book's Trade track applies
directly, two-year and technical institutions have the sharpest persistence
problems in the state, and neither is competing with the four-years for the same
students. Not year one, but the reason the campus list in the product already
includes them.

---

## Sequencing

1. Site live, institutional page public, demand button collecting.
2. Faculty co-investigator conversations at URI, in parallel with the VP meeting
   rather than after it.
3. IRB and data-use agreement drafting begins the moment a co-investigator says
   yes. This is the long pole and it does not depend on the VP.
4. JWU approach, independent of URI's answer.
5. Salve once there is one live partner to name.

The dependency worth noticing: **the IRB and data-use work is the critical path,
not the pitch meetings.** A signed partner with no approved protocol cannot enrol
anybody, and boards do not meet on demand. Starting the protocol before the ink is
dry costs nothing if a partner falls through, and saves a term if one does not.

---

## The demand button

The public institutional page carries a button that lets a student ask their
school to cover Genius Mining. It counts; it does not email anyone.

That was a deliberate change from the original idea. A few hundred near-identical
emails arriving in a vice president's inbox from a vendor they have never heard of
reads as astroturf, and it would burn the exact relationship being built. The
aggregate carries the same information and can be walked into a meeting: *"Four
hundred and twelve of your students have asked you to do this."* That is a
different sentence from anything an inbox can produce.

Counts are per campus, deduplicated by student, and shown publicly on the page.
The threshold at which a campus total is worth taking to an administration is set
in `src/lib/campuses.ts` and is currently 100. Crossing it fires an operator
alert.

Students who tick the box get one email when their school signs up, and nothing
else. Everyone else is stored as a hash, which is enough to count them once and
not enough to contact them.

---

## What the public page does and does not say

**Says:** selecting three founding partners; applications open; $25 a student;
nine months; what a pilot this size can and cannot show; that the study runs under
the institution's IRB with their faculty co-investigator; that covered students
stop being charged and get refunded.

**Does not say:** any school's name as a partner, any retention claim, any effect
size, any expiry date on introductory student pricing.

The section headed "We are not going to tell you this fixes retention" is doing
real work. Every competitor in this space leads with an effect size. Being the one
that refuses to is both more honest and more memorable, and it is the paragraph
most likely to be read aloud to a colleague.
