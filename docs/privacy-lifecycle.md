# Privacy lifecycle

AngelMind now processes account export and delete requests through the durable worker queue. `auth.requestPrivacyAction` creates an idempotent `privacy.process` job for export and delete requests; the worker moves the request to processing and executes the corresponding processor.

## Export

An export is serialized as a versioned JSON artifact and stored in the configured private Supabase Storage bucket under `privacy-exports/{userId}/{requestId}.json`. The artifact includes the user record and account-scoped records for profiles, devices, security events, onboarding, API keys, organization/workspace memberships, saved views, notifications, notification preferences, and privacy requests. The request stores the private storage key as its result reference.

## Delete

Deletion removes account-scoped records from notification preferences, notifications, saved views, workspace memberships, organization memberships, API keys, devices, account security events, onboarding profile, and user profile before deleting the user row. Immutable audit records and organization/workspace research records are not deleted by this account action.

Deletion is blocked when the user still owns an organization or workspace. Ownership must be transferred or the resource must be archived through an explicit product workflow before account deletion. This avoids orphaning collaborative data and protects other members.

The processor is safe to retry: completed or rejected requests are no-ops, and request enqueue uses `privacy:{requestId}` as its idempotency key. Production validation still requires running the migration state and worker against a staging database, verifying private bucket policy, and performing a controlled restore/download drill.
