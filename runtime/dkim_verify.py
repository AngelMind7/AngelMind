#!/usr/bin/env python3
from __future__ import annotations
import sys
from pathlib import Path
import dkim

if len(sys.argv) != 2:
    raise SystemExit("usage: dkim_verify.py EMAIL")
message = Path(sys.argv[1]).read_bytes()
print(f"message_bytes={len(message)}")
print(f"dkim_signature_present={b'DKIM-Signature:' in message or b'dkim-signature:' in message.lower()}")
try:
    print(f"dkim_valid={bool(dkim.verify(message))}")
except Exception as error:
    print(f"dkim_error={type(error).__name__}: {error}")
