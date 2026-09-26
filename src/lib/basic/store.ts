import {
  activityFromCanonicalEvent,
  activityFromCanonicalOrganization,
  CANONICAL_EVENT_COLUMNS,
  CANONICAL_EVENT_TABLE,
  CANONICAL_ORGANIZATION_COLUMNS,
  CANONICAL_ORGANIZATION_TABLE,
} from '@/lib/activities/canonical';
import { isPublic, type Activity } from '@/lib/activities/types';
import { createClient } from '@/lib/supabase/server';
import {
  basicEntitlement,
  unknownBasicEntitlement,
  type BasicAccessRow,
  type BasicEntitlement,
} from '@/lib/basic/entitlement';
import {
  isSavedKind,
  parseSavedReminder,
  savedKindForActivity,
  type SavedItemRow,
  type SavedKind,
} from '@/lib/basic/saved';

const ACCESS_TABLE = 'cq_basic_access';
const SAVED_TABLE = 'cq_saved_items';

export type ResolvedSavedItem = SavedItemRow & {
  activity: Activity | null;
};

export async function loadOwnBasicEntitlement(now = new Date()): Promise<BasicEntitlement> {
  const supabase = await createClient();
  if (!supabase) return unknownBasicEntitlement();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) return unknownBasicEntitlement();

  const row = await supabase
    .from(ACCESS_TABLE)
    .select('starts_at, ends_at, early_access')
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (row.error) return unknownBasicEntitlement();
  return basicEntitlement((row.data as BasicAccessRow | null) ?? null, now);
}

export async function loadOwnSavedItems(): Promise<SavedItemRow[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user?.id) return [];

  const { data, error } = await supabase
    .from(SAVED_TABLE)
    .select('kind, target_id, reminder, created_at')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });
  if (error) return null;

  const items: SavedItemRow[] = [];
  for (const row of data ?? []) {
    if (!isSavedKind(row.kind) || typeof row.target_id !== 'string') continue;
    const reminder = parseSavedReminder(row.reminder) ?? 'off';
    items.push({
      kind: row.kind,
      target_id: row.target_id,
      reminder: row.kind === 'event' ? reminder : 'off',
      created_at: typeof row.created_at === 'string' ? row.created_at : new Date(0).toISOString(),
    });
  }
  return items;
}

export async function resolveSavedItems(items: SavedItemRow[]): Promise<ResolvedSavedItem[]> {
  const supabase = await createClient();
  const activities = new Map<string, Activity>();
  if (supabase) {
    const eventIds = items.filter((item) => item.kind === 'event').map((item) => item.target_id);
    const organizationIds = items.filter((item) => item.kind !== 'event').map((item) => item.target_id);
    const [events, organizations] = await Promise.all([
      eventIds.length === 0
        ? Promise.resolve({ data: [] as Record<string, unknown>[] })
        : supabase.from(CANONICAL_EVENT_TABLE).select(CANONICAL_EVENT_COLUMNS).in('id', eventIds),
      organizationIds.length === 0
        ? Promise.resolve({ data: [] as Record<string, unknown>[] })
        : supabase
            .from(CANONICAL_ORGANIZATION_TABLE)
            .select(CANONICAL_ORGANIZATION_COLUMNS)
            .in('id', organizationIds),
    ]);

    for (const row of events.data ?? []) {
      const activity = activityFromCanonicalEvent(row as Parameters<typeof activityFromCanonicalEvent>[0]);
      if (activity && isPublic(activity)) activities.set(matchKey('event', activity.id), activity);
    }
    for (const row of organizations.data ?? []) {
      const activity = activityFromCanonicalOrganization(
        row as Parameters<typeof activityFromCanonicalOrganization>[0]
      );
      if (!activity || !isPublic(activity)) continue;
      const kind = savedKindForActivity(activity);
      if (kind && kind !== 'event') activities.set(matchKey(kind, activity.id), activity);
    }
  }

  return items.map((item) => ({
    ...item,
    activity: activities.get(matchKey(item.kind, item.target_id)) ?? null,
  }));
}

function matchKey(kind: SavedKind, targetId: string): string {
  return `${kind}:${targetId}`;
}
