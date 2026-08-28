import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

export function FindingComments({ findingId, workspaceId }: { findingId: number; workspaceId: number }) {
  const [body, setBody] = useState("");
  const utils = trpc.useUtils();
  const comments = trpc.finding.comments.useQuery({ findingId, workspaceId });
  const add = trpc.finding.addComment.useMutation({ onSuccess: () => { setBody(""); utils.finding.comments.invalidate({ findingId, workspaceId }); toast.success("Comment saved to the review timeline."); }, onError: error => toast.error(error.message) });
  return <div className="mt-4 border-t border-cyan-300/10 pt-4"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-fuchsia-300" /><span className="font-mono text-[10px] uppercase tracking-[.14em] text-cyan-200">Review timeline</span></div><div className="mt-3 space-y-2">{comments.data?.length ? comments.data.map(comment => <div key={comment.id} className="border-l-2 border-fuchsia-400/40 bg-white/[.02] p-3 text-xs leading-5 text-slate-300">{comment.body}<p className="mt-2 font-mono text-[9px] uppercase tracking-[.12em] text-slate-600">Reviewer #{comment.authorUserId}</p></div>) : <p className="text-xs text-slate-600">No review comments yet.</p>}</div><form className="mt-3 flex gap-2" onSubmit={event => { event.preventDefault(); if (body.trim()) add.mutate({ findingId, workspaceId, body }); }}><Textarea value={body} onChange={event => setBody(event.target.value)} className="min-h-12" placeholder="Add a review note…" /><Button type="submit" variant="outline" size="icon" disabled={add.isPending || !body.trim()} aria-label="Add comment"><Send className="h-4 w-4" /></Button></form></div>;
}
