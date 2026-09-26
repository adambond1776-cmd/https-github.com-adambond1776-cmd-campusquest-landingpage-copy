# Archived copy-repo migrations

These nine SQL files came from the CampusQuest landing/copy repository. They are not the production migration lineage of the linked Supabase project `yggfswrzhkbhamrkjuse`.

They were moved here so `supabase/migrations/` can hold the fetched production history. The file contents are unchanged from the copy repository.

Do not pass this directory to `supabase db push`. Do not move these files back into `supabase/migrations/`. Do not execute them against the production database.

- `0001_genius_mining.sql`, `0002_entitlement.sql`, and `0003_campus_demand.sql` belong to this copy repository's local history, not the remote timestamped history.
- `0004_activities.sql`, `0005_reports_and_age.sql`, and `0006_email_verification.sql` overlap objects that already exist in production under a different migration history. Replaying them is not safe.
- `0007_test_billing.sql` and `0008_clubs_test.sql` are test-only. They were never applied to production.
- `0009_account_profiles.sql` creates `cq_accounts`. That design was abandoned and must not be applied. Production URI verification remains `public.profiles.campus_email_verified_at`.

The fetched files in `supabase/migrations/` match future migration version history. They are not yet a complete reproducible-from-empty representation of every live production object. Some live objects, including `cq_*` and `gm_*` tables, were created outside the recorded history. Do not use `db pull` or migration repair to reconcile that drift.
