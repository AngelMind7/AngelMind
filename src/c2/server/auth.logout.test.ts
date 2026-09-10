import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("auth.logout", () => {
  it("returns a successful Firebase sign-out response", async () => {
    const user: NonNullable<TrpcContext["user"]> = {
      id: 1,
      openId: "firebase:test-user",
      email: "sample@example.com",
      name: "Sample User",
      loginMethod: "google.com",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const ctx: TrpcContext = {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };

    const result = await appRouter.createCaller(ctx).auth.logout();
    expect(result).toEqual({ success: true, provider: "firebase" });
  });
});
