import { GuardrailsCard } from "./guardrails-card";
import { PlatformCapabilitiesCard } from "./platform-capabilities-card";
import { PlatformNodesCard } from "./platform-nodes-card";

export function ModelsPlatformTab() {
  return (
    <div className="mt-0 space-y-6">
      <GuardrailsCard />
      <PlatformNodesCard />
      <PlatformCapabilitiesCard />
    </div>
  );
}
