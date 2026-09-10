import { cn } from "@/lib/utils";

export function NeonFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("neon-frame", className)}>{children}</section>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">// {children}</p>;
}
