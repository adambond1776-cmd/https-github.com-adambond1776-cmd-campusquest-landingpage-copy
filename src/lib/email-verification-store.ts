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

const TABLE = 'cq_email_verification_challenges';
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
      const { data, error } = await client.rpc('consume_cq_email_challenge', {
        p_id: args.id,
        p_user_id: args.userId,
        p_code_hash: args.codeHash,
        p_now: args.at,
      });
      if (!error) return data === true;

      const { data: row, error: fallbackError } = await client
        .from(TABLE)
        .update({ consumed_at: args.at })
        .eq('id', args.id)
        .eq('user_id', args.userId)
        .eq('code_hash', args.codeHash)
        .is('consumed_at', null)
        .is('invalidated_at', null)
        .select('id')
        .maybeSingle();
      if (fallbackError) throw new Error(`Could not consume verification challenge: ${fallbackError.message}`);
      return Boolean(row?.id);
    },

    async incrementAttempts(id: string): Promise<number> {
      const { data, error } = await client.rpc('increment_cq_email_challenge_attempts', { p_id: id });
      if (!error && typeof data === 'number') return data;

      const { data: current, error: readError } = await client
        .from(TABLE)
        .select('attempts')
        .eq('id', id)
        .single();
      if (readError || !current) throw new Error(`Could not read verification attempts: ${readError?.message}`);
      const next = Number(current.attempts ?? 0) + 1;
      const { error: writeError } = await client
        .from(TABLE)
        .update({ attempts: next })
        .eq('id', id)
        .is('consumed_at', null)
        .is('invalidated_at', null);
      if (writeError) throw new Error(`Could not update verification attempts: ${writeError.message}`);
      return next;
    },
  };
}
