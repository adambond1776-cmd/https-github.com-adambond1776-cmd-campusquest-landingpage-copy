import type { SupabaseClient } from '@supabase/supabase-js';

export type EmailChallengeRow = {
  id: string;
  user_id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  created_at: string;
  dispatched_at: string | null;
  consumed_at: string | null;
  invalidated_at: string | null;
};

const TABLE = 'campus_email_verification_challenges';
const SELECT =
  'id, user_id, email, code_hash, expires_at, attempts, created_at, dispatched_at, consumed_at, invalidated_at';

export function createEmailChallengeStore(client: SupabaseClient) {
  return {
    async list(userId: string): Promise<EmailChallengeRow[]> {
      const { data, error } = await client
        .from(TABLE)
        .select(SELECT)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) throw new Error(`Could not read verification challenges: ${error.message}`);
      return (data ?? []) as EmailChallengeRow[];
    },

    async insert(row: Omit<EmailChallengeRow, 'id'>): Promise<EmailChallengeRow> {
      const { data, error } = await client
        .from(TABLE)
        .insert({
          user_id: row.user_id,
          email: row.email,
          code_hash: row.code_hash,
          expires_at: row.expires_at,
          attempts: row.attempts,
          created_at: row.created_at,
          dispatched_at: row.dispatched_at,
          consumed_at: row.consumed_at,
          invalidated_at: row.invalidated_at,
        })
        .select(SELECT)
        .single();
      if (error || !data) throw new Error(`Could not save verification challenge: ${error?.message}`);
      return data as EmailChallengeRow;
    },

    async invalidateOpen(userId: string, at: string): Promise<void> {
      const { error } = await client
        .from(TABLE)
        .update({ invalidated_at: at })
        .eq('user_id', userId)
        .is('consumed_at', null)
        .is('invalidated_at', null);
      if (error) throw new Error(`Could not invalidate verification challenges: ${error.message}`);
    },

    async markDispatched(id: string, at: string): Promise<void> {
      const { error } = await client.from(TABLE).update({ dispatched_at: at }).eq('id', id);
      if (error) throw new Error(`Could not mark verification email dispatched: ${error.message}`);
    },

    async consumeIfHashMatches(args: {
      id: string;
      userId: string;
      codeHash: string;
      at: string;
    }): Promise<boolean> {
      const { data, error } = await client.rpc('consume_campus_email_challenge_and_verify', {
        p_id: args.id,
        p_user_id: args.userId,
        p_code_hash: args.codeHash,
        p_now: args.at,
      });
      if (error) throw new Error(`Could not consume verification challenge: ${error.message}`);
      return data === true;
    },

    async deleteForAccount(userId: string, email: string): Promise<void> {
      const byUser = await client.from(TABLE).delete().eq('user_id', userId);
      if (byUser.error) {
        throw new Error(`Could not delete verification challenges: ${byUser.error.message}`);
      }
      const byEmail = await client.from(TABLE).delete().eq('email', email);
      if (byEmail.error) {
        throw new Error(`Could not delete verification challenges: ${byEmail.error.message}`);
      }
    },

    async incrementAttempts(id: string): Promise<number> {
      const { data, error } = await client.rpc('increment_campus_email_challenge_attempts', { p_id: id });
      if (error || typeof data !== 'number') {
        throw new Error(`Could not update verification attempts: ${error?.message ?? 'unexpected result'}`);
      }
      return data;
    },
  };
}
