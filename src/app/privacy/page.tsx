import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '@/components/legal/LegalShell';
import { CONSENT_ASSURANCE_NOTE, MINIMUM_AGE } from '@/lib/age';
import {
  CONSENT_TIERS,
  IP_HOLDER,
  PRIVACY_VERSION,
  operatorName,
  privacyEmail,
  legalAddress,
} from '@/lib/legal';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy and data use | CampusQuest',
  description:
    'What CampusQuest collects, why, who else touches it, how long it is kept, and how to get it deleted. Written in plain language.',
  alternates: siteUrl ? { canonical: `${siteUrl}/privacy` } : undefined,
};

export default function PrivacyPage() {
  const operator = operatorName();
  const contact = privacyEmail();
  const address = legalAddress();

  return (
    <LegalShell
      title="Privacy and data use"
      version={PRIVACY_VERSION}
      summary="What we collect, why we collect it, who else touches it, how long we keep it, and how to make us delete it. No defined terms, no cross-references, nothing hidden in a schedule."
    >
      <h2 id="short-version">The short version</h2>
      <p>
        CampusQuest stores your email address, the plan you picked, and the activities you save.
        That is enough to sign you in and show you a list that remembers what you liked. We do not
        sell student data, we do not rent it, and no advertiser buys access to who you are.
      </p>
      <p>
        Genius Mining is the one part that collects something more personal, because you write about
        yourself to use it. It is optional, it asks for its own consent before you answer anything,
        and your identified answers are deleted on request or within thirty days of losing access,
        whichever comes first.
      </p>
      <p>
        Everything below is the same statement with the details filled in.
      </p>

      <h2 id="who-we-are">Who operates this service</h2>
      <p>
        CampusQuest is operated by <strong>{operator}</strong>
        {address ? `, ${address}` : ''}, a Delaware corporation. It is the company that holds your
        account, answers for your data, and appears on your card statement.
      </p>
      <p>
        The Genius Mining method and the software are owned by <strong>{IP_HOLDER}</strong> and
        licensed to {operator}. That split matters to you for one reason only: {IP_HOLDER} does not
        receive your identified answers. It owns the instrument, not the responses.
      </p>
      <p>
        Questions about anything on this page, and any request to see or delete your data, go to{' '}
        <a href={`mailto:${contact}`}>{contact}</a>. A person reads that address.
      </p>

      <h2 id="what-we-collect">What we collect</h2>

      <h3>When you make an account</h3>
      <ul>
        <li>
          <strong>Your email address.</strong> We send a 6-digit verification code to
          your school email to create the account. Existing accounts can sign in with
          a login link. There is no password to store.
        </li>
        <li>
          <strong>The activities you save, and the listings you report.</strong> So the
          directory can remember what you liked and so we can correct what is wrong.
        </li>
        <li>
          <strong>Your plan, and whether it is paid for.</strong> Including whether a school is
          covering it for you.
        </li>
      </ul>

      <h3>When you use the activity directory</h3>
      <ul>
        <li>
          <strong>What you save and follow.</strong> Clubs, teams, and events you mark as
          interesting.
        </li>
        <li>
          <strong>Nothing about where you physically are.</strong> The directory does not ask for
          location permission and does not track your device.
        </li>
      </ul>

      <h3>When you take Genius Mining</h3>
      <ul>
        <li>
          <strong>Your answers.</strong> Some are checkboxes and counts. Several are paragraphs you
          write about your own life, which is the most personal material on the service.
        </li>
        <li>
          <strong>The profile it produces</strong>, and any edit you make to it afterwards. Both
          versions are kept, so an advisor can tell what the instrument said and what you corrected.
        </li>
      </ul>

      <h3>When you ask your school to cover it</h3>
      <ul>
        <li>
          <strong>Your campus and a one-way hash of your email</strong>, so the same person cannot
          be counted twice.
        </li>
        <li>
          <strong>Your email itself only if you ticked the box</strong> asking to hear back. If you
          did not tick it, we keep the hash and not the address.
        </li>
      </ul>

      <h2 id="analytics">What we do not collect</h2>
      <p>
        There is no advertising network on this site, no third-party analytics script, no
        cross-site tracker, and no cookie banner, because there is nothing to consent to. The only
        cookie we set is the one that keeps you signed in.
      </p>

      <h2 id="who-else">Who else touches your data</h2>
      <p>
        Running this service means using other companies. These are all of them, and what each one
        actually receives:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — the database and the sign-in system. Holds your account and,
          if you take it, your Genius Mining answers.
        </li>
        <li>
          <strong>Anthropic</strong> — the analysis engine behind Genius Mining. This is the one
          worth reading twice: when you run the analysis, the answers you wrote are sent to
          Anthropic&rsquo;s API to be processed. They are sent without your name or email attached,
          under commercial API terms that do not permit training on them, but they do leave our
          systems. If you would rather that never happened, do not run the analysis. Nothing else on
          CampusQuest sends your writing anywhere.
        </li>
        <li>
          <strong>Stripe</strong> — payments. Stripe takes your card details directly; we never see
          or store a card number. We receive only whether the subscription is active.
        </li>
        <li>
          <strong>Resend</strong> — email delivery, for sign-in links and the notice before your
          data is deleted.
        </li>
        <li>
          <strong>Vercel</strong> — hosting. Sees ordinary web request logs.
        </li>
      </ul>
      <p>
        That is the complete list. If it changes, this page changes with it.
      </p>

      <h2 id="consent-layers">The three layers of consent</h2>
      <p>
        Using a product and being studied are different things, and rolling them into one signup
        checkbox is how a pilot ends up in front of a review board it never applied to. So they are
        separate here, and each one is granted on its own:
      </p>
      {CONSENT_TIERS.map((tier) => (
        <div key={tier.id}>
          <h3>
            {tier.label}
            {tier.active ? '' : ' — not currently offered'}
          </h3>
          <p>
            <strong>How it is granted.</strong> {tier.granted}
          </p>
          <p>
            <strong>What it covers.</strong> {tier.scope}
          </p>
          <p>
            <strong>What it does not allow.</strong> {tier.limits}
          </p>
        </div>
      ))}
      <p>
        On the third layer: if CampusQuest ever supports formal research with a partner institution,
        it will go through that institution&rsquo;s review board first, it will have its own consent
        form, and it will only cover data collected after approval. Agreeing will never be a
        condition of using anything you paid for.{' '}
        <Link href="/institutions">The institutional page</Link> describes how that would work.
      </p>

      <h2 id="retention">How long we keep things</h2>
      <ul>
        <li>
          <strong>Your account</strong> — until you delete it.
        </li>
        <li>
          <strong>Genius Mining answers and profile</strong> — while you have access, then thirty
          days. Losing access starts a clock, and we email you before it runs out so nothing
          disappears as a surprise. A school covering your seat counts as access, so an institution
          paying for you does not put your answers on a deletion timer.
        </li>
        <li>
          <strong>Anything, on request</strong> — deleted when you ask, without a retention period.
        </li>
        <li>
          <strong>De-identified records</strong> — kept after the identified copy is destroyed, with
          no name, email, or student identifier, and no way for us to reconnect them to you. During
          the pilot these hold only structured fields; free-text answers are discarded rather than
          de-identified, because a paragraph of someone&rsquo;s writing can identify them in a group
          this small no matter what is stripped out of it.
        </li>
      </ul>

      <h2 id="your-rights">What you can make us do</h2>
      <p>
        Deleting is immediate and does not go through us:{' '}
        <Link href="/settings">your account settings</Link> has a button that erases your
        account and everything listed above, and it runs the moment you confirm.
      </p>
      <p>
        For anything else, email <a href={`mailto:${contact}`}>{contact}</a> and we will,
        within thirty days:
      </p>
      <ul>
        <li>send you a copy of everything we hold about you;</li>
        <li>correct anything wrong;</li>
        <li>delete your account for you, if you would rather a person did it;</li>
        <li>tell you exactly which of the companies above holds what.</li>
      </ul>
      <p>
        You do not need a reason and asking will not affect your access to anything you paid for.
      </p>

      <h2 id="age">Age, and students under 18</h2>
      <p>
        The floor is {MINIMUM_AGE}. We do not knowingly collect anything from anyone younger, and if
        you believe a child has an account, write to <a href={`mailto:${contact}`}>{contact}</a> and
        we will delete it.
      </p>
      <p>
        Between {MINIMUM_AGE} and 18 you can use CampusQuest, but only after a parent or guardian
        confirms it. You give us their name and email, we send them a link explaining exactly what
        we collect, and <strong>your account does nothing at all until they follow it</strong>. They
        can withdraw at any time, which closes the account and deletes what we hold.
      </p>
      <p>
        What an under-18 account can reach is deliberately narrower than an adult&rsquo;s. The
        activity directory is open, because it is public information about public campus events.
        Genius Mining is not, at any age under 18 and regardless of guardian consent, because it
        asks you to write at length about your own life and sends that writing to a language model.
        Subscriptions are adult-only too; a guardian can buy a seat, and an institution covering
        seats covers students of any age.
      </p>
      <p>
        We store the guardian&rsquo;s name and email, when they consented, and which version of
        these documents they saw. We store your birth year rather than your full date of birth,
        because the year is enough to apply the rule and the full date is more identifying than we
        need.
      </p>
      <p>
        One limitation we would rather state than let you assume: {CONSENT_ASSURANCE_NOTE.charAt(0).toLowerCase()}
        {CONSENT_ASSURANCE_NOTE.slice(1)}
      </p>

      <h2 id="security">Security, honestly stated</h2>
      <p>
        Data is encrypted in transit and at rest, sign-in uses one-time links rather than passwords,
        and the parts of the system that can read every record are limited to two background jobs
        that run without a user session. That is a real standard and it is not a guarantee. No
        service can promise it will never be breached, and one that does is telling you something
        it cannot know.
      </p>

      <h2 id="changes">Changes</h2>
      <p>
        The version number and date at the top of this page change whenever the substance does. If a
        change affects what we may do with data we already hold, we will email you before it takes
        effect rather than quietly reposting the page.
      </p>
    </LegalShell>
  );
}
