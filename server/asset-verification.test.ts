import { describe, expect, it } from "vitest";
import { assertVerificationDecision, buildVerificationInstructions } from "./asset-verification";

describe("asset verification contract", () => {
  it("builds DNS TXT instructions without performing a network lookup", () => {
    expect(buildVerificationInstructions("dns_txt", "Api.Example.com.", "0123456789abcdef0123456789abcdef")).toMatchObject({
      method: "dns_txt",
      hostname: "api.example.com",
      recordName: "_angelmind-verify.api.example.com",
      token: "0123456789abcdef0123456789abcdef",
    });
  });

  it("supports file, cloud-role, and authorization-letter instructions", () => {
    expect(buildVerificationInstructions("file_upload", "app.example.com", "0123456789abcdef0123456789abcdef").filename).toBe("angelmind-verification.txt");
    expect(buildVerificationInstructions("cloud_role", "app.example.com", "0123456789abcdef0123456789abcdef").summary).toContain("trust-policy");
    expect(buildVerificationInstructions("authorization_letter", "app.example.com", "0123456789abcdef0123456789abcdef").summary).toContain("PDF");
  });

  it("rejects malformed hostnames and tokens", () => {
    expect(() => buildVerificationInstructions("dns_txt", "localhost", "0123456789abcdef0123456789abcdef")).toThrow("valid DNS hostname");
    expect(() => buildVerificationInstructions("dns_txt", "app.example.com", "short")).toThrow("method or token is invalid");
  });

  it("requires proof for approval and a note for rejection", () => {
    expect(() => assertVerificationDecision({ decision: "verified" })).toThrow("proof reference or evidence artifact");
    expect(() => assertVerificationDecision({ decision: "rejected" })).toThrow("review note");
    expect(assertVerificationDecision({ decision: "verified", proofReference: "dns observation #12" })).toEqual({ proofReference: "dns observation #12", reviewNote: null });
  });
});
