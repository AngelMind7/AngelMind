"use strict";

// Deployment-safe Firebase contract. Production triggers are enabled only after
// provider credentials and destinations are explicitly configured.
exports.health = () => ({ ok: true, service: "angelmind-firebase" });
