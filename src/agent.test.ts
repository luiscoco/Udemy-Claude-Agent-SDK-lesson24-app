import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import {
  validateConfig,
  approvals,
  hostAllows,
  filesystemConfig,
  DOCS_TOOL,
  prepareWorkspace,
  fixturesUnchanged,
} from "./external.js";
test("fixed experiment selection rejects arbitrary servers and strips unrelated input", () => {
  assert.throws(() => validateConfig({ mode: "shell" }));
  assert.deepEqual(
    validateConfig({ mode: "stdio-code", command: "untrusted" }),
    { mode: "stdio-code" },
  );
});
test("host guard permits only listing the owned folder and docs search", () => {
  const cwd = resolve("classroom");
  assert.equal(
    hostAllows(cwd, "mcp__filesystem__list_directory", { path: cwd }),
    true,
  );
  assert.equal(
    hostAllows(cwd, "mcp__filesystem__list_directory", {
      path: resolve(cwd, ".."),
    }),
    false,
  );
  assert.equal(
    hostAllows(cwd, "mcp__filesystem__write_file", { path: cwd }),
    false,
  );
  assert.equal(hostAllows(cwd, DOCS_TOOL, { query: "hooks" }), true);
  assert.equal(
    hostAllows(cwd, "mcp__claude-code-docs__submit_feedback", {}),
    false,
  );
});
test("stdio command uses argument arrays and does not pass the real API key to the filesystem server", () => {
  const cfg = filesystemConfig(resolve("classroom"));
  assert.equal(cfg.command, process.execPath);
  assert.equal(cfg.args?.at(-1), resolve("classroom"));
  assert.equal(cfg.env?.ANTHROPIC_API_KEY, "");
});
test("exact approval and acceptEdits comparison do not pre-approve another MCP call", () => {
  assert.deepEqual(approvals("accept-edits"), []);
  assert.deepEqual(approvals("exact-approval"), [
    "mcp__filesystem__list_directory",
  ]);
  assert.equal(
    approvals("combined").includes("mcp__claude-code-docs__*"),
    true,
  );
});
test("project config is created in the fresh folder while code servers remain empty", async () => {
  const d = await prepareWorkspace("stdio-config");
  assert.deepEqual(d.servers, {});
  assert.match(d.files[1].contents, /filesystem/);
  assert.equal(await fixturesUnchanged(d.cwd, d.fixtures), true);
});
