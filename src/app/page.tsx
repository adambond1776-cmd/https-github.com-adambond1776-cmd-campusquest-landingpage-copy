import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Problem from '@/components/Problem';
import ForStudents from '@/components/ForStudents';
import ForOrganizations from '@/components/ForOrganizations';
import HowItWorks from '@/components/HowItWorks';
import Pricing from '@/components/Pricing';
import FinalCTA from '@/components/FinalCTA';
import Footer from '@/components/Footer';
import SponsorBanner from '@/components/SponsorBanner';
import { ACTIVE_SPONSOR } from '@/lib/launch-offers';
import { isDemoAccountEmail } from '@/lib/account/demo-account';
import { loadOwnBasicEntitlement } from '@/lib/basic/store';
import { loadClubOfferState } from '@/lib/clubs/representation-store';
import { sessionPrivileges, signedInUser } from '@/lib/session';

export default async function LandingPage() {
  const user = await signedInUser();
  const session = await sessionPrivileges();
  const basic = user ? await loadOwnBasicEntitlement() : null;
  const clubState = await loadClubOfferState(session.state === 'signed-in' ? session.userId : null);
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <SponsorBanner placement={ACTIVE_SPONSOR} />
        <Problem />
        <ForStudents />
        <ForOrganizations />
        <HowItWorks />
        <Pricing basicActive={basic?.active === true} purchasesBlocked={isDemoAccountEmail(user?.email)} clubState={clubState} />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
