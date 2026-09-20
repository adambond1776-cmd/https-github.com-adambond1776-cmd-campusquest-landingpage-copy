import { describe, expect, it } from 'vitest';
import {
  ACTIVITIES_USER_MESSAGES,
  classifyActivitiesReadError,
  directoryReadBlocker,
  inspectSupabaseAnonCredentials,
  publicActivitiesError,
  supabaseProjectRefFromUrl,
} from '@/lib/supabase/credentials';

function jwtFor(payload: Record<string, unknown>): string {
  const json = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${json}.sig`;
}

describe('supabase credential inspection', () => {
  it('reads the project ref from a hosted URL', () => {
    expect(supabaseProjectRefFromUrl('https://yggfswrzhkbhamrkjuse.supabase.co')).toBe(
      'yggfswrzhkbhamrkjuse'
    );
  });

  it('detects a missing anon key without returning the secret', () => {
    const inspection = inspectSupabaseAnonCredentials('https://abc.supabase.co', undefined);
    expect(inspection).toEqual({
      urlPresent: true,
      anonKeyPresent: false,
      urlProjectRef: 'abc',
      anonKeyProjectRef: null,
      anonKeyRole: 'unknown',
      sameProject: null,
    });
    expect(JSON.stringify(inspection)).not.toMatch(/eyJ|service_role|apikey/i);
  });

  it('detects when the URL and anon key belong to different projects', () => {
    const inspection = inspectSupabaseAnonCredentials(
      'https://projecta.supabase.co',
      jwtFor({ ref: 'projectb', role: 'anon' })
    );
    expect(inspection.sameProject).toBe(false);
    expect(inspection.anonKeyRole).toBe('anon');
    expect(directoryReadBlocker(inspection)).toBe('project_mismatch');
  });

  it('accepts a matching URL and anon JWT', () => {
    const inspection = inspectSupabaseAnonCredentials(
      'https://projecta.supabase.co',
      jwtFor({ ref: 'projecta', role: 'anon' })
    );
    expect(inspection.sameProject).toBe(true);
    expect(directoryReadBlocker(inspection)).toBeNull();
  });

  it('classifies Invalid API key as invalid credentials, not a database bug', () => {
    expect(classifyActivitiesReadError(new Error('Reading activities failed: Invalid API key'))).toBe(
      'invalid_credentials'
    );
    expect(publicActivitiesError(new Error('Invalid API key'))).toBe(
      ACTIVITIES_USER_MESSAGES.invalid_credentials
    );
    expect(publicActivitiesError(new Error('Invalid API key'))).not.toMatch(/Invalid API key/i);
  });

  it('classifies a PostgREST error object, not only Error instances', () => {
    expect(classifyActivitiesReadError({ message: 'Invalid API key' })).toBe('invalid_credentials');
  });

  it('classifies query failures separately', () => {
    expect(
      classifyActivitiesReadError(new Error('Could not find the table public.cq_activities'))
    ).toBe('database');
  });
});
