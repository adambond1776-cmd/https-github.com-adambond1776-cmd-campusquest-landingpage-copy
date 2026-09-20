import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
let db: PGlite;
const owner = '00000000-0000-4000-8000-000000000001';
const student = '00000000-0000-4000-8000-000000000002';
const reviewer = '00000000-0000-4000-8000-000000000003';
const content = { name: 'Chess Club', description: 'Play chess', meeting: 'Union Thursday', website: '', logo: '', categories: ['Gaming, anime & tabletop'] };
const event = { title: 'Chess night', description: 'Try chess', location: 'Union', starts_at: '2026-10-01T22:00:00Z', ends_at: '2026-10-02T00:00:00Z', timezone: 'America/New_York', website: '' };
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    grant usage on schema public to anon,authenticated,service_role;`);
  for (const migration of ['0004_activities.sql','0007_test_billing.sql','0008_clubs_test.sql']) {
    await db.exec(await readFile(`supabase/migrations/${migration}`, 'utf8'));
  }
  await db.exec('grant select on cq_activities to anon,authenticated;');
}, 30000);
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec('reset role; truncate auth.users cascade;');
  await db.query('insert into auth.users(id) values($1),($2),($3)', [owner,student,reviewer]);
});
async function club() {
  return (await db.query<{id:string}>('insert into cq_clubs(owner_id,slug,campus_id,contact_email,content) values($1,$2,$3,$4,$5) returning id', [owner,'uri-chess','uri','owner@example.invalid',JSON.stringify(content)])).rows[0].id;
}
describe('actual PostgreSQL migration and policies (local PGlite only)', () => {
  it('projects pending pages as hidden; review makes an existing-directory organization', async () => {
    const id = await club();
    expect((await db.query<{status:string}>('select status from cq_activities')).rows[0].status).toBe('hidden');
    await db.query("update cq_clubs set owner_approved=true,status='approved',reviewed_by=$2 where id=$1",[id,reviewer]);
    const row = (await db.query<{status:string;source:string;url:string}>('select status,source,url from cq_activities')).rows[0];
    expect(row).toEqual({ status:'verified', source:'club', url:'/clubs/uri-chess' });
  });
  it('publishes reviewed events atomically and cancellation removes them from public reads', async () => {
    const id = await club();
    await db.query("update cq_clubs set owner_approved=true,status='approved',reviewed_by=$2 where id=$1",[id,reviewer]);
    const e = (await db.query<{id:string}>('insert into cq_club_events(club_id,content) values($1,$2) returning id',[id,JSON.stringify(event)])).rows[0].id;
    await db.exec('set role anon');
    expect((await db.query('select * from cq_activities')).rows).toHaveLength(1);
    await db.exec('reset role');
    await db.query("update cq_club_events set status='approved',reviewed_by=$2 where id=$1",[e,reviewer]);
    await db.exec('set role anon'); expect((await db.query('select * from cq_activities')).rows).toHaveLength(2); await db.exec('reset role');
    await db.query("update cq_club_events set status='canceled' where id=$1",[e]);
    await db.exec('set role anon'); expect((await db.query('select * from cq_activities')).rows).toHaveLength(1); await db.exec('reset role');
  });
  it('a page edit hides its approved events until the page is reviewed again', async () => {
    const id = await club();
    await db.query("update cq_clubs set owner_approved=true,status='approved' where id=$1",[id]);
    await db.query("insert into cq_club_events(club_id,content,status) values($1,$2,'approved')",[id,JSON.stringify(event)]);
    await db.query("update cq_clubs set status='pending' where id=$1",[id]);
    await db.exec('set role anon'); expect((await db.query('select * from cq_activities')).rows).toHaveLength(0); await db.exec('reset role');
  });
  it.each(['anon','authenticated'])('denies %s private tables, writes and privileged functions', async role => {
    await club(); await db.exec(`set role ${role}`);
    try {
      for (const table of ['cq_clubs','cq_club_events','cq_club_requests','cq_club_test_billing']) await expect(db.query(`select * from ${table}`)).rejects.toThrow('permission denied');
      await expect(db.query("select cq_lock_club_test_billing($1,$2)",[owner,reviewer])).rejects.toThrow('permission denied');
      await expect(db.query("select cq_request_club_join($1,$2,$3,$4,$5)",[owner,student,'A','a@example.invalid',''])).rejects.toThrow('permission denied');
      await expect(db.query("update cq_activities set status='verified'")).rejects.toThrow();
    } finally { await db.exec('reset role'); }
  });
  it('join RPC deduplicates and persists private consent before any notification', async () => {
    const id = await club();
    await db.query("update cq_clubs set owner_approved=true,status='approved' where id=$1",[id]);
    for(let i=0;i<2;i++) await db.query('select cq_request_club_join($1,$2,$3,$4,$5)',[id,student,'Student','student@example.invalid','Hello']);
    const rows = (await db.query<{notification_status:string;consent_version:string}>('select * from cq_club_requests')).rows;
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ notification_status:'preview', consent_version:'club-contact-v1' });
  });
  it('join RPC blocks hidden clubs', async () => {
    const id = await club();
    await expect(db.query('select cq_request_club_join($1,$2,$3,$4,$5)',[id,student,'Student','student@example.invalid','Hello'])).rejects.toThrow('not accepting');
  });
  it('enforces five new club inquiries per requester per day in SQL', async () => {
    for(let i=10;i<16;i++) {
      const ownerId = `00000000-0000-4000-8000-0000000000${i}`;
      await db.query('insert into auth.users(id) values($1)',[ownerId]);
      const c = (await db.query<{id:string}>("insert into cq_clubs(owner_id,slug,campus_id,contact_email,content,owner_approved,status) values($1,$2,'uri','owner@example.invalid',$3,true,'approved') returning id",[ownerId,`club-${i}`,JSON.stringify(content)])).rows[0].id;
      const call = db.query('select cq_request_club_join($1,$2,$3,$4,$5)',[c,student,'A','student@example.invalid','']);
      if(i<15) await call; else await expect(call).rejects.toThrow('Daily request limit');
    }
  });
  it('keeps student and club billing bindings and locks independent', async () => {
    expect((await db.query<{ok:boolean}>('select cq_lock_club_test_billing($1,$2) as ok',[owner,reviewer])).rows[0].ok).toBe(true);
    expect((await db.query<{ok:boolean}>('select cq_lock_club_test_billing($1,$2) as ok',[owner,student])).rows[0].ok).toBe(false);
    expect((await db.query<{ok:boolean}>('select cq_lock_test_billing($1,$2) as ok',[owner,student])).rows[0].ok).toBe(true);
  });
  it('account deletion cascades owned pages, events, private requests and projections', async () => {
    const id = await club();
    await db.query("update cq_clubs set owner_approved=true,status='approved' where id=$1",[id]);
    await db.query("insert into cq_club_events(club_id,content,status) values($1,$2,'approved')",[id,JSON.stringify(event)]);
    await db.query('select cq_request_club_join($1,$2,$3,$4,$5)',[id,student,'Student','student@example.invalid','Hello']);
    await db.query('delete from auth.users where id=$1',[owner]);
    for (const table of ['cq_clubs','cq_club_events','cq_club_requests','cq_activities']) expect((await db.query(`select * from ${table}`)).rows).toHaveLength(0);
  });
  it('deleting a requester removes their private contact details without deleting the club', async () => {
    const id = await club();
    await db.query("update cq_clubs set owner_approved=true,status='approved' where id=$1",[id]);
    await db.query('select cq_request_club_join($1,$2,$3,$4,$5)',[id,student,'Student','student@example.invalid','Hello']);
    await db.query('delete from auth.users where id=$1',[student]);
    expect((await db.query('select * from cq_club_requests')).rows).toHaveLength(0);
    expect((await db.query('select * from cq_clubs')).rows).toHaveLength(1);
  });
});
