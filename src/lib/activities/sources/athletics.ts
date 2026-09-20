/**
 * Athletics schedules from the department's published iCal feed.
 *
 * This is the highest-value source we have and the least ambiguous one to use.
 * Sidearm Sports, which runs most college athletics sites, publishes a calendar
 * feed precisely so people will subscribe to it, so there is no scraping and no
 * grey area here — we are using a feed the way it was meant to be used.
 *
 * The whole point is filling seats, so getting home and away right matters more
 * than anything else in this file. See `isHomeGame`.
 */

import type { Activity, ActivityDraft } from '@/lib/activities/types';
import { parseIcs } from '@/lib/activities/ics';

export type AthleticsFeed = {
  campus_id: string;
  /** Department-wide calendar. `sport_id=0` means every sport on Sidearm. */
  url: string;
  /** Stripped from summaries so rows read "Women's Soccer" not the full title. */
  teamPrefix: string;
  /**
   * Venues that count as home.
   *
   * A summary saying "vs" is not enough on its own: in the current URI feed,
   * 112 games say "vs" but a dozen of those are neutral-site and tournament
   * games in New Haven, Davidson, and Hampton. Telling a student to come watch
   * a home game in North Carolina is the kind of mistake that costs the whole
   * feature its credibility with the athletics department.
   */
  homeVenue: RegExp;
};

export const ATHLETICS_FEEDS: Record<string, AthleticsFeed> = {
  uri: {
    campus_id: 'uri',
    url: 'https://gorhody.com/calendar.ashx/calendar.ics?sport_id=0',
    teamPrefix: 'University of Rhode Island',
    homeVenue: /\bKingston\b/i,
  },
};

const RESULT_PREFIX = /^\[([WLT])\]\s*/;
/** Sidearm writes "Team vs Opponent" for home and "Team at Opponent" for away. */
const MATCHUP = /\s+(vs\.?|at)\s+/i;

type ParsedSummary = {
  sport: string;
  opponent: string | null;
  /** From the summary alone; the venue check happens separately. */
  listedAsHome: boolean;
  result: 'W' | 'L' | 'T' | null;
};

export function parseSummary(summary: string, teamPrefix: string): ParsedSummary {
  let rest = summary.trim();

  const resultMatch = RESULT_PREFIX.exec(rest);
  const result = resultMatch ? (resultMatch[1] as 'W' | 'L' | 'T') : null;
  if (resultMatch) rest = rest.slice(resultMatch[0].length);

  if (rest.toLowerCase().startsWith(teamPrefix.toLowerCase())) {
    rest = rest.slice(teamPrefix.length).trim();
  }

  const split = MATCHUP.exec(rest);
  if (!split) {
    return { sport: rest.trim(), opponent: null, listedAsHome: false, result };
  }

  return {
    sport: rest.slice(0, split.index).trim(),
    opponent: rest.slice(split.index + split[0].length).trim() || null,
    listedAsHome: split[1].toLowerCase().startsWith('vs'),
    result,
  };
}

/** Home means both "listed as vs" and "actually at one of our venues". */
export function isHomeGame(parsed: ParsedSummary, location: string, feed: AthleticsFeed): boolean {
  return parsed.listedAsHome && feed.homeVenue.test(location);
}

/**
 * Athletics rows carry PERFORMER and CONNECTOR by default.
 *
 * Attending is a social act and competing is a performing one, which is enough
 * to make a game a reasonable suggestion for those two working words. It is a
 * default, not a verdict: rows still need a person to move them to `verified`
 * before Genius Mining will recommend them.
 */
const DEFAULT_WORKING_WORDS = ['PERFORMER', 'CONNECTOR'] as const;

function tidyLocation(location: string): string | null {
  const cleaned = location.replace(/\s+/g, ' ').trim();
  return cleaned || null;
}

export function toActivities(ics: string, feed: AthleticsFeed): ActivityDraft[] {
  const drafts: ActivityDraft[] = [];

  for (const event of parseIcs(ics)) {
    if (!event.startsAt) continue;

    const parsed = parseSummary(event.summary, feed.teamPrefix);
    if (!parsed.sport) continue;

    const home = isHomeGame(parsed, event.location, feed);
    const name = parsed.opponent
      ? `${parsed.sport} ${home ? 'vs' : 'at'} ${parsed.opponent}`
      : parsed.sport;

    drafts.push({
      id: `athletics:${feed.campus_id}:${event.uid.split('-')[0]}`,
      campus_id: feed.campus_id,
      kind: 'game',
      name,
      summary: home
        ? `Home ${parsed.sport} game${parsed.opponent ? ` against ${parsed.opponent}` : ''}. Free for students with a valid ID.`
        : `Away ${parsed.sport} game${parsed.opponent ? ` at ${parsed.opponent}` : ''}.`,
      categories: ['Athletics', parsed.sport].filter(Boolean),
      scope: home ? 'on_campus' : 'off_campus',
      location: tidyLocation(event.location),
      url: event.url || null,
      image_url: null,
      starts_at: event.startsAt,
      ends_at: event.endsAt,
      all_day: event.allDay,
      athletics: {
        sport: parsed.sport,
        home,
        opponent: parsed.opponent,
        result: parsed.result,
      },
      source: 'athletics',
      source_ref: event.uid,
      working_words: home ? [...DEFAULT_WORKING_WORDS] : [],
    });
  }

  return drafts;
}

export async function fetchAthletics(feed: AthleticsFeed): Promise<ActivityDraft[]> {
  const response = await fetch(feed.url, {
    headers: { 'User-Agent': 'CampusQuest/1.0 (+https://campusquestapp.com)' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Athletics feed for ${feed.campus_id} returned ${response.status}`);
  }

  return toActivities(await response.text(), feed);
}

/** Upcoming home games, soonest first. The athletics department's actual ask. */
export function upcomingHomeGames(activities: Activity[], now = new Date()): Activity[] {
  return activities
    .filter((a) => a.athletics?.home && a.starts_at && new Date(a.starts_at) >= now)
    .sort((a, b) => (a.starts_at ?? '').localeCompare(b.starts_at ?? ''));
}
