import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const email = 'demo@campusquestapp.com';
const password = process.env.DEMO_ACCOUNT_PASSWORD;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!password || !url || !serviceKey || !anonKey) {
  console.log(JSON.stringify({ ok: false, reason: 'missing-config' }));
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const interests = [
  'Music & concerts',
  'Science, technology & making',
  'Playing sports',
  'Volunteering & service',
  'Outdoors & nature',
];
const interestPreferences = {
  version: 1,
  selections: [
    { id: 'music', priority: 3, details: ['Live music'] },
    { id: 'technology', priority: 2, details: ['Coding'] },
    { id: 'play-sports', priority: 2, details: ['Team sports'] },
    { id: 'service', priority: 2, details: [] },
    { id: 'outdoors', priority: 1, details: ['Hiking'] },
  ],
};

function username(userId) {
  return (`n${userId.replace(/[^a-z0-9]/gi, '').toLowerCase()}`).slice(0, 24);
}

const lookup = await admin.rpc('cq_auth_user_id_by_email', { p_email: email });
if (lookup.error) {
  console.log(JSON.stringify({ ok: false, stage: 'lookup' }));
  process.exit(1);
}

let userId = lookup.data || null;
let created = false;
if (!userId) {
  const made = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { cq_demo_account: true },
    user_metadata: { interests, interest_preferences: interestPreferences },
  });
  if (made.error || !made.data.user?.id) {
    console.log(JSON.stringify({ ok: false, stage: 'create' }));
    process.exit(1);
  }
  userId = made.data.user.id;
  created = true;
} else {
  const updated = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    app_metadata: { cq_demo_account: true },
    user_metadata: { interests, interest_preferences: interestPreferences },
  });
  if (updated.error) {
    console.log(JSON.stringify({ ok: false, stage: 'update-auth' }));
    process.exit(1);
  }
}

const existingProfile = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
if (existingProfile.error) {
  console.log(JSON.stringify({ ok: false, stage: 'profile-read' }));
  process.exit(1);
}
if (!existingProfile.data?.id) {
  const inserted = await admin.from('profiles').insert({
    id: userId,
    username: username(userId),
    display_name: 'CampusQuest demo',
  });
  if (inserted.error) {
    console.log(JSON.stringify({ ok: false, stage: 'profile-insert' }));
    process.exit(1);
  }
}

const profile = await admin.from('profiles').update({
  campus_email_verified_at: new Date().toISOString(),
  is_test_user: true,
  is_hidden: true,
  is_internal_tester: true,
  role: 'student',
  display_name: 'CampusQuest demo',
}).eq('id', userId).select('id, role, is_test_user, is_hidden, is_internal_tester, campus_email_verified_at').maybeSingle();
if (profile.error || profile.data?.role === 'admin' || profile.data?.role === 'super_admin') {
  console.log(JSON.stringify({ ok: false, stage: 'profile-update' }));
  process.exit(1);
}

const hash = createHash('sha256').update(email).digest('hex');
const age = await admin.from('cq_age_records').upsert({
  email_hash: hash,
  email: null,
  birth_year: 2000,
  bracket: 'adult',
  attested_at: new Date().toISOString(),
  guardian: null,
  updated_at: new Date().toISOString(),
}, { onConflict: 'email_hash' });
if (age.error) {
  console.log(JSON.stringify({ ok: false, stage: 'age' }));
  process.exit(1);
}

const preferences = await admin.from('user_onboarding_preferences').upsert({
  user_id: userId,
  school_name: 'University of Rhode Island',
  interests,
  discovery_focus: ['events', 'clubs'],
}, { onConflict: 'user_id' });
if (preferences.error) {
  console.log(JSON.stringify({ ok: false, stage: 'preferences' }));
  process.exit(1);
}

const starts = new Date();
const ends = new Date(starts.getTime() + 60 * 24 * 60 * 60 * 1000);
const access = await admin.from('cq_basic_access').upsert({
  user_id: userId,
  starts_at: starts.toISOString(),
  ends_at: ends.toISOString(),
  early_access: true,
}, { onConflict: 'user_id' });
if (access.error) {
  console.log(JSON.stringify({ ok: false, stage: 'access' }));
  process.exit(1);
}

const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const signed = await anon.auth.signInWithPassword({ email, password });
const sessionOk = !signed.error && Boolean(signed.data.session);
if (signed.data.session) await anon.auth.signOut();

console.log(JSON.stringify({
  ok: true,
  created,
  emailConfirmed: true,
  role: profile.data?.role ?? null,
  testMarker: profile.data?.is_test_user === true,
  hidden: profile.data?.is_hidden === true,
  internalTester: profile.data?.is_internal_tester === true,
  verified: Boolean(profile.data?.campus_email_verified_at),
  passwordWorks: sessionOk,
  adminRole: profile.data?.role === 'admin' || profile.data?.role === 'super_admin',
}));
