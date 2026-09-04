# Disaster Recovery

Back up the primary database on the schedule supported by the selected Supabase plan. Preserve point-in-time recovery where available. Evidence objects and reports stored in R2 require independent retention and integrity verification.

A recovery drill must restore into a non-production environment, validate migrations, verify audit-chain integrity, and execute critical-path smoke tests before production recovery is declared successful.
