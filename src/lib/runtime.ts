/**
 * Shared production detection.
 *
 * Safe to import from client components: it only reads NODE_ENV, which Next
 * inlines at build time. Do not put secrets in this file.
 */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

export const AUTH_UNCONFIGURED_MESSAGE =
  'CampusQuest sign-in is temporarily unavailable. Please try again later.';

/**
 * Historical copy from a mislabeled Postgres/service-role check. Signup must
 * not use this: account creation does not require a Supabase Storage bucket.
 */
export const STORAGE_UNCONFIGURED_MESSAGE =
  'CampusQuest is temporarily unavailable because storage is not configured.';
