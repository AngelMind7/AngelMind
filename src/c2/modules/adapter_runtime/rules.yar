rule angelmind_elf_binary {
  meta:
    description = "Detects an ELF file signature for offline artifact triage"
    author = "AngelMind"
  condition:
    uint32(0) == 0x464c457f
}

rule angelmind_pe_binary {
  meta:
    description = "Detects a PE file signature for offline artifact triage"
    author = "AngelMind"
  condition:
    uint16(0) == 0x5a4d
}
