import { withNodeCopy } from "../lib/node-copy";

export interface EngineNode {
  id: string;
  name: string;
  description?: string;
  role?: string;
  configurable?: boolean;
  always_on?: boolean;
  flag: string;
  param?: { label: string; min: number; max: number };
  default?: string;
}

export interface NodesConfigResponse {
  nodes?: EngineNode[];
  capabilities?: EngineNode[];
  config?: Record<string, string>;
  video_api_key_configured?: boolean;
}

export function asNodesConfig(raw: unknown): NodesConfigResponse {
  if (!raw || typeof raw !== "object") return {};
  const data = raw as NodesConfigResponse;
  return {
    ...data,
    nodes: data.nodes?.map(withNodeCopy),
    capabilities: data.capabilities?.map(withNodeCopy),
  };
}
