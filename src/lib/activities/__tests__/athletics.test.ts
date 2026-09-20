import { describe, expect, it } from 'vitest';
import { parseIcs, parseIcsDate } from '@/lib/activities/ics';
import { isHomeGame, parseSummary, toActivities } from '@/lib/activities/sources/athletics';

const FEED = {
  campus_id: 'uri',
  url: 'https://gorhody.com/calendar.ashx/calendar.ics?sport_id=0',
  teamPrefix: 'University of Rhode Island',
  homeVenue: /\bKingston\b/i,
};

/** Trimmed from the live gorhody.com feed, CRLF and folding preserved. */
const SAMPLE = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:vcal_11981-gorhody.com',
  'DTSTART:20260812T230000Z',
  'DTEND:20260813T010000Z',
  'LOCATION:Kingston\\, R.I.\\, URI Soccer Complex',
  "SUMMARY:[W] University of Rhode Island Women's Soccer vs Maine",
  'URL:https://gorhody.com/calendar.aspx?game_id=11981&amp;sport_id=13',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:vcal_11982-gorhody.com',
  'DTSTART:20260815T223000Z',
  'LOCATION:Providence\\, RI',
  "SUMMARY:[L] University of Rhode Island Women's Soccer at Providence",
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:vcal_12050-gorhody.com',
  'DTSTART:20261120T180000Z',
  'LOCATION:New Haven\\, CT',
  "SUMMARY:University of Rhode Island Men's Basketball vs Quinnipiac",
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:vcal_12099-gorhody.com',
  'DTSTART:20261201T190000Z',
  'LOCATION:Kingston\\, RI\\, Thomas M. Ryan Center',
  'SUMMARY:University of Rhode Island Football vs A Very Long Opponent Name Th',
  ' at Was Folded',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('parseIcsDate', () => {
  it('reads a UTC instant', () => {
    expect(parseIcsDate('20260812T230000Z').iso).toBe('2026-08-12T23:00:00.000Z');
  });

  it('reads a date-only value as all day', () => {
    const parsed = parseIcsDate('20260812');
    expect(parsed.allDay).toBe(true);
    expect(parsed.iso).toBe('2026-08-12T00:00:00.000Z');
  });

  it('returns null for junk rather than an invalid date', () => {
    expect(parseIcsDate('not-a-date').iso).toBeNull();
  });
});

describe('parseIcs', () => {
  it('unescapes commas in a location', () => {
    const [first] = parseIcs(SAMPLE);
    expect(first.location).toBe('Kingston, R.I., URI Soccer Complex');
  });

  it('decodes HTML entities in a URL', () => {
    const [first] = parseIcs(SAMPLE);
    expect(first.url).toBe('https://gorhody.com/calendar.aspx?game_id=11981&sport_id=13');
  });

  it('rejoins a folded line instead of truncating it', () => {
    const folded = parseIcs(SAMPLE).find((event) => event.uid.startsWith('vcal_12099'));
    expect(folded?.summary).toContain('A Very Long Opponent Name That Was Folded');
  });
});

describe('parseSummary', () => {
  it('splits sport, opponent, and result off a home fixture', () => {
    const parsed = parseSummary(
      "[W] University of Rhode Island Women's Soccer vs Maine",
      FEED.teamPrefix
    );

    expect(parsed.sport).toBe("Women's Soccer");
    expect(parsed.opponent).toBe('Maine');
    expect(parsed.listedAsHome).toBe(true);
    expect(parsed.result).toBe('W');
  });

  it('reads an away fixture', () => {
    const parsed = parseSummary(
      "[L] University of Rhode Island Women's Soccer at Providence",
      FEED.teamPrefix
    );

    expect(parsed.listedAsHome).toBe(false);
    expect(parsed.result).toBe('L');
  });

  it('leaves the result null on a fixture that has not been played', () => {
    const parsed = parseSummary(
      "University of Rhode Island Men's Basketball vs Quinnipiac",
      FEED.teamPrefix
    );

    expect(parsed.result).toBeNull();
  });
});

describe('isHomeGame', () => {
  it('does not call a neutral-site game a home game', () => {
    // The live feed carries a dozen of these. Telling a student to come watch a
    // "home" game in Connecticut is the failure this guard exists to prevent.
    const parsed = parseSummary(
      "University of Rhode Island Men's Basketball vs Quinnipiac",
      FEED.teamPrefix
    );

    expect(parsed.listedAsHome).toBe(true);
    expect(isHomeGame(parsed, 'New Haven, CT', FEED)).toBe(false);
  });

  it('accepts a fixture that is both listed as vs and played at our venue', () => {
    const parsed = parseSummary(
      "University of Rhode Island Women's Soccer vs Maine",
      FEED.teamPrefix
    );

    expect(isHomeGame(parsed, 'Kingston, R.I., URI Soccer Complex', FEED)).toBe(true);
  });
});

describe('toActivities', () => {
  const rows = toActivities(SAMPLE, FEED);

  it('marks exactly the real home fixtures as on campus', () => {
    const home = rows.filter((row) => row.athletics?.home);

    expect(home).toHaveLength(2);
    expect(home.every((row) => row.scope === 'on_campus')).toBe(true);
    expect(rows.filter((row) => !row.athletics?.home).every((row) => row.scope === 'off_campus')).toBe(
      true
    );
  });

  it('tags home fixtures for recommendation but leaves away games untagged', () => {
    const home = rows.find((row) => row.athletics?.home);
    const away = rows.find((row) => !row.athletics?.home);

    expect(home?.working_words).toEqual(['PERFORMER', 'CONNECTOR']);
    expect(away?.working_words).toEqual([]);
  });

  it('builds a stable, source-prefixed id', () => {
    expect(rows[0].id).toBe('athletics:uri:vcal_11981');
  });
});
