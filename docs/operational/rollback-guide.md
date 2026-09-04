# Rollback Guide

Rollback application releases through the last known-good Git commit/deployment. Database changes must use the repository migration journal and rollback checks; never rewrite production history.

If a deployment health check fails, stop promotion, preserve audit/evidence records, and restore the previous application version before investigating data changes.
