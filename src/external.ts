import { mkdir, writeFile, readFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type {
  McpStdioServerConfig,
  McpServerConfig,
} from "@anthropic-ai/claude-agent-sdk";
import type { Mode, RunConfig } from "./protocol.js";
export const ROOT = fileURLToPath(new URL("../", import.meta.url));
export const DOCS_URL = "https://code.claude.com/docs/mcp";
export const DOCS_TOOL = "mcp__claude-code-docs__search_claude_code_docs";
export const MODES: Mode[] = [
  "docs-http",
  "stdio-code",
  "stdio-config",
  "combined",
  "exact-approval",
  "accept-edits",
  "startup-wait",
];
export function validateConfig(value: unknown): RunConfig {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !MODES.includes((value as RunConfig).mode)
  )
    throw new Error("Choose a listed external-MCP experiment.");
  return { mode: (value as RunConfig).mode };
}
export function filesystemConfig(
  cwd: string,
  delayed = false,
): McpStdioServerConfig {
  const server = resolve(
    ROOT,
    "node_modules/@modelcontextprotocol/server-filesystem/dist/index.js",
  );
  return {
    type: "stdio",
    command: process.execPath,
    args: delayed
      ? [resolve(ROOT, "scripts/delayed-filesystem.mjs"), server, cwd, "2000"]
      : [server, cwd],
    env: { ANTHROPIC_API_KEY: "" },
    alwaysLoad: true,
  };
}
export function approvals(mode: Mode) {
  if (mode === "accept-edits") return [];
  if (mode === "docs-http") return [DOCS_TOOL];
  if (mode === "combined")
    return ["mcp__claude-code-docs__*", "mcp__filesystem__list_directory"];
  return ["mcp__filesystem__list_directory"];
}
export function hostAllows(
  cwd: string,
  name: string,
  input: Record<string, unknown>,
) {
  if (name === DOCS_TOOL) return true;
  if (name === "mcp__filesystem__list_allowed_directories") return true;
  return (
    name === "mcp__filesystem__list_directory" &&
    typeof input.path === "string" &&
    resolve(input.path).toLowerCase() === cwd.toLowerCase()
  );
}
export async function prepareWorkspace(mode: Mode) {
  const root = resolve(
      realpathSync.native(tmpdir()),
      "claude-sdk24",
      randomUUID().slice(0, 12),
    ),
    cwd = resolve(root, "p"),
    home = resolve(root, "h"),
    sdkHome = resolve(root, "c");
  for (const path of [cwd, home, sdkHome])
    await mkdir(path, { recursive: true });
  const fixtures = {
    "welcome.txt": "Welcome to the Lesson 24 classroom. FILESYSTEM-24\n",
    "lesson-notes.md":
      "# External MCP\nUse stdio for a command and HTTP for a URL.\n",
  };
  for (const [name, contents] of Object.entries(fixtures))
    await writeFile(resolve(cwd, name), contents);
  const fs = filesystemConfig(cwd, mode === "startup-wait");
  const projectConfig = { mcpServers: { filesystem: fs } };
  if (mode === "stdio-config")
    await writeFile(
      resolve(cwd, ".mcp.json"),
      JSON.stringify(projectConfig, null, 2),
    );
  const docs: McpServerConfig = {
    type: "http",
    url: DOCS_URL,
    alwaysLoad: true,
  };
  const servers: Record<string, McpServerConfig> =
    mode === "docs-http"
      ? { "claude-code-docs": docs }
      : mode === "combined"
        ? { filesystem: fs, "claude-code-docs": docs }
        : mode === "stdio-config"
          ? {}
          : { filesystem: fs };
  const files = [
    { name: "Classroom fixtures", contents: JSON.stringify(fixtures, null, 2) },
    {
      name:
        mode === "stdio-config"
          ? ".mcp.json (actual generated file)"
          : "mcpServers (actual code configuration)",
      contents: JSON.stringify(
        mode === "stdio-config" ? projectConfig : servers,
        null,
        2,
      ),
    },
  ];
  return { cwd, home, sdkHome, servers, files, fixtures };
}
export async function fixturesUnchanged(
  cwd: string,
  fixtures: Record<string, string>,
) {
  return (
    await Promise.all(
      Object.entries(fixtures).map(
        async ([name, text]) =>
          (await readFile(resolve(cwd, name), "utf8")) === text,
      ),
    )
  ).every(Boolean);
}
