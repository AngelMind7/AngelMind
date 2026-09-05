import { readFileSync } from "node:fs";

const rules = readFileSync("config/monitoring/angelmind-alerts.yml", "utf8");
const alertmanager = readFileSync("config/monitoring/alertmanager.yml", "utf8");
const requiredAlerts = [
  "AngelMindReadinessDown",
  "AngelMindRuntimeNotReady",
  "AngelMindDatabaseNotReady",
  "AngelMindErrorBudgetExceeded",
  "AngelMindSlowRequestBudgetExceeded",
  "AngelMindPurgeFailures",
  "AngelMindPurgeDurationHigh",
];
const requiredMetrics = [
  "angelmind_provider_probe_ready",
  "angelmind_runtime_ready",
  "angelmind_database_configured",
  "angelmind_slo_error_budget_ok",
  "angelmind_slo_slow_budget_ok",
  "angelmind_http_error_rate",
  "angelmind_http_slow_rate",
  "angelmind_purge_failures_total",
  "angelmind_purge_duration_alert",
];
const missingAlerts = requiredAlerts.filter(
  name => !rules.includes(`alert: ${name}`)
);
const missingMetrics = requiredMetrics.filter(name => !rules.includes(name));
if (missingAlerts.length)
  throw new Error(`Missing monitoring alerts: ${missingAlerts.join(", ")}`);
if (missingMetrics.length)
  throw new Error(
    `Alert rules reference missing metrics: ${missingMetrics.join(", ")}`
  );
for (const token of [
  "ALERTMANAGER_WEBHOOK_URL",
  "ALERTMANAGER_CRITICAL_WEBHOOK_URL",
  "send_resolved: true",
  "inhibit_rules:",
]) {
  if (!alertmanager.includes(token))
    throw new Error(`Alertmanager contract missing: ${token}`);
}
if (
  /https?:\/\//.test(
    alertmanager.replace(
      /https?:\/\/token\.actions\.githubusercontent\.com/g,
      ""
    )
  )
)
  throw new Error(
    "Alertmanager config must not contain hard-coded webhook URLs."
  );
console.log(
  `Monitoring contract OK: ${requiredAlerts.length} alerts and ${requiredMetrics.length} metric references are covered.`
);
