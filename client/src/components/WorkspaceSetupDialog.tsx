import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const initialForm = {
  name: "",
  programName: "",
  safeHarbor: "",
  codeOfConduct: "No destructive testing, no data exfiltration, no social engineering, and no denial-of-service activity.",
  allowlist: "",
  exclusions: "",
  budget: "100",
  sessionLimit: "240",
  cooldown: "60",
  retention: "30",
};

export function WorkspaceSetupDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const utils = trpc.useUtils();
  const createWorkspace = trpc.workspace.create.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.workspace.list.invalidate(), utils.control.dashboard.invalidate()]);
      toast.success("Workspace terisolasi telah dibuat.");
      setForm(initialForm);
      setOpen(false);
    },
    onError: error => toast.error(error.message),
  });
  const update = (name: keyof typeof form, value: string) => setForm(current => ({ ...current, [name]: value }));
  const lines = (value: string) => value.split("\n").map(item => item.trim()).filter(Boolean);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    createWorkspace.mutate({
      name: form.name,
      programName: form.programName,
      safeHarbor: form.safeHarbor,
      codeOfConduct: form.codeOfConduct,
      allowlist: lines(form.allowlist),
      exclusions: lines(form.exclusions),
      budgetCents: Math.round(Number(form.budget || 0) * 100),
      sessionLimitMinutes: Number(form.sessionLimit),
      cooldownMinutes: Number(form.cooldown),
      retentionDays: Number(form.retention),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="neon-button gap-2"><Plus className="h-4 w-4" /> New workspace</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-cyan-400/30 bg-[#070914] text-cyan-50 shadow-[0_0_55px_rgba(34,211,238,.16)]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-tight text-fuchsia-300">Initialize protected workspace</DialogTitle>
          <DialogDescription className="text-slate-400">Scope, exclusions, safe harbor, conduct, budget, and retention are recorded before a rehearsal may begin.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-5 py-2" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Workspace label"><Input required value={form.name} onChange={event => update("name", event.target.value)} placeholder="Payments API" /></Field>
            <Field label="Program name"><Input required value={form.programName} onChange={event => update("programName", event.target.value)} placeholder="Authorized Program" /></Field>
          </div>
          <Field label="Safe-harbor record"><Textarea required minLength={10} value={form.safeHarbor} onChange={event => update("safeHarbor", event.target.value)} placeholder="Paste the authorized safe-harbor terms or approval reference." /></Field>
          <Field label="Code of conduct"><Textarea required minLength={10} value={form.codeOfConduct} onChange={event => update("codeOfConduct", event.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Scope allowlist — one hostname/pattern per line"><Textarea required value={form.allowlist} onChange={event => update("allowlist", event.target.value)} placeholder="app.example.com\n*.api.example.com" /></Field>
            <Field label="Scope exclusions — one hostname/pattern per line"><Textarea value={form.exclusions} onChange={event => update("exclusions", event.target.value)} placeholder="admin.example.com\n*.internal.example.com" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Budget (USD)"><Input required min="1" type="number" value={form.budget} onChange={event => update("budget", event.target.value)} /></Field>
            <Field label="Session minutes"><Input required min="5" type="number" value={form.sessionLimit} onChange={event => update("sessionLimit", event.target.value)} /></Field>
            <Field label="Cooldown minutes"><Input required min="0" type="number" value={form.cooldown} onChange={event => update("cooldown", event.target.value)} /></Field>
            <Field label="Retention days"><Input required min="1" type="number" value={form.retention} onChange={event => update("retention", event.target.value)} /></Field>
          </div>
          <div className="flex items-start gap-3 border border-cyan-400/20 bg-cyan-400/5 p-3 text-xs leading-5 text-slate-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
            <span>Every workspace is owner-scoped. This flow only creates records; it does not contact an external target, launch a testing capability, or store credential values.</span>
          </div>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button className="neon-button" disabled={createWorkspace.isPending} type="submit">{createWorkspace.isPending ? "Recording controls…" : "Create guarded workspace"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300">{label}</Label>{children}</label>;
}
