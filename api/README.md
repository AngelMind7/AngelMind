# API Boundary

API ownership remains inside the current Express/tRPC application under `server/`. This directory documents the future extraction boundary from the master blueprint without introducing a second runtime prematurely.

Any future API split must preserve authenticated workspace scope, role checks, deterministic policy checks, versioned contracts, redaction, and audit events before feature logic executes. Target-facing endpoints, credential replay, autonomous submission, and outbound delivery are not part of this boundary.
