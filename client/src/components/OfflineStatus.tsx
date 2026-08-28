import { useEffect, useState } from "react";

/** Displays connectivity only; protected data and governance mutations are never made available offline. */
export default function OfflineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  if (online) return null;
  return <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-300/40 bg-[#14110a] px-4 py-3 text-center font-mono text-xs text-amber-100">Offline: static interface only. Workspace data and governance actions require a live connection.</div>;
}
