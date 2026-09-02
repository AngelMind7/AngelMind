export type ProgramScope = {
  includedAssets: string[];
  excludedAssets: string[];
  rules: string[];
  safeHarbor: string;
  version: number;
};

export type ScopeDiff = {
  includedAdded: string[];
  includedRemoved: string[];
  excludedAdded: string[];
  excludedRemoved: string[];
  rulesAdded: string[];
  rulesRemoved: string[];
  safeHarborChanged: boolean;
  changed: boolean;
  impact: "none" | "low" | "high";
};

function normalizeList(values: string[]) {
  if (!Array.isArray(values)) throw new Error("Program scope lists must be arrays.");
  if (!values.every(value => typeof value === "string")) throw new Error("Program scope lists must contain strings.");
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

export function normalizeProgramScope(input: Omit<ProgramScope, "version"> & { version?: number }): ProgramScope {
  const includedAssets = normalizeList(input.includedAssets);
  const excludedAssets = normalizeList(input.excludedAssets);
  const rules = normalizeList(input.rules);
  if (includedAssets.length === 0) throw new Error("Program scope requires at least one included asset.");
  if (typeof input.safeHarbor !== "string" || !input.safeHarbor.trim()) throw new Error("Program scope requires safe harbor text.");
  const overlap = includedAssets.filter(asset => excludedAssets.includes(asset));
  if (overlap.length > 0) throw new Error(`An asset cannot be both included and excluded: ${overlap.join(", ")}`);
  const version = input.version ?? 1;
  if (!Number.isInteger(version) || version < 1) throw new Error("Program scope version must be a positive integer.");
  return { includedAssets, excludedAssets, rules, safeHarbor: input.safeHarbor.trim(), version };
}

function listDiff(previous: string[], current: string[]) {
  return {
    added: current.filter(value => !previous.includes(value)),
    removed: previous.filter(value => !current.includes(value)),
  };
}

export function diffProgramScope(previousInput: ProgramScope, currentInput: Omit<ProgramScope, "version"> & { version?: number }): ScopeDiff {
  const previous = normalizeProgramScope(previousInput);
  const current = normalizeProgramScope(currentInput);
  const included = listDiff(previous.includedAssets, current.includedAssets);
  const excluded = listDiff(previous.excludedAssets, current.excludedAssets);
  const rules = listDiff(previous.rules, current.rules);
  const safeHarborChanged = previous.safeHarbor !== current.safeHarbor;
  const changed = included.added.length > 0 || included.removed.length > 0 || excluded.added.length > 0 || excluded.removed.length > 0 || rules.added.length > 0 || rules.removed.length > 0 || safeHarborChanged;
  const impact = !changed ? "none" : included.removed.length > 0 || excluded.added.length > 0 || safeHarborChanged ? "high" : "low";
  return { includedAdded: included.added, includedRemoved: included.removed, excludedAdded: excluded.added, excludedRemoved: excluded.removed, rulesAdded: rules.added, rulesRemoved: rules.removed, safeHarborChanged, changed, impact };
}

export function nextProgramScopeVersion(previous: ProgramScope, currentInput: Omit<ProgramScope, "version"> & { version?: number }) {
  const diff = diffProgramScope(previous, currentInput);
  return { version: diff.changed ? previous.version + 1 : previous.version, diff };
}

export function parseStoredProgramScope(program: { includedAssets: string; excludedAssets: string; rules: string; safeHarbor: string; currentVersion: number }): ProgramScope {
  const parseList = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  };
  return normalizeProgramScope({ includedAssets: parseList(program.includedAssets), excludedAssets: parseList(program.excludedAssets), rules: parseList(program.rules), safeHarbor: program.safeHarbor, version: program.currentVersion });
}
