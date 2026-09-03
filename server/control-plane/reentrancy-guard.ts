const activeKeys = new Set<string>();

export async function withControlPlaneReentrancyGuard<T>(key: string, operation: () => Promise<T>) {
  if (typeof key !== "string") throw new Error("Reentrancy guard key is required.");
  if (typeof operation !== "function") throw new Error("Reentrancy guard operation is required.");
  const normalized = key.trim();
  if (!normalized) throw new Error("Reentrancy guard key is required.");
  if (normalized.length > 512) throw new Error("Reentrancy guard key is invalid.");
  if (activeKeys.has(normalized)) throw new Error("Concurrent control-plane mutation rejected by reentrancy guard.");
  activeKeys.add(normalized);
  try {
    return await operation();
  } finally {
    activeKeys.delete(normalized);
  }
}

export function isControlPlaneMutationActive(key: string) {
  return typeof key === "string" && key.trim().length <= 512 && activeKeys.has(key.trim());
}
