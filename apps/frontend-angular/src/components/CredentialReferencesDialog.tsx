import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CredentialReferencesDialog({ workspaceId, workspaceName }: { workspaceId: number; workspaceName: string }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [reference, setReference] = useState("");
  const references = trpc.workspace.credentials.useQuery({ workspaceId }, { enabled: open });
  const utils = trpc.useUtils();
  const addReference = trpc.workspace.addCredentialReference.useMutation({
    onSuccess: () => { utils.workspace.credentials.invalidate({ workspaceId }); setLabel(""); setReference(""); toast.success("Credential reference recorded without storing a secret value."); },
    onError: error => toast.error(error.message),
  });
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" size="sm"><KeyRound className="mr-2 h-3.5 w-3.5" />Credential refs</Button></DialogTrigger><DialogContent className="border-cyan-400/30 bg-[#070914] text-cyan-50"><DialogHeader><DialogTitle className="font-display text-2xl text-fuchsia-300">Credential references</DialogTitle><DialogDescription className="text-slate-400">{workspaceName} accepts only a namespaced secret reference such as <code>secret://workspace-{workspaceId}/service-token</code>. Secret values are never entered, stored, or displayed here.</DialogDescription></DialogHeader><form className="mt-2 grid gap-3" onSubmit={event => { event.preventDefault(); addReference.mutate({ workspaceId, label, secretReference: reference }); }}><Input required value={label} onChange={event => setLabel(event.target.value)} placeholder="Credential label" /><Input required value={reference} onChange={event => setReference(event.target.value)} placeholder={`secret://workspace-${workspaceId}/service-token`} /><Button className="neon-button" type="submit" disabled={addReference.isPending}><Plus className="mr-2 h-4 w-4" />Record reference</Button></form><div className="mt-4 border-t border-cyan-300/15 pt-4"><p className="font-mono text-[10px] uppercase tracking-[.14em] text-cyan-300">Recorded references</p><div className="mt-3 space-y-2">{references.data?.length ? references.data.map(item => <div key={item.id} className="border border-cyan-300/10 p-3"><p className="text-sm text-slate-200">{item.label}</p><p className="mt-1 break-all font-mono text-[10px] text-slate-500">{item.secretReference}</p></div>) : <p className="py-4 text-sm text-slate-500">No reference recorded for this workspace.</p>}</div></div></DialogContent></Dialog>;
}
