import {
  COMPOUND_RULES,
  SEQUENTIAL_RULES,
  type EvidenceCondition,
  type SequentialRule,
} from "./correlation-rules";
import {
  evaluateCorrelationRules,
  mergeCorrelationResults,
  type CorrelationFact,
  type CorrelationResult,
  type CorrelationRule,
} from "../correlation-engine";

export type EvidenceValue = string | number | boolean | null | undefined;

export type ConfirmedVectorFact = {
  vectorKey: string;
  confidence: number; // 0-100
  evidenceRefs: string[];
  evidence?: Record<string, EvidenceValue | EvidenceValue[]>;
};

function toGenericFacts(
  confirmedVectors: ConfirmedVectorFact[]
): CorrelationFact[] {
  return confirmedVectors.map(v => ({
    key: `vector.${v.vectorKey}`,
    value: "CONFIRMED",
    confidence: v.confidence,
    evidenceRefs: v.evidenceRefs,
  }));
}

function conditionMatches(
  condition: EvidenceCondition,
  fact: ConfirmedVectorFact
): boolean {
  const actual = fact.evidence?.[condition.field];
  if (actual === undefined || actual === null) return false;

  switch (condition.operator) {
    case "is_not_null":
      return true;
    case "equals":
      return actual === condition.value;
    case "contains":
      return (
        typeof actual === "string" &&
        typeof condition.value === "string" &&
        actual.toLowerCase().includes(condition.value.toLowerCase())
      );
    case "contains_any": {
      const values = Array.isArray(condition.value)
        ? condition.value
        : [condition.value ?? ""];
      return values.some(
        value =>
          typeof value === "string" &&
          typeof actual === "string" &&
          actual.toLowerCase().includes(value.toLowerCase())
      );
    }
    case "in": {
      const values = Array.isArray(condition.value)
        ? condition.value
        : [condition.value ?? ""];
      return values.some(
        value =>
          actual === value || (Array.isArray(actual) && actual.includes(value))
      );
    }
    default:
      return false;
  }
}

function sequentialRuleMatches(
  rule: SequentialRule,
  confirmedVectors: ConfirmedVectorFact[]
): boolean {
  const trigger = confirmedVectors.find(
    vector => vector.vectorKey === rule.trigger.vectorKey
  );
  return Boolean(
    trigger &&
      (!rule.trigger.evidenceCondition ||
        conditionMatches(rule.trigger.evidenceCondition, trigger))
  );
}

function sequentialToGenericRules(rule: SequentialRule): CorrelationRule[] {
  return rule.targetVectors.map(targetVector => ({
    id: rule.ruleId,
    category: "sequential",
    requires: [
      `vector.${rule.trigger.vectorKey}`,
      ...(rule.trigger.requiresVector
        ? [`vector.${rule.trigger.requiresVector}`]
        : []),
    ],
    emits: `vector.${targetVector}`,
    title: rule.name,
    priority: Math.round(rule.confidence * 100),
    taskType: rule.approvalGateOverride,
  }));
}

function compoundToGenericRules(): CorrelationRule[] {
  return COMPOUND_RULES.flatMap(rule =>
    rule.targetVectors.map(targetVector => ({
      id: rule.ruleId,
      category: "compound" as const,
      requires: rule.triggerVectors.map(vector => `vector.${vector}`),
      emits: `vector.${targetVector}`,
      title: rule.name,
      priority: Math.round(rule.confidence * 100),
      taskType: rule.approvalGateOverride,
    }))
  );
}

/**
 * Evaluate confirmed vectors against the master sequential and compound rule sets.
 * Evidence-gated rules are only eligible when their required evidence field matches;
 * all target vectors are retained, then duplicate emissions are merged by the engine.
 */
export function runCorrelation(
  confirmedVectors: ConfirmedVectorFact[]
): CorrelationResult[] {
  const facts = toGenericFacts(confirmedVectors);
  const sequentialRules = SEQUENTIAL_RULES.filter(rule =>
    sequentialRuleMatches(rule, confirmedVectors)
  ).flatMap(sequentialToGenericRules);
  const sequentialResults = evaluateCorrelationRules(facts, sequentialRules);
  const compoundResults = evaluateCorrelationRules(
    facts,
    compoundToGenericRules()
  );
  return mergeCorrelationResults([...sequentialResults, ...compoundResults]);
}
