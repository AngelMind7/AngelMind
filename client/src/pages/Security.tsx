import { Eyebrow, NeonFrame } from "@/components/NeonFrame";
import { LocalizedDate } from "@/components/LocalizedDate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Clock3, Copy, Download, FileLock2, KeyRound, Laptop2, Plus, RefreshCw, ShieldCheck, Smartphone, UserRound, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function getBrowserFingerprint() {
  const key = "angelmind-device-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = window.crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
}

function platformIcon(platform: string) {
  return platform === "ios" || platform === "android" ? Smartphone : Laptop2;
}

export default function Security() {
  const security = trpc.auth.security.useQuery();
  const me = trpc.auth.me.useQuery();
  const apiKeys = trpc.auth.apiKeys.useQuery();
  const privacyRequests = trpc.auth.privacyRequests.useQuery();
  const utils = trpc.useUtils();
  const [apiKeyName, setApiKeyName] = useState("");
  const [apiKeyScopes, setApiKeyScopes] = useState("read:workspace,read:findings");
  const [newSecret, setNewSecret] = useState<string>();
  const [privacyType, setPrivacyType] = useState<"export" | "delete" | "rectify">("export");
  const [privacyReason, setPrivacyReason] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [roleIntent, setRoleIntent] = useState("");
  const registerDevice = trpc.auth.registerDevice.useMutation({
    onSuccess: () => {
      void utils.auth.security.invalidate();
      toast.success("Browser ini terdaftar sebagai device tepercaya.");
    },
    onError: error => toast.error(error.message),
  });
  const revokeDevice = trpc.auth.revokeDevice.useMutation({
    onSuccess: () => {
      void utils.auth.security.invalidate();
      toast.success("Device berhasil dicabut.");
    },
    onError: error => toast.error(error.message),
  });
  const createApiKey = trpc.auth.createApiKey.useMutation({
    onSuccess: result => { setNewSecret(result.secret); setApiKeyName(""); void utils.auth.apiKeys.invalidate(); toast.success("API key dibuat. Secret hanya ditampilkan sekali."); },
    onError: error => toast.error(error.message),
  });
  const requestPrivacyAction = trpc.auth.requestPrivacyAction.useMutation({
    onSuccess: () => { setPrivacyReason(""); void utils.auth.privacyRequests.invalidate(); toast.success("Privacy request tercatat untuk diproses."); },
    onError: error => toast.error(error.message),
  });
  const [downloadRequestId, setDownloadRequestId] = useState<number>();
  const downloadPrivacyExport = async (requestId: number) => {
    setDownloadRequestId(requestId);
    try {
      const result = await utils.auth.downloadPrivacyExport.fetch({ requestId });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export belum dapat diunduh.");
    } finally {
      setDownloadRequestId(undefined);
    }
  };
  const revokeApiKey = trpc.auth.revokeApiKey.useMutation({
    onSuccess: () => { void utils.auth.apiKeys.invalidate(); toast.success("API key berhasil dicabut."); },
    onError: error => toast.error(error.message),
  });
  const saveOnboarding = trpc.auth.saveOnboarding.useMutation({
    onSuccess: () => {
      void utils.auth.security.invalidate();
      toast.success("Onboarding profile tersimpan.");
    },
    onError: error => toast.error(error.message),
  });

  const profile = security.data?.profile;
  const devices = security.data?.devices ?? [];
  const events = security.data?.events ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <Eyebrow>Identity / Account Security</Eyebrow>
        <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-[-.05em] text-white">Security Center</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Kelola identitas Firebase, device yang dipercaya, onboarding, dan jejak aktivitas akun dari satu control surface. Credential sensitif tidak pernah ditampilkan di browser.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <NeonFrame className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Eyebrow>Account identity</Eyebrow>
              <h2 className="mt-2 font-display text-2xl font-bold text-white">{me.data?.name || "Firebase account"}</h2>
              <p className="mt-2 text-sm text-slate-400">{me.data?.email || "Verified identity pending"}</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10"><UserRound className="h-5 w-5 text-cyan-200" /></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/[.02] p-3"><p className="text-[10px] uppercase tracking-[.16em] text-slate-500">Provider</p><p className="mt-2 text-sm font-semibold text-white">Firebase Auth</p></div>
            <div className="rounded-lg border border-white/10 bg-white/[.02] p-3"><p className="text-[10px] uppercase tracking-[.16em] text-slate-500">Role</p><p className="mt-2 text-sm font-semibold text-white">{me.data?.role || "user"}</p></div>
            <div className="rounded-lg border border-white/10 bg-white/[.02] p-3"><p className="text-[10px] uppercase tracking-[.16em] text-slate-500">Database</p><p className="mt-2 text-sm font-semibold text-white">{security.data?.databaseAvailable ? "Connected" : "Unavailable"}</p></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => registerDevice.mutate({ fingerprint: getBrowserFingerprint(), label: "Current browser", platform: "web", userAgent: navigator.userAgent })} disabled={registerDevice.isPending}>
              <ShieldCheck className="mr-2 h-4 w-4" />{registerDevice.isPending ? "Registering…" : "Trust this browser"}
            </Button>
            <Button variant="outline" onClick={() => void security.refetch()} disabled={security.isFetching}><RefreshCw className="mr-2 h-4 w-4" />Refresh security data</Button>
          </div>
        </NeonFrame>

        <NeonFrame className="p-5 sm:p-6">
          <Eyebrow>Onboarding state</Eyebrow>
          <div className="mt-2 flex items-center justify-between gap-3"><h2 className="font-display text-2xl font-bold text-white">{profile?.status || "not_started"}</h2><Badge variant="outline" className="border-fuchsia-300/40 text-fuchsia-200">{profile?.currentStep || "profile"}</Badge></div>
          <p className="mt-3 text-sm leading-6 text-slate-500">Lengkapi konteks operator agar workspace pertama dapat dibuat dengan intent dan ownership yang jelas.</p>
          <div className="mt-5 space-y-4">
            <div className="space-y-2"><Label htmlFor="organization-name">Organization or team</Label><Input id="organization-name" value={organizationName} onChange={event => setOrganizationName(event.target.value)} placeholder="AngelMind Research" maxLength={160} /></div>
            <div className="space-y-2"><Label htmlFor="role-intent">Primary role</Label><Input id="role-intent" value={roleIntent} onChange={event => setRoleIntent(event.target.value)} placeholder="Security researcher" maxLength={80} /></div>
            <Button className="w-full" onClick={() => saveOnboarding.mutate({ status: "completed", currentStep: "complete", organizationName, roleIntent })} disabled={saveOnboarding.isPending}>{saveOnboarding.isPending ? "Saving…" : "Complete onboarding"}</Button>
          </div>
        </NeonFrame>
      </div>

      <NeonFrame className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><Eyebrow>Developer credentials</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">API keys</h2></div><KeyRound className="h-5 w-5 text-fuchsia-300" /></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[.8fr_1.2fr_auto]"><Input value={apiKeyName} onChange={event => setApiKeyName(event.target.value)} placeholder="Automation key name" maxLength={120} /><Input value={apiKeyScopes} onChange={event => setApiKeyScopes(event.target.value)} placeholder="read:workspace,read:findings" maxLength={400} /><Button disabled={apiKeyName.trim().length < 3 || createApiKey.isPending} onClick={() => createApiKey.mutate({ name: apiKeyName, scopes: apiKeyScopes.split(",").map(scope => scope.trim()).filter(Boolean) })}><Plus className="mr-2 h-4 w-4" />Create key</Button>
</div>
        {newSecret && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-amber-300/30 bg-amber-300/[.06] p-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-amber-200">Copy this secret now</p><code className="mt-2 block break-all text-xs text-amber-100">{newSecret}</code></div><Button variant="outline" onClick={() => { void navigator.clipboard?.writeText(newSecret); toast.success("Secret disalin."); }}><Copy className="mr-2 h-4 w-4" />Copy secret</Button></div>}
        <div className="mt-5 space-y-2">{apiKeys.data?.length ? apiKeys.data.map(key => <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-3" key={key.id}><div><p className="text-sm font-semibold text-white">{key.name}</p><p className="mt-1 text-xs text-slate-500">{key.prefix}… · scopes {key.scopes}</p></div><div className="flex items-center gap-2"><Badge variant="outline" className={key.status === "active" ? "border-emerald-300/40 text-emerald-200" : "border-rose-300/40 text-rose-200"}>{key.status}</Badge>{key.status === "active" && <Button variant="ghost" size="sm" onClick={() => revokeApiKey.mutate({ apiKeyId: key.id })}>Revoke</Button>}</div></div>) : <p className="text-sm text-slate-500">Belum ada API key.</p>}</div>
      </NeonFrame>

      <NeonFrame className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><Eyebrow>Privacy operations</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">Data requests</h2></div><FileLock2 className="h-5 w-5 text-cyan-300" /></div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[auto_1fr_auto]"><select aria-label="Privacy request type" value={privacyType} onChange={event => setPrivacyType(event.target.value as typeof privacyType)} className="h-10 border border-cyan-300/20 bg-[#0a0d19] px-3 text-sm text-slate-200"><option value="export">export my data</option><option value="rectify">rectify my data</option><option value="delete">request deletion</option></select><Input value={privacyReason} onChange={event => setPrivacyReason(event.target.value)} placeholder="Reason for this request" maxLength={20_000} /><Button disabled={privacyReason.trim().length < 3 || requestPrivacyAction.isPending} onClick={() => requestPrivacyAction.mutate({ requestType: privacyType, reason: privacyReason })}>Submit request</Button></div>
        <div className="mt-4 space-y-2">{privacyRequests.data?.slice(0, 5).map(request => <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 p-3" key={request.id}><div><p className="text-sm font-semibold text-white">{request.requestType}</p><p className="mt-1 text-xs text-slate-500">{request.reason}</p></div><div className="flex items-center gap-2"><Badge variant="outline" className="border-cyan-300/40 text-cyan-200">{request.status}</Badge>{request.requestType === "export" && request.status === "completed" && <Button variant="ghost" size="sm" onClick={() => void downloadPrivacyExport(request.id)} disabled={downloadRequestId === request.id}><Download className="mr-2 h-4 w-4" />{downloadRequestId === request.id ? "Preparing…" : "Download"}</Button>}</div></div>)}</div>
      </NeonFrame>

      <div className="grid gap-6 lg:grid-cols-2">
        <NeonFrame className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><Eyebrow>Trusted devices</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">{devices.length} registered</h2></div><KeyRound className="h-5 w-5 text-cyan-300" /></div>
          <div className="mt-5 space-y-3">{devices.length ? devices.map(device => { const Icon = platformIcon(device.platform); return <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[.02] p-3" key={device.id}><div className="flex min-w-0 items-center gap-3"><Icon className="h-4 w-4 shrink-0 text-cyan-300" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{device.label}</p><p className="mt-1 text-xs text-slate-500">{device.platform} · last seen <LocalizedDate value={device.lastSeenAt} /></p></div></div><div className="flex items-center gap-2"><Badge variant="outline" className={device.revokedAt ? "border-rose-300/40 text-rose-200" : "border-emerald-300/40 text-emerald-200"}>{device.revokedAt ? "revoked" : "trusted"}</Badge>{!device.revokedAt && <Button variant="ghost" size="icon" aria-label={`Revoke ${device.label}`} onClick={() => revokeDevice.mutate({ deviceId: device.id })} disabled={revokeDevice.isPending}><XCircle className="h-4 w-4 text-rose-300" /></Button>}</div></div>; }) : <div className="rounded-lg border border-dashed border-cyan-300/20 p-8 text-center"><Laptop2 className="mx-auto h-6 w-6 text-slate-500" /><p className="mt-3 text-sm text-slate-400">Belum ada device yang didaftarkan.</p></div>}</div>
        </NeonFrame>

        <NeonFrame className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><Eyebrow>Security event ledger</Eyebrow><h2 className="mt-2 font-display text-2xl font-bold text-white">Recent activity</h2></div><Clock3 className="h-5 w-5 text-fuchsia-300" /></div>
          <div className="mt-5 space-y-3">{events.length ? events.slice(0, 8).map(event => <div className="flex items-start justify-between gap-3 border-l-2 border-cyan-300/40 bg-cyan-300/[.03] p-3" key={event.id}><div><p className="text-sm font-semibold text-white">{event.eventType.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-500">{<LocalizedDate value={event.createdAt} />}</p></div><Badge variant="outline" className="border-cyan-300/30 text-cyan-200">recorded</Badge></div>) : <div className="rounded-lg border border-dashed border-cyan-300/20 p-8 text-center"><Clock3 className="mx-auto h-6 w-6 text-slate-500" /><p className="mt-3 text-sm text-slate-400">Belum ada security event.</p></div>}</div>
        </NeonFrame>
      </div>
    </div>
  );
}
