import { evaluateCorrelationRules, mergeCorrelationResults, type CorrelationFact, type CorrelationRule, type CorrelationResult } from "../correlation-engine";
import { SEQUENTIAL_RULES, COMPOUND_RULES } from "./correlation-rules";

/**
 * P3 — Adapter yang menerjemahkan 47 rule konkret (correlation-rules.ts) ke
 * shape generic key/value yang dipahami evaluateCorrelationRules() yang sudah
 * ada di server/correlation-engine.ts (TIDAK diubah — lihat correlation-engine.test.ts
 * yang menguji shape lama).
 *
 * Pendekatan: setiap "vectorKey CONFIRMED" direpresentasikan sebagai fact
 * { key: `vector.${vectorKey}`, value: "CONFIRMED" }. evidence_condition dari
 * rule sequential BELUM dievaluasi di sini (engine lama tidak mendukung kondisi
 * per-field) — saat ini rule sequential yang punya evidenceCondition akan tetap
 * match hanya berdasar status vector, evidence_condition diabaikan.
 * TODO: kalau butuh precision lebih tinggi, tambahkan evaluator evidence_condition
 * terpisah sebelum memasukkan fact ke evaluateCorrelationRules.
 *
 * category/prerequisite rules (CAT-*, PRE-*) TIDAK di-adapt ke sini karena
 * bentuknya beda (cluster-count & auto-update, bukan requires/emits) — masih
 * perlu implementasi terpisah kalau mau dipakai.
 */

export type ConfirmedVectorFact = {
  vectorKey: string;
  confidence: number; // 0-100
  evidenceRefs: string[];
};

function toGenericFacts(confirmedVectors: ConfirmedVectorFact[]): CorrelationFact[] {
  return confirmedVectors.map(v => ({
    key: `vector.${v.vectorKey}`,
    value: "CONFIRMED",
    confidence: v.confidence,
    evidenceRefs: v.evidenceRefs,
  }));
}

function sequentialToGenericRule(rule: (typeof SEQUENTIAL_RULES)[number]): CorrelationRule {
  const requires = [`vector.${rule.trigger.vectorKey}`];
  if (rule.trigger.requiresVector) requires.push(`vector.${rule.trigger.requiresVector}`);
  return {
    id: rule.ruleId,
    category: "sequential",
    requires,
    emits: `vector.${rule.targetVectors[0]}`,
    title: rule.name,
    priority: Math.round(rule.confidence * 100),
    taskType: rule.approvalGateOverride,
  };
}

function compoundToGenericRule(rule: (typeof COMPOUND_RULES)[number]): CorrelationRule {
  return {
    id: rule.ruleId,
    category: "compound",
    requires: rule.triggerVectors.map(v => `vector.${v}`),
    emits: `vector.${rule.targetVectors[0]}`,
    title: rule.name,
    priority: Math.round(rule.confidence * 100),
    taskType: rule.approvalGateOverride,
  };
}

/**
 * Entry point yang dipanggil dari lifecycle evidence/finding.
 *
 * TODO — INTEGRASI: belum ada pemanggil di server/evidence-workflow.ts atau
 * server/research-workflow.ts. Status finding di repo saat ini pakai string
 * lowercase ("validated", "duplicate", "inconclusive"), BUKAN "CONFIRMED"
 * seperti di spesifikasi — perlu keputusan desain terlebih dahulu:
 *   1) Definisikan mapping status finding -> "vector CONFIRMED" (mis. status
 *      "validated" pada finding dengan vectorKey tertentu = confirmed), atau
 *   2) Buat tabel/kolom baru untuk menandai vector yang confirmed per research.
 * Setelah keputusan itu dibuat, panggil runCorrelation() di titik lifecycle
 * yang relevan (mis. setelah completeFindingRetest / promoteFinding) dan
 * simpan CorrelationResult[] sebagai audit event + task baru sesuai priority.
 */
export function runCorrelation(confirmedVectors: ConfirmedVectorFact[]): CorrelationResult[] {
  const facts = toGenericFacts(confirmedVectors);
  const sequentialResults = evaluateCorrelationRules(facts, SEQUENTIAL_RULES.map(sequentialToGenericRule));
  const compoundResults = evaluateCorrelationRules(facts, COMPOUND_RULES.map(compoundToGenericRule));
  return mergeCorrelationResults([...sequentialResults, ...compoundResults]);
}
