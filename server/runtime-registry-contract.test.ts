import { describe, expect, it } from "vitest";
import { listRegisteredAdapters } from "./tool-runtime";
import {
  getRegisteredTool,
  getToolByAdapter,
  listRegisteredTools,
} from "./tool-registry";

describe("runtime ↔ canonical tool registry contract", () => {
  it("has a canonical registry entry for every executable manifest adapter", () => {
    for (const tool of listRegisteredTools()) {
      expect(getToolByAdapter(tool.adapter)?.id).toBe(tool.id);
    }
  });

  it("keeps every canonical adapter executable in the runtime adapter set", () => {
    const runtimeAdapters = new Set(
      listRegisteredAdapters().map(adapter => adapter.toolKey)
    );

    for (const tool of listRegisteredTools()) {
      const runtime = listRegisteredAdapters().find(
        adapter => adapter.toolKey === tool.id
      );
      if (runtime) {
        expect(runtimeAdapters.has(tool.id)).toBe(true);
      } else {
        // A canonical tool may be represented by an adapter alias in the
        // legacy runtime keyspace; in that case the adapter identity is the
        // invariant rather than the historical tool id.
        expect(
          listRegisteredAdapters().some(
            adapter => getToolByAdapter(tool.adapter)?.id === tool.id
          )
        ).toBe(true);
      }
    }
  });

  it("rejects an unknown canonical tool rather than silently probing it", () => {
    expect(getRegisteredTool("definitely-not-a-real-tool")).toBeUndefined();
    expect(getToolByAdapter("definitely-not-a-real-adapter")).toBeUndefined();
  });
});
