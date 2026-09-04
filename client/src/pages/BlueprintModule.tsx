import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

const modules: Record<string, { title: string; description: string; items: string[] }> = {
  "/agents": { title: "Autonomous Workers", description: "Governed AI workers with budget, timeout, scope and approval controls.", items: ["Worker registry", "Model selection", "Budget and timeout", "Execution history"] },
  "/playbooks": { title: "Playbooks", description: "Versioned research workflows with explicit conditions and approval gates.", items: ["Versioned steps", "Conditions", "Approval gates", "Run history"] },
  "/evidence": { title: "Evidence Vault", description: "Evidence records with provenance, integrity metadata and chain-of-custody visibility.", items: ["Evidence index", "Confidence filters", "Origin chain", "Integrity metadata"] },
};

export default function BlueprintModule() {
  const [location] = useLocation();
  const config = Object.entries(modules).find(([prefix]) => location === prefix || location.startsWith(`${prefix}/`))?.[1] ?? modules["/evidence"];
  return (
    <main className="space-y-6 p-6" aria-labelledby="blueprint-module-title">
      <div className="flex flex-wrap items-center gap-3">
        <h1 id="blueprint-module-title" className="text-2xl font-semibold">{config.title}</h1>
        <Badge variant="outline">Blueprint V4</Badge>
        <Badge variant="secondary">Governed</Badge>
      </div>
      <p className="max-w-3xl text-muted-foreground">{config.description}</p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {config.items.map(item => (
          <Card key={item}>
            <CardHeader><CardTitle className="text-base">{item}</CardTitle></CardHeader>
            <CardContent><span className="text-sm text-muted-foreground">Ready for authenticated workspace integration.</span></CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
