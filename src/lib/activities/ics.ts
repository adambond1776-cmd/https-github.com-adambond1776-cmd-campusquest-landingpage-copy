/**
 * A small iCalendar reader.
 *
 * Deliberately not a dependency. We consume a handful of known publisher feeds
 * and need six properties out of each event; a full RFC 5545 implementation
 * would bring recurrence-rule expansion and timezone databases we do not use.
 * What this does handle is the part that actually breaks naive parsers: line
 * folding, property parameters, and character escaping.
 */

export type IcsEvent = {
  uid: string;
  summary: string;
  description: string;
  location: string;
  url: string;
  /** ISO 8601 UTC, or null when the property was absent or unparseable. */
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
};

/**
 * Undo RFC 5545 line folding.
 *
 * A long property is split across lines with the continuation indented by a
 * single space or tab. Miss this and every long description silently truncates
 * at 75 characters.
 */
function unfold(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '');
}

/** Reverse the text escaping from RFC 5545 section 3.3.11. */
function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

/** Publisher feeds routinely leak HTML entities into URL properties. */
function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Parse an iCalendar date-time into an ISO instant.
 *
 * Three forms appear in practice: a UTC instant with a trailing Z, a bare local
 * time, and a date-only value for all-day events. A bare local time is read as
 * UTC, which is wrong by up to a day but is the only option without a timezone
 * database; every feed we currently read publishes UTC.
 */
export function parseIcsDate(value: string): { iso: string | null; allDay: boolean } {
  const trimmed = value.trim();

  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return { iso: `${y}-${m}-${d}T00:00:00.000Z`, allDay: true };
  }

  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(trimmed);
  if (dateTime) {
    const [, y, m, d, hh, mm, ss] = dateTime;
    const parsed = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}Z`);
    return {
      iso: Number.isNaN(parsed.getTime()) ? null : parsed.toISOString(),
      allDay: false,
    };
  }

  return { iso: null, allDay: false };
}

export function parseIcs(raw: string): IcsEvent[] {
  const body = unfold(raw);
  const blocks = body.split('BEGIN:VEVENT').slice(1);
  const events: IcsEvent[] = [];

  for (const block of blocks) {
    const block_ = block.split('END:VEVENT')[0] ?? '';
    const props = new Map<string, string>();

    for (const line of block_.split('\n')) {
      const separator = line.indexOf(':');
      if (separator === -1) continue;

      // Everything before the first colon is the name plus any parameters,
      // e.g. `DTSTART;TZID=America/New_York`.
      const name = line.slice(0, separator).split(';')[0].trim().toUpperCase();
      if (!name) continue;
      props.set(name, line.slice(separator + 1));
    }

    const uid = unescapeText(props.get('UID') ?? '');
    if (!uid) continue;

    const start = parseIcsDate(props.get('DTSTART') ?? '');
    const end = parseIcsDate(props.get('DTEND') ?? '');

    events.push({
      uid,
      summary: unescapeText(props.get('SUMMARY') ?? ''),
      description: unescapeText(props.get('DESCRIPTION') ?? ''),
      location: unescapeText(props.get('LOCATION') ?? ''),
      url: decodeEntities(unescapeText(props.get('URL') ?? '')),
      startsAt: start.iso,
      endsAt: end.iso,
      allDay: start.allDay,
    });
  }

  return events;
}
