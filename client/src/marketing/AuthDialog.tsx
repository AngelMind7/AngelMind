import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { registerWithEmail, resetPassword, signInWithEmail } from "@/firebase";
import { useState } from "react";

type AuthMode = "signin" | "register" | "reset";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: () => void;
};

function readableAuthError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  if (
    code === "auth/invalid-credential" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password"
  )
    return "Email atau password tidak valid.";
  if (code === "auth/email-already-in-use")
    return "Email tersebut sudah terdaftar.";
  if (code === "auth/weak-password") return "Password minimal 6 karakter.";
  if (code === "auth/invalid-email") return "Format email tidak valid.";
  if (error instanceof Error && error.message.includes("not configured"))
    return "Konfigurasi Firebase belum tersedia di environment ini.";
  return error instanceof Error
    ? error.message
    : "Autentikasi gagal. Coba lagi.";
}

export function AuthDialog({ open, onOpenChange, onAuthenticated }: Props) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "reset") {
        await resetPassword(email);
        setNotice(
          "Link reset password sudah dikirim jika email tersebut terdaftar."
        );
      } else if (mode === "register") {
        await registerWithEmail(email, password);
        setNotice(
          "Akun dibuat. Cek inbox untuk verifikasi email sebelum masuk."
        );
        setMode("signin");
        setPassword("");
      } else {
        await signInWithEmail(email, password);
        onOpenChange(false);
        onAuthenticated();
      }
    } catch (submissionError) {
      setError(readableAuthError(submissionError));
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "reset"
      ? "Reset password"
      : mode === "register"
        ? "Buat akun AngelMind"
        : "Masuk ke AngelMind";
  const description =
    mode === "reset"
      ? "Kami akan mengirim instruksi pemulihan ke email kamu."
      : "Gunakan email terverifikasi untuk mengakses control plane.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-cyan-300/20 bg-[#0b1020] text-slate-100">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label
            className="block text-sm text-slate-300"
            htmlFor="angelmind-auth-email"
          >
            Email
          </label>
          <Input
            id="angelmind-auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            disabled={busy}
            placeholder="you@company.com"
          />
          {mode !== "reset" && (
            <>
              <label
                className="block text-sm text-slate-300"
                htmlFor="angelmind-auth-password"
              >
                Password
              </label>
              <Input
                id="angelmind-auth-password"
                type="password"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                value={password}
                onChange={event => setPassword(event.target.value)}
                disabled={busy}
                minLength={6}
              />
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-cyan-200">
              {notice}
            </p>
          )}
        </div>
        <DialogFooter className="items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-xs text-cyan-200">
            {mode !== "signin" && (
              <button
                type="button"
                className="underline-offset-4 hover:underline"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setNotice(null);
                }}
              >
                Sign in
              </button>
            )}
            {mode === "signin" && (
              <>
                <button
                  type="button"
                  className="underline-offset-4 hover:underline"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                    setNotice(null);
                  }}
                >
                  Create account
                </button>
                <button
                  type="button"
                  className="underline-offset-4 hover:underline"
                  onClick={() => {
                    setMode("reset");
                    setError(null);
                    setNotice(null);
                  }}
                >
                  Forgot password?
                </button>
              </>
            )}
          </div>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={
              busy || !email.trim() || (mode !== "reset" && password.length < 6)
            }
            className="neon-button"
          >
            {busy
              ? "Processing…"
              : mode === "reset"
                ? "Send reset link"
                : mode === "register"
                  ? "Register"
                  : "Sign in"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
