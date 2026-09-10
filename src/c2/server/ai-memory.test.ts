import { describe, expect, it } from "vitest";
import { buildMemoryScopeKey, validateMemoryReferences } from "./ai-memory";

describe("AI memory scope contracts", () => {
  it("accepts user memory without tenant references", () => {
    expect(() => validateMemoryReferences({ scope: "user" })).not.toThrow();
  });

  it("rejects user memory with workspace references", () => {
    expect(() => validateMemoryReferences({ scope: "user", workspaceId: 10 })).toThrow(/User memory/);
  });

  it("requires exactly the workspace boundary for workspace memory", () => {
    expect(() => validateMemoryReferences({ scope: "workspace", workspaceId: 10 })).not.toThrow();
    expect(() => validateMemoryReferences({ scope: "workspace" })).toThrow(/Workspace memory/);
    expect(() => validateMemoryReferences({ scope: "workspace", workspaceId: 10, sessionId: 11 })).toThrow(/Workspace memory/);
  });

  it("requires matching workspace and session/program references", () => {
    expect(() => validateMemoryReferences({ scope: "session", workspaceId: 10, sessionId: 11 })).not.toThrow();
    expect(() => validateMemoryReferences({ scope: "session", sessionId: 11 })).toThrow(/Session memory/);
    expect(() => validateMemoryReferences({ scope: "program", workspaceId: 10, programId: 12 })).not.toThrow();
    expect(() => validateMemoryReferences({ scope: "program", workspaceId: 10, programId: 12, sessionId: 11 })).toThrow(/Program memory/);
  });

  it("creates distinct normalized keys for different owners and scopes", () => {
    const workspace = buildMemoryScopeKey({ scope: "workspace", workspaceId: 10, memoryKey: "  preferences  " }, 1);
    const otherOwner = buildMemoryScopeKey({ scope: "workspace", workspaceId: 10, memoryKey: "preferences" }, 2);
    const user = buildMemoryScopeKey({ scope: "user", memoryKey: "preferences" }, 1);
    expect(workspace).toBe("workspace:1:10:0:0:preferences");
    expect(new Set([workspace, otherOwner, user]).size).toBe(3);
  });
});
