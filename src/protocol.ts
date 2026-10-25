export type Mode =
  | "docs-http"
  | "stdio-code"
  | "stdio-config"
  | "combined"
  | "exact-approval"
  | "accept-edits"
  | "startup-wait";
export type RunConfig = { mode: Mode };
export type ServerState = {
  name: string;
  status: string;
  source?: string;
  tools?: string[];
};
export type LabEvent =
  | { type: "options"; config: RunConfig; options: Record<string, unknown> }
  | { type: "configuration"; files: { name: string; contents: string }[] }
  | {
      type: "initialized";
      model: string;
      sessionId: string;
      tools: string[];
      servers: ServerState[];
      elapsedMs: number;
    }
  | { type: "connection"; servers: ServerState[]; elapsedMs: number }
  | { type: "message"; sdkType: string; summary: string }
  | { type: "tool"; name: string; args: unknown }
  | { type: "native-result"; isError: boolean; text: string }
  | { type: "answer"; text: string }
  | {
      type: "result";
      status: string;
      text: string;
      sessionId: string;
      costUsd: number;
    }
  | {
      type: "evidence";
      mode: Mode;
      availableTools: string[];
      initServers: ServerState[];
      connectedServers: ServerState[];
      attempts: string[];
      completed: string[];
      permissionRequests: string[];
      nativeResults: { isError: boolean; text: string }[];
      filesUnchanged: boolean;
      initElapsedMs: number;
      projectConfigUsed: boolean;
      serverDelayMs: number;
    }
  | { type: "notice" | "error"; text: string };
