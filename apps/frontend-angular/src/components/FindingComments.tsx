import { MessageSquare, Reply, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

type Comment = { id: number; parentCommentId: number | null; body: string; authorUserId: number; mentions: string; createdAt: Date };

export function FindingComments({ findingId, workspaceId }: { findingId: number; workspaceId: number }) {
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const comments = trpc.finding.comments.useQuery({ findingId, workspaceId });
  const add = trpc.finding.addComment.useMutation({
    onSuccess: () => { setBody(""); setReplyTo(null); utils.finding.comments.invalidate({ findingId, workspaceId }); toast.success("Comment saved to the review timeline."); },
    onError: error => toast.error(error.message),
  });
  const roots = useMemo(() => (comments.data ?? []).filter(comment => !comment.parentCommentId), [comments.data]);
  const children = useMemo(() => {
    const grouped = new Map<number, Comment[]>();
    for (const comment of (comments.data ?? []) as Comment[]) if (comment.parentCommentId) grouped.set(comment.parentCommentId, [...(grouped.get(comment.parentCommentId) ?? []), comment]);
    return grouped;
  }, [comments.data]);
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (body.trim()) add.mutate({ findingId, workspaceId, body, ...(replyTo ? { parentCommentId: replyTo } : {}) }); };
  const renderComment = (comment: Comment, nested = false) => <div key={comment.id} className={`${nested ? "ml-5 border-l-cyan-400/30" : ""} border-l-2 border-fuchsia-400/40 bg-white/[.02] p-3 text-xs leading-5 text-slate-300`}><p>{comment.body}</p><div className="mt-2 flex items-center justify-between gap-2"><p className="font-mono text-[9px] uppercase tracking-[.12em] text-slate-600">Reviewer #{comment.authorUserId}</p><Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-cyan-300" onClick={() => { setReplyTo(comment.id); setBody(""); }}><Reply className="mr-1 h-3 w-3" />Reply</Button></div>{children.get(comment.id)?.map(child => renderComment(child, true))}</div>;
  return <div className="mt-4 border-t border-cyan-300/10 pt-4"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-fuchsia-300" /><span className="font-mono text-[10px] uppercase tracking-[.14em] text-cyan-200">Review timeline</span></div><div className="mt-3 space-y-2">{roots.length ? roots.map(comment => renderComment(comment as Comment)) : <p className="text-xs text-slate-600">No review comments yet.</p>}</div><form className="mt-3 flex gap-2" onSubmit={submit}>{replyTo && <div className="absolute -mt-7 font-mono text-[9px] uppercase tracking-[.12em] text-cyan-300">Replying to comment #{replyTo}</div>}<Textarea value={body} onChange={event => setBody(event.target.value)} className="min-h-12" placeholder={replyTo ? "Add a threaded reply…" : "Add a review note…"} /><div className="flex flex-col gap-1"><Button type="submit" variant="outline" size="icon" disabled={add.isPending || !body.trim()} aria-label={replyTo ? "Add reply" : "Add comment"}><Send className="h-4 w-4" /></Button>{replyTo && <Button type="button" variant="ghost" size="sm" className="text-[10px]" onClick={() => { setReplyTo(null); setBody(""); }}>Cancel</Button>}</div></form></div>;
}
