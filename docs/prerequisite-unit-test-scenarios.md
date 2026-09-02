# Skenario Unit Test Prerequisite Rules

Dokumen ini mendefinisikan skenario unit test mendalam untuk `PRE-001` hingga `PRE-003` pada `evaluatePrerequisites()`. Test berfokus pada kontrak evaluator saat ini: evaluator hanya membaca `vectorKey` dan `evidenceRefs`, menghasilkan rekomendasi terstruktur, tidak memutasi input, dan tidak mengubah database.

## Kontrak Rule

| Rule      | Source vector      | Target vector              | `autoUpdate` | `note`                                  |
| --------- | ------------------ | -------------------------- | -----------: | --------------------------------------- |
| `PRE-001` | `xxe-out-of-band`  | `ssrf-internal`            |       `true` | Tidak ada                               |
| `PRE-002` | `info-sourcemap`   | `auth-jwt-alg-confusion`   |       `true` | Tidak ada                               |
| `PRE-003` | `info-stack-trace` | `deserialization-insecure` |      `false` | Memerlukan analisis gadget chain manual |

## Fixture Helpers

```ts
import { describe, expect, it } from "vitest";
import {
  evaluatePrerequisites,
  type ConfirmedVectorFact,
} from "./correlation-adapter";

const fact = (
  vectorKey: string,
  evidenceRefs: string[] = ["evidence-1"],
  overrides: Partial<ConfirmedVectorFact> = {}
): ConfirmedVectorFact => ({
  vectorKey,
  confidence: 90,
  evidenceRefs,
  ...overrides,
});
```

## PRE-001 — XXE ke SSRF Internal

### Positive detection

Input hanya berisi vector `xxe-out-of-band`. Assert bahwa tepat satu rekomendasi dihasilkan, dengan `targetVector` `ssrf-internal`, `autoUpdate: true`, `ruleId: PRE-001`, dan prerequisite text yang sesuai.

```ts
it("PRE-001 menghasilkan prerequisite SSRF dari XXE", () => {
  const result = evaluatePrerequisites([fact("xxe-out-of-band", ["ev-xxe-1"])]);

  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    ruleId: "PRE-001",
    sourceVector: "xxe-out-of-band",
    targetVector: "ssrf-internal",
    autoUpdate: true,
    evidenceRefs: ["ev-xxe-1"],
  });
  expect(result[0]?.prerequisiteSatisfied).toContain("internal network");
  expect(result[0]).not.toHaveProperty("note");
});
```

### Negative isolation

Input hanya berisi vector lain, misalnya `sqli-classic`. Assert PRE-001 tidak muncul.

```ts
it("PRE-001 tidak aktif tanpa source vector XXE", () => {
  const result = evaluatePrerequisites([fact("sqli-classic")]);

  expect(result.some(item => item.ruleId === "PRE-001")).toBe(false);
});
```

## PRE-002 — Source Map ke JWT Algorithm Confusion

### Positive detection

Input `info-sourcemap` harus menghasilkan rekomendasi target `auth-jwt-alg-confusion`, `autoUpdate: true`, dan tidak menghasilkan PRE-001 atau PRE-003.

```ts
it("PRE-002 menghasilkan prerequisite JWT dari source map", () => {
  const result = evaluatePrerequisites([fact("info-sourcemap", ["ev-map-1"])]);

  expect(result).toEqual([
    expect.objectContaining({
      ruleId: "PRE-002",
      sourceVector: "info-sourcemap",
      targetVector: "auth-jwt-alg-confusion",
      autoUpdate: true,
      evidenceRefs: ["ev-map-1"],
    }),
  ]);
});
```

### Negative isolation

Input `auth-jwt-alg-confusion` sebagai target vector tidak boleh dianggap sebagai source vector untuk PRE-002.

```ts
it("PRE-002 tidak aktif hanya karena target vector sudah ada", () => {
  const result = evaluatePrerequisites([
    fact("auth-jwt-alg-confusion", ["ev-jwt-1"]),
  ]);

  expect(result).toEqual([]);
});
```

## PRE-003 — Stack Trace ke Insecure Deserialization

### Positive detection dan manual-review gate

PRE-003 harus menghasilkan rekomendasi, tetapi `autoUpdate` wajib `false` dan `note` wajib dipertahankan karena rule memerlukan analisis manual.

```ts
it("PRE-003 menghasilkan rekomendasi manual untuk deserialization", () => {
  const result = evaluatePrerequisites([
    fact("info-stack-trace", ["ev-stack-1"]),
  ]);

  expect(result).toEqual([
    expect.objectContaining({
      ruleId: "PRE-003",
      sourceVector: "info-stack-trace",
      targetVector: "deserialization-insecure",
      autoUpdate: false,
      evidenceRefs: ["ev-stack-1"],
      note: expect.stringContaining("manual gadget chain analysis"),
    }),
  ]);
});
```

## Cross-Rule Isolation

### Semua source vector menghasilkan tiga rule yang tepat

```ts
it("menghasilkan PRE-001 sampai PRE-003 secara independen", () => {
  const result = evaluatePrerequisites([
    fact("xxe-out-of-band", ["ev-1"]),
    fact("info-sourcemap", ["ev-2"]),
    fact("info-stack-trace", ["ev-3"]),
  ]);

  expect(result.map(item => item.ruleId)).toEqual([
    "PRE-001",
    "PRE-002",
    "PRE-003",
  ]);
});
```

### Vector yang tidak relevan tidak menghasilkan rekomendasi

```ts
it("mengabaikan vector yang tidak terdaftar sebagai prerequisite source", () => {
  const result = evaluatePrerequisites([
    fact("cloud-metadata-exposure"),
    fact("ssrf-internal"),
    fact("auth-jwt-none"),
  ]);

  expect(result).toEqual([]);
});
```

## Evidence Reference Handling

### Deduplicate dan sort evidence references

```ts
it("menggabungkan evidenceRefs secara unik dan terurut", () => {
  const result = evaluatePrerequisites([
    fact("xxe-out-of-band", ["z-ref", "a-ref", "z-ref"]),
    fact("xxe-out-of-band", ["b-ref", "a-ref"]),
  ]);

  expect(result).toEqual([
    expect.objectContaining({
      ruleId: "PRE-001",
      evidenceRefs: ["a-ref", "b-ref", "z-ref"],
    }),
  ]);
});
```

### Evidence kosong tetap menghasilkan rekomendasi sesuai kontrak saat ini

Skenario ini mendokumentasikan perilaku saat ini. Jika kebijakan produk nantinya mensyaratkan minimal satu evidence reference, test ini harus diubah menjadi negative case dan validasi wajib ditambahkan ke evaluator.

```ts
it("tetap menghasilkan rekomendasi ketika evidenceRefs kosong", () => {
  const result = evaluatePrerequisites([fact("info-sourcemap", [])]);

  expect(result).toEqual([
    expect.objectContaining({
      ruleId: "PRE-002",
      evidenceRefs: [],
    }),
  ]);
});
```

## Input Integrity dan Boundary Cases

### Evaluator tidak memutasi input

```ts
it("tidak memutasi confirmedVectors", () => {
  const input = [
    fact("xxe-out-of-band", ["e-1", "e-1"]),
    fact("info-stack-trace"),
  ];
  const snapshot = structuredClone(input);

  evaluatePrerequisites(input);

  expect(input).toEqual(snapshot);
});
```

### Duplicate source facts tetap menghasilkan satu hasil per rule

```ts
it("tidak menggandakan hasil ketika source vector muncul berulang", () => {
  const result = evaluatePrerequisites([
    fact("info-sourcemap", ["e-1"]),
    fact("info-sourcemap", ["e-2"]),
  ]);

  expect(result.filter(item => item.ruleId === "PRE-002")).toHaveLength(1);
  expect(result[0]?.evidenceRefs).toEqual(["e-1", "e-2"]);
});
```

### Confidence tidak mengubah prerequisite recommendation

Skenario ini memastikan evaluator prerequisite tidak diam-diam memakai confidence sebagai threshold karena kontrak saat ini tidak mendefinisikan threshold tersebut.

```ts
it("tidak memakai confidence sebagai filter implicit", () => {
  const result = evaluatePrerequisites([
    fact("xxe-out-of-band", ["e-low"], { confidence: 0 }),
  ]);

  expect(result).toHaveLength(1);
  expect(result[0]?.ruleId).toBe("PRE-001");
});
```

### Status atau evidence payload tambahan tidak mengubah source matching

```ts
it("mencocokkan source berdasarkan vectorKey saja sesuai kontrak evaluator", () => {
  const result = evaluatePrerequisites([
    fact("info-stack-trace", ["e-status"], {
      evidence: { status: "OPEN", framework: "Java" },
    }),
  ]);

  expect(result[0]).toMatchObject({
    ruleId: "PRE-003",
    sourceVector: "info-stack-trace",
  });
});
```

## Matrix Verifikasi Minimum

| Skenario                |       PRE-001 |       PRE-002 |       PRE-003 |
| ----------------------- | ------------: | ------------: | ------------: |
| Source vector valid     |        Muncul |        Muncul |        Muncul |
| Source vector tidak ada |  Tidak muncul |  Tidak muncul |  Tidak muncul |
| Target vector saja      |  Tidak muncul |  Tidak muncul |  Tidak muncul |
| Duplicate source        |    Satu hasil |    Satu hasil |    Satu hasil |
| Duplicate evidence ref  | Dideduplikasi | Dideduplikasi | Dideduplikasi |
| `autoUpdate`            |        `true` |        `true` |       `false` |
| `note`                  |     Tidak ada |     Tidak ada |     Wajib ada |
| Input mutation          |         Tidak |         Tidak |         Tidak |

## Catatan Implementasi

Skenario di atas sengaja tidak menguji database, audit event, atau auto-update state karena `evaluatePrerequisites()` saat ini adalah pure evaluator. Integrasi ke persistence harus diuji terpisah sebagai integration test dengan transaction rollback, idempotency key, workspace authorization, dan audit event yang merekam `ruleId`, source evidence, target vector, serta keputusan reviewer untuk `PRE-003`.
