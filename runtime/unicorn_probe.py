#!/usr/bin/env python3
from __future__ import annotations
import sys
from unicorn import Uc, UC_ARCH_X86, UC_MODE_64

if len(sys.argv) != 2:
    raise SystemExit("usage: unicorn_probe.py INPUT")
with open(sys.argv[1], "rb") as handle:
    data = handle.read(4096)
print(f"artifact_bytes={len(data)}")
print(f"unicorn_arch={UC_ARCH_X86}")
print(f"unicorn_mode={UC_MODE_64}")
Uc(UC_ARCH_X86, UC_MODE_64).emu_stop()
print("emulator_initialized=true")
