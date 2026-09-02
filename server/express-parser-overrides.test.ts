import express from "express";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";

async function requestApp(
  app: express.Express,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address() as AddressInfo | null;
  if (!address) {
    server.close();
    throw new Error("Test server address is unavailable");
  }

  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`, init);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
}

function parserErrorHandler(
  error: unknown,
  _request: express.Request,
  response: express.Response,
  next: express.NextFunction,
) {
  const parserError = error as { type?: string };
  if (parserError.type === "entity.parse.failed") {
    response.sendStatus(400);
    return;
  }
  if (parserError.type === "entity.too.large") {
    response.sendStatus(413);
    return;
  }
  next(error);
}

describe("Express parser dependency overrides", () => {
  it("parses nested query values and repeated arrays through qs", async () => {
    const app = express();
    app.set("query parser", "extended");
    app.get("/query", (request, response) => response.json(request.query));

    const result = await requestApp(
      app,
      "/query?filter%5Bstatus%5D=active&tag=one&tag=two",
    );

    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual({
      filter: { status: "active" },
      tag: ["one", "two"],
    });
  });

  it("does not allow query parameters to pollute Object.prototype", async () => {
    const app = express();
    app.set("query parser", "extended");
    app.get("/query", (request, response) => {
      response.json({
        query: request.query,
        polluted: ({} as { polluted?: unknown }).polluted ?? null,
      });
    });

    const result = await requestApp(
      app,
      "/query?__proto__%5Bpolluted%5D=yes&constructor%5Bprototype%5D%5Bpolluted%5D=yes",
    );
    const body = await result.json();

    expect(result.status).toBe(200);
    expect(body.polluted).toBeNull();
    expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
  });

  it("parses JSON bodies without changing the application contract", async () => {
    const app = express();
    app.use(express.json({ limit: "32kb", strict: true }));
    app.post("/json", (request, response) => response.status(201).json(request.body));

    const result = await requestApp(app, "/json", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "AngelMind", enabled: true }),
    });

    expect(result.status).toBe(201);
    await expect(result.json()).resolves.toEqual({
      name: "AngelMind",
      enabled: true,
    });
  });

  it("returns 400 for malformed JSON and 413 for oversized JSON", async () => {
    const app = express();
    app.use(express.json({ limit: "1kb", strict: true }));
    app.use(parserErrorHandler);
    app.post("/json", (_request, response) => response.sendStatus(204));

    const malformed = await requestApp(app, "/json", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"name":',
    });
    const oversized = await requestApp(app, "/json", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: "x".repeat(5000) }),
    });

    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(413);
  });

  it("parses nested URL-encoded form values and repeated fields through qs", async () => {
    const app = express();
    app.use(
      express.urlencoded({
        extended: true,
        limit: "16kb",
        parameterLimit: 100,
      }),
    );
    app.post("/form", (request, response) => response.json(request.body));

    const result = await requestApp(app, "/form", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "user%5Bname%5D=alice&role=admin&role=auditor",
    });

    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual({
      user: { name: "alice" },
      role: ["admin", "auditor"],
    });
  });
});
