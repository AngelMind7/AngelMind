const activeKeys = new Set<string>();

export async function withControlPlaneReentrancyGuard<T>(key: string, operation: () => Promise<T>) {
  if (typeof key !== "string") throw new Error("Reentrancy guard key is required.");
  const normalized = key.trim();
  if (!normalized) throw new Error("Reentrancy guard key is required.");
  if (activeKeys.has(normalized)) throw new Error("Concurrent control-plane mutation rejected by reentrancy guard.");
  activeKeys.add(normalized);
  try {
    return await operation();
  } finally {
    activeKeys.delete(normalized);
  }
}

export function isControlPlaneMutationActive(key: string) {
  return typeof key === "string" && activeKeys.has(key.trim());
}
