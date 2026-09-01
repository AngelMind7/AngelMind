import { AsyncLocalStorage } from "node:async_hooks";

export type TraceContext = { requestId: string; traceId: string };

const storage = new AsyncLocalStorage<TraceContext>();

export function withTraceContext<T>(context: TraceContext, callback: () => Promise<T>) {
  return storage.run(context, callback);
}

export function currentTraceContext() {
  return storage.getStore();
}
