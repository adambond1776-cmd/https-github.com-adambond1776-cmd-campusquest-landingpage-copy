import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import InterestRecommendations from '@/components/activities/InterestRecommendations';
import type { InterestRecommendation } from '@/lib/activities/interest-recommendations';
import type { Activity } from '@/lib/activities/types';

const NOW = '2026-09-24T23:26:39.000Z';
const IMAGE = 'https://se-images.campuslabs.com/event.png';

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: 'one',
    campus_id: 'uri',
    name: 'Listing',
    summary: 'A public listing',
    categories: ['Academic & Professional'],
    kind: 'event',
    scope: 'on_campus',
    location: 'Memorial Union',
    url: 'https://example.edu/listing',
    image_url: IMAGE,
    starts_at: '2026-09-25T18:00:00.000Z',
    ends_at: '2026-09-25T20:00:00.000Z',
    all_day: false,
    athletics: null,
    source: 'localist',
    source_ref: 'one',
    first_seen: NOW,
    last_seen: NOW,
    status: 'verified',
    verified_at: NOW,
    verified_by: 'fixture',
    working_words: [],
    low_commitment_entry: null,
    ...overrides,
  };
}

function recommendation(overrides: Partial<Activity>, reason: string): InterestRecommendation {
  return {
    activity: activity(overrides),
    score: 4,
    matchedInterests: ['Science, technology & making'],
    matchedDetails: [],
    reason,
  };
}

const recommendations = [
  recommendation({ id: 'club', name: 'Robotics Club', kind: 'organization', summary: 'Robotics club', starts_at: null, ends_at: null, image_url: IMAGE }, 'Because you’re interested in “Science, technology & making”'),
  recommendation({ id: 'org', name: 'Campus Senate', kind: 'organization', summary: 'Student government organization', starts_at: null, ends_at: null }, 'Because you’re interested in “Academic interests & study groups”'),
  recommendation({ id: 'event', name: 'Robotics Night', kind: 'event' }, 'Because you’re interested in “Science, technology & making”'),
];

function html(props: { signedIn: boolean; hasInterests: boolean; basicActive?: boolean; recommendations?: InterestRecommendation[] }) {
  return renderToStaticMarkup(createElement(InterestRecommendations, {
    recommendations,
    ...props,
  }));
}

describe('recommendation section by account state', () => {
  it('keeps the signed-out prompt and does not show personal reasons', () => {
    const markup = html({ signedIn: false, hasInterests: false });
    expect(markup).toContain('Sign in to personalize');
    expect(markup).toContain('browse all listings below');
    expect(markup).not.toContain('Because you’re interested');
    expect(markup).not.toContain('Robotics Club');
    expect(markup).not.toContain('Explore CampusQuest Basic');
  });

  it('shows an upgrade state for a Free user with saved interests and hides club and organization cards', () => {
    const markup = html({ signedIn: true, hasInterests: true, basicActive: false });
    expect(markup).toContain('Recommendations built around you');
    expect(markup).toContain('CampusQuest Basic uses your interests to recommend clubs and organizations');
    expect(markup).toContain('Explore CampusQuest Basic');
    expect(markup).toContain('href="/#pricing"');
    expect(markup).not.toContain('Tell us what you’re into');
    expect(markup).not.toContain('Robotics Club');
    expect(markup).not.toContain('Campus Senate');
    expect(markup).not.toContain('>Clubs<');
    expect(markup).not.toContain('>Organizations<');
    expect(markup).toContain('Robotics Night');
    expect(markup).toContain('Because you’re interested in “Science, technology &amp; making”');
  });

  it('does not tell a Free user without interests that their interests are missing', () => {
    const markup = html({ signedIn: true, hasInterests: false, basicActive: false });
    expect(markup).toContain('Recommendations built around you');
    expect(markup).toContain('Explore CampusQuest Basic');
    expect(markup).not.toContain('Tell us what you’re into');
    expect(markup).not.toContain('Choose a few interests');
    expect(markup).not.toContain('Robotics Club');
  });

  it('shows the full personalized directory for a Basic user with interests', () => {
    const extraEvents = Array.from({ length: 6 }, (_, index) => recommendation(
      { id: `event-${index}`, name: `Robotics Night ${index}`, kind: 'event' },
      'Because you’re interested in “Science, technology & making”',
    ));
    const markup = html({ signedIn: true, hasInterests: true, basicActive: true, recommendations: [...recommendations, ...extraEvents] });
    expect(markup).toContain('Recommended for you');
    expect(markup).toContain('>All<');
    expect(markup).toContain('>Clubs<');
    expect(markup).toContain('>Events<');
    expect(markup).toContain('>Organizations<');
    expect(markup).toContain('Show more');
    expect(markup).toContain('Robotics Club');
    expect(markup).toContain('Campus Senate');
    expect(markup).toContain('Robotics Night');
    expect(markup).toContain('Because you’re interested in “Science, technology &amp; making”');
    expect(markup).toContain('Because you’re interested in “Academic interests &amp; study groups”');
    expect(markup).toContain('se-images.campuslabs.com');
    expect(markup).not.toContain('Explore CampusQuest Basic');
  });

  it('asks a Basic user without interests to choose them', () => {
    const markup = html({ signedIn: true, hasInterests: false, basicActive: true, recommendations: [] });
    expect(markup).toContain('Tell us what you’re into');
    expect(markup).toContain('Edit your interests');
    expect(markup).toContain('href="/settings"');
    expect(markup).not.toContain('Explore CampusQuest Basic');
    expect(markup).not.toContain('Robotics Club');
  });

  it('shows the Free upgrade when an expired Basic user still has interests', () => {
    const markup = html({ signedIn: true, hasInterests: true, basicActive: false });
    expect(markup).toContain('Explore CampusQuest Basic');
    expect(markup).not.toContain('Robotics Club');
    expect(markup).not.toContain('Campus Senate');
  });
});
