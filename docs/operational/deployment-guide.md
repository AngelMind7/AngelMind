# Deployment Guide

## Order
1. Validate GitHub CI and blueprint contract.
2. Configure Supabase staging and migrations.
3. Configure Railway API, Python and isolated runtime services.
4. Configure Cloudflare Pages/Workers/R2/KV/D1/Turnstile.
5. Configure optional Firebase operations and FCM.
6. Run staging verification and production smoke tests.

Provider identifiers, tokens and secrets belong in provider/CI secret stores only.
