export type CorrelationFact = {
  key: string;
  value: string;
  confidence: number;
  evidenceRefs: string[];
  observedAt?: string | Date;
};

export type CorrelationRule = {
  id: string;
  category: "sequential" | "compound" | "escalation" | "prerequisite";
  requires: string[];
  emits: string;
  title: string;
  priority: number;
  taskType?: string;
};

export type CorrelationResult = {
  ruleId: string;
  category: CorrelationRule["category"];
  title: string;
  emittedKey: string;
  priority: number;
  confidence: number;
  evidenceRefs: string[];
  taskRecommendation?: { type: string; title: string; priority: number };
};

export function evaluateCorrelationRules(facts: CorrelationFact[], rules: CorrelationRule[]): CorrelationResult[] {
  const byKey = new Map<string, CorrelationFact[]>();
  for (const fact of facts) {
    const key = fact.key.trim();
    const value = fact.value.trim();
    if (!key || !value || !Number.isFinite(fact.confidence) || fact.confidence < 0 || fact.confidence > 100) continue;
    const current = byKey.get(key) ?? [];
    const observedAt = fact.observedAt === undefined ? undefined : new Date(fact.observedAt);
    if (observedAt && Number.isNaN(observedAt.getTime())) continue;
    current.push({ ...fact, key, value, confidence: Math.round(fact.confidence), evidenceRefs: Array.from(new Set(fact.evidenceRefs.map(ref => ref.trim()).filter(Boolean))), observedAt: observedAt?.toISOString() });
    byKey.set(key, current);
  }
  return rules.filter(rule => rule.id.trim() && rule.requires.length > 0 && rule.emits.trim()).flatMap(rule => {
    const matched = rule.requires.flatMap(key => byKey.get(key) ?? []);
    if (rule.requires.some(key => !byKey.has(key))) return [];
    const sequence = rule.category === "sequential" ? rule.requires.map(key => byKey.get(key)?.filter(fact => fact.observedAt).sort((a, b) => new Date(a.observedAt!).getTime() - new Date(b.observedAt!).getTime())[0]) : [];
    if (rule.category === "sequential" && sequence.length === rule.requires.length && sequence.every(Boolean) && sequence.length > 1 && sequence.some((fact, index) => index > 0 && new Date(fact!.observedAt!).getTime() <= new Date(sequence[index - 1]!.observedAt!).getTime())) return [];
    const confidence = Math.round(matched.reduce((sum, fact) => sum + fact.confidence, 0) / matched.length);
    const evidenceRefs = Array.from(new Set(matched.flatMap(fact => fact.evidenceRefs))).sort();
    return [{ ruleId: rule.id, category: rule.category, title: rule.title.trim(), emittedKey: rule.emits.trim(), priority: Math.min(100, Math.max(1, Math.trunc(rule.priority))), confidence, evidenceRefs, taskRecommendation: rule.taskType ? { type: rule.taskType.trim(), title: rule.title.trim(), priority: Math.min(100, Math.max(1, Math.trunc(rule.priority))) } : undefined }];
  }).sort((a, b) => b.priority - a.priority || a.ruleId.localeCompare(b.ruleId));
}

export function mergeCorrelationResults(results: CorrelationResult[]): CorrelationResult[] {
  const merged = new Map<string, CorrelationResult>();
  for (const result of results) {
    const existing = merged.get(result.emittedKey);
    if (!existing) { merged.set(result.emittedKey, result); continue; }
    merged.set(result.emittedKey, { ...existing, priority: Math.max(existing.priority, result.priority), confidence: Math.max(existing.confidence, result.confidence), evidenceRefs: Array.from(new Set([...existing.evidenceRefs, ...result.evidenceRefs])).sort(), taskRecommendation: existing.taskRecommendation ?? result.taskRecommendation });
  }
  return Array.from(merged.values()).sort((a, b) => b.priority - a.priority || a.emittedKey.localeCompare(b.emittedKey));
}
