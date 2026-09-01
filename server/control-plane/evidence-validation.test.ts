import { describe, expect, it } from "vitest";
import { validateEvidenceBytes } from "./evidence-validation";

describe("evidence byte validation", () => {
  it("accepts a valid PNG signature and dimensions", () => {
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
    png.writeUInt32BE(320, 16);
    png.writeUInt32BE(240, 20);
    expect(validateEvidenceBytes({ contentType: "image/png", fileName: "capture.png", bytes: png }).contentType).toBe("image/png");
  });

  it("rejects bytes that do not match a declared binary MIME", () => {
    expect(() => validateEvidenceBytes({ contentType: "application/pdf", fileName: "report.pdf", bytes: Buffer.from("not a pdf") })).toThrow(/bytes do not match/i);
  });

  it("rejects an extension that conflicts with the declared type", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() => validateEvidenceBytes({ contentType: "image/png", fileName: "capture.pdf", bytes: png })).toThrow(/extension/i);
  });

  it("keeps text evidence MIME-aware without requiring a binary signature", () => {
    expect(validateEvidenceBytes({ contentType: "text/plain; charset=utf-8", fileName: "notes.txt", bytes: Buffer.from("finding notes") }).contentType).toBe("text/plain");
  });

  it("rejects text evidence with an unsafe control-character ratio", () => {
    expect(() => validateEvidenceBytes({ contentType: "text/plain", fileName: "notes.txt", bytes: Buffer.from("\u0000\u0001\u0002\u0003\u0004\u0005") })).toThrow(/control-character/i);
  });

  it("rejects malformed ZIP archive structure", () => {
    const zip = Buffer.alloc(40);
    zip.writeUInt32LE(0x04034b50, 0);
    zip.writeUInt32LE(0x04034b50, 5);
    expect(() => validateEvidenceBytes({ contentType: "application/zip", fileName: "archive.zip", bytes: zip })).toThrow(/archive structure/i);
  });
});
