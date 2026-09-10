export type RestError = { code: string; message: string };
export type RestEnvelope<T> = { data: T; apiVersion: "v1" };
export type HealthResponse = { ok: true; apiVersion: "v1" };
export type SearchResult = { id: number; entityType: string; title: string; body: string; updatedAt: string };
export type SearchResponse = { query: string; results: SearchResult[]; hasNextPage: boolean; nextCursor: string | null; facets: Record<string, number>; [key: string]: unknown };
export type AiRun = Record<string, unknown> & { id: number; workspaceId: number; status: string };

export class AngelMindApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly apiVersion?: string;

  constructor(status: number, error: RestError, apiVersion?: string) {
    super(error.message);
    this.name = "AngelMindApiError";
    this.status = status;
    this.code = error.code;
    this.apiVersion = apiVersion;
  }
}

export class AngelMindRestV1Client {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: { baseUrl: string; apiKey?: string; fetch?: typeof fetch }) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetchImpl = options.fetch ?? fetch;
    this.apiKey = options.apiKey;
  }

  private readonly apiKey?: string;

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("Accept", "application/json");
    if (this.apiKey) headers.set("Authorization", `Bearer ${this.apiKey}`);
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, headers });
    const payload = await response.json() as { error?: RestError; apiVersion?: string; data?: T };
    if (!response.ok) throw new AngelMindApiError(response.status, payload.error ?? { code: "HTTP_ERROR", message: response.statusText }, payload.apiVersion);
    return payload as T;
  }

  health() {
    return this.request<HealthResponse>("/api/v1/health");
  }

  search(workspaceId: number, options: { query: string; limit?: number; cursor?: string; entityTypes?: string[]; freshnessDays?: number }) {
    const params = new URLSearchParams({ q: options.query });
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor) params.set("cursor", options.cursor);
    if (options.entityTypes?.length) params.set("entityTypes", options.entityTypes.join(","));
    if (options.freshnessDays !== undefined) params.set("freshnessDays", String(options.freshnessDays));
    return this.request<RestEnvelope<SearchResponse>>(`/api/v1/workspaces/${workspaceId}/search?${params}`);
  }

  listAiRuns(workspaceId: number) {
    return this.request<RestEnvelope<AiRun[]>>(`/api/v1/workspaces/${workspaceId}/ai-runs`);
  }

  getAiRun(runId: number) {
    return this.request<RestEnvelope<AiRun & { output: unknown }>>(`/api/v1/ai-runs/${runId}`);
  }
}
