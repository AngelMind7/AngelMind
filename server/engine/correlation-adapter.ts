import {
  CATEGORY_ESCALATION_RULES,
  COMPOUND_RULES,
  PREREQUISITE_RULES,
  SEQUENTIAL_RULES,
  type CategoryEscalationRule,
  type EvidenceCondition,
  type PrerequisiteRule,
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
  category?: string;
  confidence: number; // 0-100
  evidenceRefs: string[];
  evidence?: Record<string, EvidenceValue | EvidenceValue[]>;
};

export type CategoryEscalationResult = {
  ruleId: string;
  action: CategoryEscalationRule["action"];
  sourceCategory: string;
  affectedVectors: string[];
  approvalGate?: string;
  priority?: string;
  rationale: string;
};

export type PrerequisiteResult = {
  ruleId: string;
  sourceVector: string;
  targetVector: string;
  prerequisiteSatisfied: string;
  autoUpdate: boolean;
  evidenceRefs: string[];
  note?: string;
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

function categoryMatches(
  rule: CategoryEscalationRule,
  vector: ConfirmedVectorFact
): boolean {
  return vector.category === rule.triggerCategory;
}

export function evaluateCategoryEscalations(
  confirmedVectors: ConfirmedVectorFact[]
): CategoryEscalationResult[] {
  return CATEGORY_ESCALATION_RULES.flatMap(rule => {
    const matching = confirmedVectors.filter(vector =>
      categoryMatches(rule, vector)
    );
    if (matching.length < rule.triggerCount) return [];
    const affectedVectors =
      rule.action === "auto_flag_related"
        ? (rule.targetVectors ?? [])
        : confirmedVectors
            .filter(
              vector =>
                vector.category ===
                (rule.targetCategory ?? rule.triggerCategory)
            )
            .map(vector => vector.vectorKey);
    return [
      {
        ruleId: rule.ruleId,
        action: rule.action,
        sourceCategory: rule.triggerCategory,
        affectedVectors: Array.from(new Set(affectedVectors)).sort(),
        approvalGate: rule.newApprovalGate,
        priority: rule.newPriority,
        rationale: rule.rationale,
      },
    ];
  });
}

export function evaluatePrerequisites(
  confirmedVectors: ConfirmedVectorFact[]
): PrerequisiteResult[] {
  return PREREQUISITE_RULES.flatMap((rule: PrerequisiteRule) => {
    const sources = confirmedVectors.filter(
      vector => vector.vectorKey === rule.sourceVector
    );
    if (sources.length === 0) return [];
    return [
      {
        ruleId: rule.ruleId,
        sourceVector: rule.sourceVector,
        targetVector: rule.targetVector,
        prerequisiteSatisfied: rule.prerequisiteSatisfied,
        autoUpdate: rule.autoUpdate,
        evidenceRefs: Array.from(
          new Set(sources.flatMap(source => source.evidenceRefs))
        ).sort(),
        ...(rule.note ? { note: rule.note } : {}),
      },
    ];
  });
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
 * Category escalation and prerequisite recommendations are exposed separately so
 * callers can persist them through their own lifecycle/audit transaction.
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
