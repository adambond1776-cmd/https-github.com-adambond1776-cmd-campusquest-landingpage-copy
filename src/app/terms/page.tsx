import type { Metadata } from 'next';
import Link from 'next/link';
import LegalShell from '@/components/legal/LegalShell';
import { MINIMUM_AGE } from '@/lib/age';
import { IP_HOLDER, TERMS_VERSION, operatorName, privacyEmail } from '@/lib/legal';
import { FULL_RESTART_FEE, formatPrice } from '@/lib/pricing';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of use | CampusQuest',
  description:
    'The rules for using CampusQuest: accounts, billing, what you can post, what our activity listings do and do not promise, and how either side ends the arrangement.',
  alternates: siteUrl ? { canonical: `${siteUrl}/terms` } : undefined,
};

export default function TermsPage() {
  const operator = operatorName();
  const contact = privacyEmail();

  return (
    <LegalShell
      title="Terms of use"
      version={TERMS_VERSION}
      summary="The rules for using CampusQuest. Written to be read once and understood, because terms nobody reads protect nobody."
    >
      <h2 id="agreement">The agreement</h2>
      <p>
        Using CampusQuest means accepting these terms. The service is operated by{' '}
        <strong>{operator}</strong>, a Delaware corporation, under a licence from{' '}
        <strong>{IP_HOLDER}</strong>, which owns the Genius Mining method and the software. If you
        do not accept these terms, do not make an account.
      </p>

      <h2 id="who">Who can use it</h2>
      <p>
        You need to be {MINIMUM_AGE} or older and enrolled at, employed by, or otherwise connected
        to one of the campuses we cover. One account per person. Do not share your sign-in link;
        anyone holding it can read everything in your account, including your Genius Mining answers.
      </p>
      <p>
        <strong>If you are under 18</strong>, a parent or guardian has to confirm your account
        before it does anything, and they are agreeing to these terms alongside you. Under-18
        accounts can use the activity directory but not Genius Mining, and cannot hold a
        subscription — a guardian can pay for a seat, or your school can cover one. Your guardian
        can withdraw at any time, which closes the account.
      </p>

      <h2 id="listings">What our activity listings actually promise</h2>
      <p>
        This section matters more than it looks, so it is near the top rather than buried.
      </p>
      <p>
        Most of what you see in the directory comes from somewhere else: your university&rsquo;s
        events calendar, its student organization platform, its athletics department, and other
        public sources. We collect it, tidy it up, and show it to you in one place. We do not run
        those events and we do not control that information.
      </p>
      <p>So, plainly:</p>
      <ul>
        <li>
          <strong>Times, places, and prices can be wrong or out of date.</strong> Organizers change
          plans and do not always update the calendar we read. Every listing shows where it came
          from and when we last saw it, and links back to the source. Check the source before you
          travel.
        </li>
        <li>
          <strong>A listing is not a recommendation, an endorsement, or a safety assurance.</strong>{' '}
          Appearing in the directory means a source published it, nothing more.
        </li>
        <li>
          <strong>A club existing in our directory does not mean it is currently active.</strong> We
          mark listings as verified only when a person has confirmed them, and we show you which
          ones those are.
        </li>
        <li>
          <strong>What happens at an event is between you and whoever runs it.</strong> We are not a
          party to it and we do not supervise it.
        </li>
      </ul>
      <p>
        If you find a listing that is wrong, tell us and we will fix or remove it. That is the
        fastest route and we would rather hear it from you than leave it up.
      </p>

      <h2 id="submissions">What you can add, and what you cannot</h2>
      <p>
        You can suggest activities you think other students should know about. Suggestions go to a
        person for review and do not appear publicly until they are approved. We do this because an
        unreviewed listing on a service that universities are being asked to pay for is a problem we
        would own.
      </p>
      <h3>Events must clear your university first</h3>
      <p>
        This is the firmest rule on the page. <strong>If an event needs your university&rsquo;s
        permission, it needs that permission before it can appear on CampusQuest, not after.</strong>{' '}
        Nearly every campus, URI included, requires student organizations to register events through
        an official process and have them approved by a student activities office before they
        happen.
      </p>
      <p>
        We follow that process rather than routing around it. When you submit an event we ask you to
        confirm it has been registered and approved where your school requires it, and we may check.
        A listing that let students bypass their own university&rsquo;s event rules would be worth
        less than nothing to us: it would put students at risk, and it would end the institutional
        relationships this service depends on.
      </p>
      <p>
        Submitting an event you have falsely claimed is approved will get your account closed.
      </p>

      <h3>Never submit</h3>
      <ul>
        <li>
          <strong>Anything at a private residence.</strong> No exceptions, and no home addresses,
          ever.
        </li>
        <li>
          <strong>Gatherings whose main event is alcohol or any other drug</strong>, and anything
          involving alcohol and people under 21.
        </li>
        <li>
          <strong>Any event that requires university approval and does not have it.</strong> See
          above.
        </li>
        <li>
          Anything harassing, discriminatory, threatening, or unlawful; anything you do not have the
          right to post; other people&rsquo;s personal information; commercial promotion dressed up
          as a student activity.
        </li>
      </ul>
      <p>
        We can decline or remove any submission for any reason. Keeping the directory small and
        accurate is more valuable than keeping it large.
      </p>
      <p>
        You keep ownership of what you submit. You give us permission to display, format, and
        distribute it on the service, which is what listing it requires.
      </p>

      <h2 id="organizations">If you run a club or an organization</h2>
      <p>
        A free listing may be created for your organization from your university&rsquo;s public
        directory. You can claim it, correct it, or ask us to remove it at any time, at no cost and
        with no obligation to buy anything.
      </p>
      <p>
        A paid plan buys tools: publishing your own events, managing a roster, taking applications,
        and seeing how students find you. It does not buy placement. Paying will never move you up a
        student&rsquo;s list, and a student&rsquo;s results are not for sale. If that ever changes it
        will be disclosed on the page where it happens, in language that does not require a lawyer.
      </p>

      <h2 id="genius-mining">Genius Mining</h2>
      <p>
        Genius Mining is a structured self-reflection tool. It is not a psychological assessment,
        not a clinical instrument, not a diagnosis, and not career or mental health advice. It
        produces a description of how you appear to work based on what you told it, for you to
        argue with. Decisions about your major, your career, and your health are yours, ideally made
        with a human advisor who knows you.
      </p>
      <p>
        The instrument runs once per person. It is designed that way: a second run measures how you
        have learned to answer it, not how you think. Where a genuine change of circumstance
        justifies starting over, a full restart is available for {formatPrice(FULL_RESTART_FEE)} and
        replaces the previous profile rather than adding to it.
      </p>
      <p>
        The Genius Mining method, questionnaire, and analysis are licensed intellectual property and
        are not yours to reproduce, resell, or use to build a competing instrument. Your answers and
        your profile are yours, and you can export or delete them whenever you want.
      </p>

      <h2 id="billing">Paying</h2>
      <ul>
        <li>
          <strong>Subscriptions renew monthly</strong> until you cancel. Cancel any time; you keep
          access through the period you already paid for.
        </li>
        <li>
          <strong>Stripe handles payment.</strong> We never see your card number.
        </li>
        <li>
          <strong>The price you sign up at is the price you keep</strong> for as long as your
          subscription stays active. If we raise prices, existing subscribers stay where they are.
          Cancelling and returning later means the current price.
        </li>
        <li>
          <strong>If a school covers your seat</strong>, you are not billed, and your data is not
          put on a deletion timer just because you have no personal subscription.
        </li>
        <li>
          <strong>Refunds</strong>: write to <a href={`mailto:${contact}`}>{contact}</a> within
          fourteen days of a charge and we will refund it. After that, cancelling stops the next
          charge rather than reversing the last one.
        </li>
      </ul>

      <h2 id="conduct">Using the service reasonably</h2>
      <p>
        Do not scrape or bulk-download the directory, resell the data, break into other
        people&rsquo;s accounts, probe the service for vulnerabilities without telling us first, or
        automate access in a way that degrades it for students. If you are a researcher who wants
        the data, ask — the answer is often yes and always cheaper than reverse-engineering it.
      </p>

      <h2 id="ending">Ending it</h2>
      <p>
        Delete your account whenever you like from{' '}
        <Link href="/settings">your account settings</Link>. It happens straight away and no
        one has to approve it. If you would rather a person did it, email{' '}
        <a href={`mailto:${contact}`}>{contact}</a> and we will confirm when it is done. We can
        suspend or close an account that breaks these terms, and for anything short of serious
        misuse we will tell you why first and give you a chance to fix it. Your right to have your
        data deleted survives your account closing, and is described in the{' '}
        <Link href="/privacy">privacy notice</Link>.
      </p>

      <h2 id="disclaimer">The limits of what we owe you</h2>
      <p>
        CampusQuest is provided as it is. We do not warrant that it will be uninterrupted, that
        every listing is accurate, or that using it will produce any particular outcome for your
        social life, your major, or your career.
      </p>
      <p>
        To the extent the law allows, our total liability for any claim connected to the service is
        limited to what you paid us in the twelve months before the claim, and we are not liable for
        indirect or consequential losses. Nothing here limits liability that cannot lawfully be
        limited, including for fraud or for death or personal injury caused by negligence.
      </p>

      <h2 id="changes">Changes to these terms</h2>
      <p>
        We will post a new version with a new number and date. For changes that materially reduce
        what you get or increase what you owe, we will email you at least thirty days beforehand,
        and continuing to use the service after that means accepting them.
      </p>

      <h2 id="law">Governing law</h2>
      <p>
        These terms are governed by the law of the State of Rhode Island, and disputes belong to the
        courts sitting there.
      </p>

      <h2 id="contact">Contact</h2>
      <p>
        <a href={`mailto:${contact}`}>{contact}</a>.
      </p>
    </LegalShell>
  );
}
