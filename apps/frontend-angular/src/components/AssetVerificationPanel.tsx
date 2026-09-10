import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageState } from "@/components/PageState";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type VerificationMethod = "dns_txt" | "file_upload" | "cloud_role" | "authorization_letter";
type AssetVerificationPanelProps = { asset: { id: number; value: string; hostname: string | null; verificationStatus: string; inScope: number } };

const methodLabels: Record<VerificationMethod, string> = {
  dns_txt: "DNS TXT",
  file_upload: "File upload",
  cloud_role: "Cloud role",
  authorization_letter: "Authorization letter",
};

export function AssetVerificationPanel({ asset }: AssetVerificationPanelProps) {
  const utils = trpc.useUtils();
  const verifications = trpc.research.assetVerifications.useQuery({ assetId: asset.id });
  const [method, setMethod] = useState<VerificationMethod>("dns_txt");
  const [proofReference, setProofReference] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [challenge, setChallenge] = useState<{ verificationId: number; expiresAt: Date | string; instructions: { method: VerificationMethod; hostname: string; recordName?: string; filename?: string; token: string; summary: string } }>();
  const request = trpc.research.requestAssetVerification.useMutation({
    onSuccess: result => { setChallenge(result); void verifications.refetch(); toast.success("Verification challenge dibuat."); },
    onError: error => toast.error(error.message),
  });
  const submit = trpc.research.submitAssetVerification.useMutation({
    onSuccess: () => { setProofReference(""); void verifications.refetch(); void utils.research.assets.invalidate(); toast.success("Bukti dikirim untuk review."); },
    onError: error => toast.error(error.message),
  });
  const review = trpc.research.reviewAssetVerification.useMutation({
    onSuccess: result => { setReviewNote(""); void verifications.refetch(); void utils.research.assets.invalidate(); toast.success(result.decision === "verified" ? "Target verified." : "Verification ditolak."); },
    onError: error => toast.error(error.message),
  });
  const active = verifications.data?.find(item => item.status === "requested" || item.status === "pending_review");
  const expiresAt = challenge ? new Date(challenge.expiresAt) : null;

  if (!asset.inScope) return <PageState state="unauthorized" message="Asset di luar allowlist tidak dapat diverifikasi." />;
  if (asset.verificationStatus === "verified") return <PageState state="success"><div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[.04] p-3 text-sm text-emerald-100">Target verified. Tool execution masih mengikuti policy, approval, dan scope guard.</div></PageState>;

  return <div className="mt-4 space-y-3 rounded-lg border border-cyan-300/20 bg-cyan-300/[.03] p-4" aria-label={`Target verification for ${asset.value}`}>
    {verifications.isLoading ? <PageState state="loading" message="Loading verification history…" /> : verifications.isError ? <PageState state="error" message={verifications.error.message} onRetry={() => void verifications.refetch()} /> : null}
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-cyan-200">Target ownership verification</p><p className="mt-1 text-xs text-slate-400">{asset.hostname ?? asset.value} · status {asset.verificationStatus}</p></div><Badge variant="outline" className="border-amber-300/40 text-amber-200">manual review</Badge></div>
    {!active && <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><div><Label htmlFor={`verification-method-${asset.id}`}>Method</Label><select id={`verification-method-${asset.id}`} value={method} onChange={event => setMethod(event.target.value as VerificationMethod)} className="mt-2 h-10 w-full border border-cyan-300/20 bg-[#0a0d19] px-3 text-sm text-slate-200">{Object.entries(methodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><Button className="self-end" disabled={request.isPending} onClick={() => request.mutate({ assetId: asset.id, method })}>{request.isPending ? "Preparing…" : "Request challenge"}</Button></div>}
    {challenge && <div className="space-y-2 rounded border border-fuchsia-300/20 p-3"><p className="text-xs leading-5 text-slate-300">{challenge.instructions.summary}</p>{challenge.instructions.recordName && <p className="font-mono text-xs text-cyan-200">Record: {challenge.instructions.recordName}</p>}{challenge.instructions.filename && <p className="font-mono text-xs text-cyan-200">File: {challenge.instructions.filename}</p>}<p className="font-mono text-xs text-fuchsia-200">Token: {challenge.instructions.token}</p><p className="text-[11px] text-slate-500">Expires: {expiresAt?.toISOString() ?? "—"}</p></div>}
    {active && <div className="space-y-3"><div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-400">Active request #{active.id}</span><Badge variant="outline" className="border-cyan-300/40 text-cyan-200">{active.status}</Badge></div>{active.status === "requested" && <><Input aria-label="Verification proof reference" value={proofReference} onChange={event => setProofReference(event.target.value)} placeholder="TXT observation, file reference, ARN, or evidence reference" maxLength={512} /><Button disabled={proofReference.trim().length < 3 || submit.isPending} onClick={() => submit.mutate({ verificationId: active.id, proofReference })}>{submit.isPending ? "Submitting…" : "Submit proof for review"}</Button></>}{active.status === "pending_review" && <div className="space-y-2 rounded border border-amber-300/20 p-3"><p className="text-xs text-amber-100">Reviewer controls. Server akan menolak keputusan dari user yang tidak memiliki reviewer membership.</p><Input aria-label="Reviewer note" value={reviewNote} onChange={event => setReviewNote(event.target.value)} placeholder="Review note; wajib untuk rejection" maxLength={20_000} /><div className="flex flex-wrap gap-2"><Button disabled={review.isPending} onClick={() => review.mutate({ verificationId: active.id, decision: "verified", proofReference: active.proofReference ?? undefined, reviewNote })}>Approve verification</Button><Button variant="outline" disabled={review.isPending || reviewNote.trim().length < 1} onClick={() => review.mutate({ verificationId: active.id, decision: "rejected", reviewNote })}>Reject</Button></div></div>}</div>}
    {verifications.data?.length ? <div className="space-y-1 border-t border-white/10 pt-3"><p className="text-[11px] uppercase tracking-[.14em] text-slate-500">History</p>{verifications.data.slice(-3).reverse().map(item => <div className="flex items-center justify-between gap-2 text-xs" key={item.id}><span className="text-slate-400">{methodLabels[item.method as VerificationMethod] ?? item.method}</span><Badge variant="outline" className="border-white/20 text-slate-300">{item.status}</Badge></div>)}</div> : null}
  </div>;
}
