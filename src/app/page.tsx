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

export default function LandingPage() {
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
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
