import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

type FindingRemediationProps = {
  finding: {
    id: number;
    revision: number;
    status: string;
    remediationDeadline: Date | null;
    remediationOwnerUserId: number | null;
    remediationNotes: string | null;
  };
};

function toDateInput(value: Date | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function FindingRemediation({ finding }: FindingRemediationProps) {
  const utils = trpc.useUtils();
  const [deadline, setDeadline] = useState(() => toDateInput(finding.remediationDeadline));
  const [ownerUserId, setOwnerUserId] = useState(finding.remediationOwnerUserId ? String(finding.remediationOwnerUserId) : "");
  const [notes, setNotes] = useState(finding.remediationNotes ?? "");
  const update = trpc.finding.updateRemediation.useMutation({
    onSuccess: () => {
      void utils.finding.list.invalidate();
      toast.success("Remediation plan saved.");
    },
    onError: error => toast.error(error.message),
  });

  const save = () => {
    update.mutate({
      findingId: finding.id,
      expectedRevision: finding.revision,
      remediationDeadline: deadline ? new Date(`${deadline}T23:59:59.000Z`) : null,
      remediationOwnerUserId: ownerUserId ? Number(ownerUserId) : null,
      remediationNotes: notes.trim() || null,
    });
  };

  return (
    <div className="mt-4 border-t border-fuchsia-300/10 pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-fuchsia-200">Remediation tracking</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Persist an owner, deadline, and evidence-oriented remediation note. The owner must belong to this workspace.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input aria-label="Remediation deadline" type="date" value={deadline} onChange={event => setDeadline(event.target.value)} />
          <Input aria-label="Remediation owner user ID" type="number" min="1" value={ownerUserId} onChange={event => setOwnerUserId(event.target.value)} placeholder="Owner user ID" />
        </div>
      </div>
      <Textarea className="mt-3" aria-label="Remediation notes" value={notes} onChange={event => setNotes(event.target.value)} maxLength={20_000} placeholder="Remediation plan, validation criteria, and customer communication notes" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500">Current state: {finding.status}</span>
        <Button size="sm" variant="outline" onClick={save} disabled={update.isPending}>{update.isPending ? "Saving…" : "Save remediation"}</Button>
      </div>
    </div>
  );
}
