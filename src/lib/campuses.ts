/**
 * Campuses a student can name when asking their school to cover Genius Mining.
 *
 * Rhode Island only, because Level Up Rhode Island is a Rhode Island program and
 * a dropdown of every college in the country would collect demand we cannot act
 * on. `other` catches everyone else and keeps a free-text school name.
 */

export type Campus = {
  id: string;
  name: string;
  /** Short name for tight spaces and chart labels. */
  short: string;
  /** Directory feeds are live for this campus. */
  directoryLive?: boolean;
};

export const CAMPUSES: Campus[] = [
  { id: 'uri', name: 'University of Rhode Island', short: 'URI', directoryLive: true },
  { id: 'jwu', name: 'Johnson & Wales University', short: 'JWU' },
  { id: 'salve', name: 'Salve Regina University', short: 'Salve Regina' },
  { id: 'ric', name: 'Rhode Island College', short: 'RIC' },
  { id: 'ccri', name: 'Community College of Rhode Island', short: 'CCRI' },
  { id: 'neit', name: 'New England Institute of Technology', short: 'NEIT' },
  { id: 'bryant', name: 'Bryant University', short: 'Bryant' },
  { id: 'providence', name: 'Providence College', short: 'Providence' },
  { id: 'rwu', name: 'Roger Williams University', short: 'Roger Williams' },
  { id: 'risd', name: 'Rhode Island School of Design', short: 'RISD' },
  { id: 'brown', name: 'Brown University', short: 'Brown' },
  { id: 'other', name: 'My school is not listed', short: 'Other' },
];

export function campusById(id: string): Campus | undefined {
  return CAMPUSES.find((campus) => campus.id === id);
}

export function campusName(id: string): string {
  return campusById(id)?.name ?? id;
}

export function campusDirectoryLive(id: string): boolean {
  return campusById(id)?.directoryLive === true;
}

/**
 * How many students have to ask before we take a campus to its administration.
 *
 * Public on the page on purpose. A student who can see the number and the target
 * has a reason to come back and a reason to tell a friend, and the number is the
 * only thing that makes the ask credible in a meeting.
 */
export const DEMAND_THRESHOLD = 100;
