const FIELD_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 7],
];

type CronField = readonly [number, number];

function expandField(value: string, [minimum, maximum]: CronField): Set<number> | null {
  const result = new Set<number>();
  for (const part of value.split(",")) {
    const token = part.trim();
    if (!token) return null;
    const [base, stepText] = token.split("/");
    if (token.split("/").length > 2) return null;
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) return null;

    let start = minimum;
    let end = maximum;
    if (base !== "*") {
      const range = base.split("-");
      if (range.length > 2) return null;
      start = Number(range[0]);
      end = range.length === 2 ? Number(range[1]) : start;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) return null;
    }
    if (start < minimum || end > maximum) return null;
    for (let current = start; current <= end; current += step) result.add(current);
  }
  return result;
}

function parseCronExpression(expression: string): Set<number>[] | null {
  if (typeof expression !== "string" || !expression.trim()) return null;
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return null;
  const parsed = fields.map((field, index) => expandField(field, FIELD_RANGES[index]));
  return parsed.every((field): field is Set<number> => field !== null) ? parsed : null;
}

export function isValidUtcCronExpression(expression: string): boolean {
  return parseCronExpression(expression) !== null;
}

/**
 * Checks a standard five-field cron expression against a UTC instant.
 * Day-of-month and day-of-week follow traditional cron OR semantics when both
 * fields are restricted; wildcard fields naturally behave as an AND filter.
 */
export function isCronDueAt(expression: string, date: Date): boolean {
  const parsed = parseCronExpression(expression);
  if (!parsed || Number.isNaN(date.getTime())) return false;
  const [minutes, hours, daysOfMonth, months, daysOfWeek] = parsed;
  const month = date.getUTCMonth() + 1;
  const dayOfWeek = date.getUTCDay();
  const dayOfMonthMatches = daysOfMonth.has(date.getUTCDate());
  const dayOfWeekMatches = daysOfWeek.has(dayOfWeek) || (dayOfWeek === 0 && daysOfWeek.has(7));
  const dayOfMonthWildcard = expression.trim().split(/\s+/)[2] === "*";
  const dayOfWeekWildcard = expression.trim().split(/\s+/)[4] === "*";
  const dayMatches = dayOfMonthWildcard && dayOfWeekWildcard
    ? true
    : dayOfMonthWildcard
      ? dayOfWeekMatches
      : dayOfWeekWildcard
        ? dayOfMonthMatches
        : dayOfMonthMatches || dayOfWeekMatches;

  return minutes.has(date.getUTCMinutes())
    && hours.has(date.getUTCHours())
    && months.has(month)
    && dayMatches;
}

export function normalizeUtcCronExpression(expression: string): string {
  const normalized = expression.trim().replace(/\s+/g, " ");
  if (!isValidUtcCronExpression(normalized)) throw new Error("Gunakan cron UTC lima kolom yang valid.");
  return normalized;
}
