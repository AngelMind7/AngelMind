const DURATION_BUCKETS_MS = [100, 250, 500, 1_000, 2_500, 5_000, 10_000, 30_000, 60_000] as const;
export const PURGE_DURATION_ALERT_MS = 30_000;

type PurgeMetricState = {
  batches: number;
  records: number;
  failures: number;
  lastDurationMs: number;
  lastBatchSize: number;
  lastCompletedAtMs: number;
  buckets: Record<string, number>;
};

const state: PurgeMetricState = {
  batches: 0,
  records: 0,
  failures: 0,
  lastDurationMs: 0,
  lastBatchSize: 0,
  lastCompletedAtMs: 0,
  buckets: Object.fromEntries(DURATION_BUCKETS_MS.map(bucket => [String(bucket), 0])),
};

export function recordPurgeBatch(durationMs: number, batchSize: number, success = true) {
  const safeDuration = Math.max(0, Math.round(durationMs));
  const safeBatchSize = Math.max(0, Math.floor(batchSize));
  state.batches += 1;
  state.records += safeBatchSize;
  state.failures += success ? 0 : 1;
  state.lastDurationMs = safeDuration;
  state.lastBatchSize = safeBatchSize;
  state.lastCompletedAtMs = Date.now();
  for (const bucket of DURATION_BUCKETS_MS) if (safeDuration <= bucket) state.buckets[String(bucket)] += 1;
  return getPurgeMetrics();
}

export function getPurgeMetrics() {
  return {
    ...state,
    buckets: { ...state.buckets },
    alert: state.lastDurationMs > PURGE_DURATION_ALERT_MS,
  };
}

export function resetPurgeMetrics() {
  state.batches = 0;
  state.records = 0;
  state.failures = 0;
  state.lastDurationMs = 0;
  state.lastBatchSize = 0;
  state.lastCompletedAtMs = 0;
  for (const bucket of DURATION_BUCKETS_MS) state.buckets[String(bucket)] = 0;
}

export function renderPurgeMetrics() {
  const metrics = getPurgeMetrics();
  const lines = [
    "# HELP angelmind_purge_batches_total Number of AI memory purge batches completed.",
    "# TYPE angelmind_purge_batches_total counter",
    `angelmind_purge_batches_total ${metrics.batches}`,
    "# HELP angelmind_purge_records_total Number of AI memory records selected for purge.",
    "# TYPE angelmind_purge_records_total counter",
    `angelmind_purge_records_total ${metrics.records}`,
    "# HELP angelmind_purge_failures_total Number of failed AI memory purge batches.",
    "# TYPE angelmind_purge_failures_total counter",
    `angelmind_purge_failures_total ${metrics.failures}`,
    "# HELP angelmind_purge_batch_duration_ms Last AI memory purge batch duration in milliseconds.",
    "# TYPE angelmind_purge_batch_duration_ms gauge",
    `angelmind_purge_batch_duration_ms ${metrics.lastDurationMs}`,
    "# HELP angelmind_purge_batch_size Last AI memory purge batch size.",
    "# TYPE angelmind_purge_batch_size gauge",
    `angelmind_purge_batch_size ${metrics.lastBatchSize}`,
    "# HELP angelmind_purge_duration_alert Whether the last purge batch exceeded the duration alert threshold.",
    "# TYPE angelmind_purge_duration_alert gauge",
    `angelmind_purge_duration_alert ${metrics.alert ? 1 : 0}`,
    "# HELP angelmind_purge_batch_duration_ms_bucket AI memory purge batch duration histogram.",
    "# TYPE angelmind_purge_batch_duration_ms_bucket histogram",
    ...DURATION_BUCKETS_MS.map(bucket => `angelmind_purge_batch_duration_ms_bucket{le="${bucket}"} ${metrics.buckets[String(bucket)]}`),
    `angelmind_purge_batch_duration_ms_bucket{le="+Inf"} ${metrics.batches}`,
  ];
  return lines.join("\n");
}
