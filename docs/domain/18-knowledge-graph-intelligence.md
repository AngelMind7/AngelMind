# Knowledge Graph and Intelligence Domain

The repository now exposes deterministic graph integrity analysis over workspace-scoped knowledge snapshots. The analysis does not infer truth from an external provider; it reports structural properties that can be verified from persisted nodes and edges.

## Contract

| Signal | Meaning |
|---|---|
| `nodeCount` / `edgeCount` | Snapshot size after workspace and time filtering. |
| `orphanNodeIds` | Nodes with no incoming or outgoing relationship. |
| `cycleNodeIds` | Nodes participating in a directed cycle. |
| `lowConfidenceEdges` | Relationships below the confidence threshold of 60. |
| `integrity` | True only when all edges resolve to snapshot nodes and no cycle exists. |

The `knowledge.analyze` procedure is authenticated and workspace-scoped. It uses the existing graph read path and returns bounded, deterministic structural intelligence. Invalid cross-workspace edges and cyclic evidence structures are surfaced as non-integrity states rather than silently accepted.
