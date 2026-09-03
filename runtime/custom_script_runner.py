#!/usr/bin/env python3
"""Safe custom adapter for offline artifact metadata only.

This runner never executes input as code and never opens a network connection.
"""
import hashlib
import json
import os
import sys

MAX_BYTES = 2_000_000


def main() -> int:
    if len(sys.argv) != 2:
        print(json.dumps({"error": "exactly one artifact path is required"}))
        return 2
    path = os.path.realpath(sys.argv[1])
    if not os.path.isfile(path):
        print(json.dumps({"error": "artifact is not a regular file"}))
        return 2
    size = os.path.getsize(path)
    if size > MAX_BYTES:
        print(json.dumps({"error": "artifact exceeds size limit", "maxBytes": MAX_BYTES}))
        return 2
    with open(path, "rb") as handle:
        payload = handle.read(MAX_BYTES + 1)
    result = {
        "schema": "angelmind.custom-artifact.v1",
        "sizeBytes": len(payload),
        "sha256": hashlib.sha256(payload).hexdigest(),
        "binary": b"\x00" in payload,
        "utf8": True,
    }
    try:
        payload.decode("utf-8")
    except UnicodeDecodeError:
        result["utf8"] = False
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
