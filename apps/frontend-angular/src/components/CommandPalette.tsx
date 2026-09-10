import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { Activity, BarChart3, Boxes, BrainCircuit, FileSearch, FileText, LayoutDashboard, ScrollText, Settings2, ShieldCheck, ShieldEllipsis } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

const commands = [
  { path: "/", labelKey: "nav.commandCenter" as const, icon: LayoutDashboard, shortcut: "G D" },
  { path: "/mission", labelKey: "nav.operations" as const, icon: Activity, shortcut: "G M" },
  { path: "/coverage", labelKey: "nav.observability" as const, icon: BarChart3, shortcut: "G V" },
  { path: "/researcher", labelKey: "nav.commandCenter" as const, icon: BrainCircuit, shortcut: "G R" },
  { path: "/reports", labelKey: "nav.findings" as const, icon: FileText, shortcut: "G P" },
  { path: "/inventory", labelKey: "nav.workspaces" as const, icon: Boxes, shortcut: "G I" },
  { path: "/workspaces", labelKey: "nav.workspaces" as const, icon: Boxes, shortcut: "G W" },
  { path: "/governance", labelKey: "nav.governance" as const, icon: ShieldCheck, shortcut: "G G" },
  { path: "/findings", labelKey: "nav.findings" as const, icon: FileSearch, shortcut: "G F" },
  { path: "/audit", labelKey: "nav.audit" as const, icon: ScrollText, shortcut: "G A" },
  { path: "/operations", labelKey: "nav.observability" as const, icon: Activity, shortcut: "G O" },
  { path: "/operations-console", labelKey: "nav.operations" as const, icon: Settings2, shortcut: "G C" },
  { path: "/assurance", labelKey: "nav.assurance" as const, icon: ShieldEllipsis, shortcut: "G S" },
] as const;

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { t } = useLocale();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(value => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = (path: string) => {
    setOpen(false);
    setLocation(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Control plane command palette" description="Navigate the authenticated workspace">
      <CommandInput placeholder="Search workspace destinations…" />
      <CommandList>
        <CommandEmpty>No matching destination.</CommandEmpty>
        <CommandGroup heading={t("nav.controlPlane")}>
          {commands.map(({ path, labelKey, icon: Icon, shortcut }) => (
            <CommandItem key={path} onSelect={() => navigate(path)}>
              <Icon className="text-cyan-300" />
              <span>{t(labelKey)}</span>
              <CommandShortcut>{shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
