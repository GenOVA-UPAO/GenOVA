import { GuardrailsCard } from "./guardrails-card";
import { PlatformCapabilitiesCard } from "./platform-capabilities-card";
import { PlatformNodesCard } from "./platform-nodes-card";

export function ModelsPlatformTab() {
  return (
    <div className="max-w-4xl space-y-10">
      <GuardrailsCard />
      <PlatformNodesCard />
      <PlatformCapabilitiesCard />
    </div>
  );
}
