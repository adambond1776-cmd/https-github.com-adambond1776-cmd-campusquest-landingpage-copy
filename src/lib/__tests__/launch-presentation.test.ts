import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Pricing from '@/components/Pricing';
import SponsorBanner from '@/components/SponsorBanner';
import LaunchContact from '@/components/LaunchContact';
import FoundingOfferPrompt from '@/components/activities/FoundingOfferPrompt';
import {
  ACTIVE_SPONSOR,
  CLUB_DISCOVERY_POLICY,
  FOUNDING_OFFERS,
  FOUNDING_TERMS,
  launchPlanDisplay,
  safeSponsorHref,
} from '@/lib/launch-offers';
import { CHECKOUT_LIVE, PLANS } from '@/lib/pricing';

afterEach(() => vi.unstubAllEnvs());

describe('founding offer presentation, not payment configuration', () => {
  it('preserves the disconnected monthly TEST catalog and checkout switch', () => {
    expect(CHECKOUT_LIVE).toBe(false);
    expect(PLANS.basic.price).toBe(3);
    expect(PLANS.premium.price).toBe(5);
    expect(PLANS.club.price).toBe(49);
  });

  it('describes bounded one-time student and club offers separately', () => {
    expect(FOUNDING_OFFERS.student).toEqual({ amount: 5, days: 60, optionalMonthly: 3 });
    expect(FOUNDING_OFFERS.club).toEqual({ amount: 99, days: 90, optionalMonthly: 49 });
    expect(FOUNDING_TERMS).toContain('No automatic renewal');
    expect(FOUNDING_TERMS).toContain('separate choice');
  });

  it.each([
    ['free', '$0', ''],
    ['basic', '$5', ' / 60 days'],
    ['club', '$99', ' / 90 days'],
    ['premium', 'Later', ''],
  ] as const)('keeps the %s signup price consistent without changing plan IDs', (id, price, period) => {
    expect(launchPlanDisplay(id)).toEqual({ price, period });
  });

  it('shows two unavailable paid offers and a working free directory link', () => {
    const html = renderToStaticMarkup(createElement(Pricing));
    expect(html.match(/Not yet available to purchase/g)).toHaveLength(2);
    expect(html).toContain('href="/activities"');
    expect(html).toContain('One payment for 60 days');
    expect(html).toContain('One payment for 90 days');
    expect(html).toContain('no payment is collected here');
    expect(html).not.toContain('href="/billing');
    expect(html).not.toContain('No ads, ever');
    expect(html).not.toContain('Price locked');
  });

  it('does not imply a filtered search was saved or provide a fake save control', () => {
    const html = renderToStaticMarkup(createElement(FoundingOfferPrompt));
    expect(html).toContain('this search has not been saved to an account');
    expect(html).toContain('bookmark this filtered page');
    expect(html).toContain('href="/#pricing"');
    expect(html).not.toContain('<button');
  });

  it('keeps corrections free and paid placement separate from discovery', () => {
    expect(CLUB_DISCOVERY_POLICY).toContain('whether or not they pay');
    expect(CLUB_DISCOVERY_POLICY).toContain('corrections are free');
    expect(CLUB_DISCOVERY_POLICY).toContain('do not buy a higher position');
  });

  it('leaves recognition undecided and does not display legacy reward promises', () => {
    const report = readFileSync(new URL('../../components/activities/ReportPanel.tsx', import.meta.url), 'utf8');
    const contribute = readFileSync(new URL('../../app/contribute/page.tsx', import.meta.url), 'utf8');
    expect(report).not.toContain('REPORTS_PER_FREE_MONTH');
    expect(report).not.toContain('done.message');
    expect(report).not.toContain('next month is free');
    expect(contribute).toContain('Payment alone does not establish leadership');
    expect(contribute).toContain('not finalized or');
    expect(contribute).toContain('You do not need a paid membership');
  });
});

describe('bounded sponsor placement', () => {
  it('renders nothing until a real approved sponsor is supplied', () => {
    expect(ACTIVE_SPONSOR).toBeNull();
    expect(renderToStaticMarkup(createElement(SponsorBanner, { placement: ACTIVE_SPONSOR }))).toBe('');
  });

  it('labels a supplied sponsor as advertising and safely marks the outbound link', () => {
    const html = renderToStaticMarkup(createElement(SponsorBanner, {
      placement: { name: 'QA sponsor, not a real partner', message: 'An optional opportunity', href: 'https://example.com/opportunity' },
    }));
    expect(html).toContain('aria-label="Advertisement"');
    expect(html).toContain('>Advertisement<');
    expect(html).toContain('rel="sponsored noopener noreferrer"');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
  });

  it.each(['javascript:alert(1)', 'http://example.com', '/relative', 'https://name:secret@example.com'])(
    'rejects an unsafe sponsor destination: %s', (href) => {
      expect(safeSponsorHref(href)).toBeNull();
      expect(renderToStaticMarkup(createElement(SponsorBanner, {
        placement: { name: 'QA', message: 'QA only', href },
      }))).toBe('');
    },
  );

  it('does not create a blank ad', () => {
    expect(renderToStaticMarkup(createElement(SponsorBanner, {
      placement: { name: ' ', message: 'QA', href: 'https://example.com' },
    }))).toBe('');
  });
});

describe('honest contact availability', () => {
  it.each(['', 'not-an-email', 'hello@example.com?bcc=someone@example.com'])(
    'does not send users to an unconfigured or invalid contact: %s', (value) => {
      vi.stubEnv('CQ_PARTNERSHIP_EMAIL', value);
      const html = renderToStaticMarkup(createElement(LaunchContact, { subject: 'Feedback', label: 'Draft email' }));
      expect(html).toContain('No request has been');
      expect(html).not.toContain('mailto:');
    },
  );

  it('opens a draft only when an explicit public mailbox is configured', () => {
    vi.stubEnv('CQ_PARTNERSHIP_EMAIL', 'launch@example.com');
    const html = renderToStaticMarkup(createElement(LaunchContact, { subject: 'Feedback & ideas', label: 'Draft email' }));
    expect(html).toContain('mailto:launch@example.com?subject=Feedback%20%26%20ideas');
  });
});
