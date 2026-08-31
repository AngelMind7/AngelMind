#!/usr/bin/env python3
from __future__ import annotations
import sys
from capstone import Cs, CS_ARCH_X86, CS_MODE_64

if len(sys.argv) != 2:
    raise SystemExit("usage: capstone_inspect.py INPUT")
with open(sys.argv[1], "rb") as handle:
    data = handle.read(4096)
md = Cs(CS_ARCH_X86, CS_MODE_64)
for instruction in md.disasm(data, 0):
    print(f"0x{instruction.address:x}: {instruction.mnemonic} {instruction.op_str}")
