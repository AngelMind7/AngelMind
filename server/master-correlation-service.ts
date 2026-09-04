import { evaluateCorrelationRules, mergeCorrelationResults, type CorrelationFact, type CorrelationResult } from "./correlation-engine";
import { masterCorrelationRules, masterSeverityOverrides } from "./master-correlation-rules";

export type MasterCorrelationResult = {
  matches: CorrelationResult[];
  emittedKeys: string[];
  severityOverride?: (typeof masterSeverityOverrides)[number];
  criticalEscalation: boolean;
};

function normalizedFactKeys(facts: CorrelationFact[]) {
  return new Set(facts.map(fact => fact.key.trim().toLowerCase()).filter(Boolean));
}

export function evaluateMasterCorrelation(facts: CorrelationFact[]): MasterCorrelationResult {
  const matches = mergeCorrelationResults(evaluateCorrelationRules(facts, [...masterCorrelationRules]));
  const keys = normalizedFactKeys(facts);
  const severityOverride = masterSeverityOverrides.find(rule =>
    rule.chain.every(part => Array.from(keys).some(key => key === part || key.includes(part)))
  );
  return {
    matches,
    emittedKeys: Array.from(new Set(matches.map(match => match.emittedKey))).sort(),
    severityOverride,
    criticalEscalation: Boolean(severityOverride) || matches.some(match => match.priority >= 100),
  };
}
