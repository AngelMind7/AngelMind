# Blueprint Authority Index

**Current authority:** [`BLUEPRINT_FINAL_SELF_CONTAINED_EXHAUSTIVE.md`](./BLUEPRINT_FINAL_SELF_CONTAINED_EXHAUSTIVE.md)  
**Implementation status:** [`SELF_CONTAINED_IMPLEMENTATION_STATUS.md`](./SELF_CONTAINED_IMPLEMENTATION_STATUS.md)  
**Repository:** `AngelMind7/AngelMind`

## Rule

Semua implementasi baru wajib mengikuti blueprint self-contained exhaustive. Dokumen blueprint yang lebih lama tetap dipertahankan sebagai historical context atau domain-specific detail, tetapi tidak boleh mengubah acceptance, safety boundary, replacement policy, atau release semantics dari current authority.

Jika dokumen lama menyebut target eksternal, tool berlisensi, physical device, cloud account, public blockchain, production evidence, atau manual CI dependency sebagai requirement, istilah tersebut harus dibaca berdasarkan replacement map pada current authority:

| Legacy requirement | Current self-contained implementation |
|---|---|
| External target | Synthetic lab target |
| Licensed tool | Controlled validator |
| Cloud account | Local cloud service |
| Physical device | Artifact fixture or virtual namespace |
| Public blockchain | Private local chain |
| External telemetry | Local telemetry stack |
| External secret manager | Local secret service |
| Manual CI approval | Signed lab authority |
| Production evidence | Live lab evidence |

## Status semantics

`IMPLEMENTED` berarti source code untuk contract tersedia. `VERIFIED` berarti automated check lulus. `LAB-VERIFIED` berarti scenario self-contained dijalankan dan evidence diverifikasi. `DEPLOYED` berarti behavior diamati pada environment deployment yang dituju.

Tidak boleh mengubah `VERIFIED` menjadi `DEPLOYED` tanpa deployment evidence. Tidak boleh mengubah `BLOCKED` atau `EXTERNAL_REQUIRED` menjadi `PASS` dengan fake result. Untuk acceptance release, komponen wajib memiliki implementation, test, evidence path, dan release path.

## Existing documents

- `blueprint-conformance.md`: conformance history and safety interpretation.
- `master-blueprint-alignment.md`: architectural rationale for the existing modular monolith.
- `blueprint-implementation-status.md`: historical implementation mapping.
- `blueprint-delivery-status.md`: historical delivery and safety boundary.
- `FULL_IMPLEMENTATION_STATUS.md`: previous repository status record.

Dokumen tersebut harus diperbarui bila kontraknya berubah, tetapi current authority tetap menjadi sumber kebenaran untuk pekerjaan baru.
