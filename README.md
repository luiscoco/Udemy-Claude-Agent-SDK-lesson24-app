# Claude Agent SDK · Lesson 24 · Connecting external MCP servers

Based on Lesson24_Connecting_External_MCP_Servers.pptx. Five linked student pages with large text and coloured code in every UML step.

## What you will learn

- Connect the official docs server: The HTTP experiment connects to the live Claude Code documentation MCP endpoint. The agent calls its real search tool and cites a returned source. Feedback submission is excluded by the host guard.
- Launch an external stdio process: The SDK launches the pinned official filesystem server using Node and an argument array. Only a fresh classroom folder is supplied as its allowed root. This is a separate process, unlike an in-process SDK server.
- Load a project .mcp.json: Compare inline mcpServers with a real generated .mcp.json. The project experiment enables settingSources: ["project"] and explicitly approves the controlled project server. The application’s real .env is outside that folder.
- Name and approve tools: Inspect actual mcp__ tool names. Compare an exact filesystem approval with an unapproved second call. The combined experiment also demonstrates a docs wildcard, limited to search by a separate host guard.
- Distinguish permissions from availability: acceptEdits does not pre-approve these MCP calls. This app denies unresolved permission requests and records what was attempted and completed. It does not use bypassPermissions.
- Observe actual connection state: Inspect mcp_servers at initialization and later mcpServerStatus() results. The startup experiment adds a labelled two-second server delay and an explicit wait setting. Measurements describe this run, not a universal startup time.

## Configure and run

```powershell
git clone https://github.com/luiscoco/Udemy-Claude-Agent-SDK-lesson24-app.git
cd .\Udemy-Claude-Agent-SDK-lesson24-app
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
npm start
```

From presentations use `cd .\agent-sdk\lesson24-external-mcp` instead of cloning. Open http://127.0.0.1:3124 and keep the terminal running. Node.js 24+, API credit, model access and internet are required. Windows may require Git Bash. No separate MCP server is needed.

## Create your .env file

Copy .env.example only if .env does not exist. Enter your key privately and restart after edits. The startup script loads this file; existing shell values take precedence.

```dotenv
ANTHROPIC_API_KEY=your_api_key
CLAUDE_MODEL=claude-sonnet-4-6
PORT=3124
# Optional on Windows: CLAUDE_CODE_GIT_BASH_PATH=C:/Program Files/Git/bin/bash.exe
```

No Managed Agents IDs are required. Real .env, media, private workspaces and dependencies are excluded from Git.

## Run the experiments

### Search the real docs and list a classroom folder

Run the HTTP and stdio experiments. Inspect actual fully qualified tool names, connection status and returned sources or filenames. The allowed root is a fresh classroom folder, not your entire computer.

```powershell
npm run sample:env -- docs-http
npm run sample:env -- stdio-code
```

### Load project config and combine transports

Project mode writes and loads an actual .mcp.json with project settings enabled. Combined mode connects both real servers in one session. No manual config edit is required for the classroom exercise.

```powershell
npm run sample:env -- stdio-config
npm run sample:env -- combined
```

### Compare approval and connection timing

Exact approval allows directory listing but denies an unapproved second tool. acceptEdits has no MCP pre-approval. Startup mode labels a two-second wrapper delay and reports actual elapsed initialization time.

```powershell
npm run sample:env -- exact-approval
npm run sample:env -- accept-edits
npm run sample:env -- startup-wait
npm test
```

## How the app was built

### 1. Validate the experiment

Accept one of the seven fixed tasks. The browser cannot supply arbitrary server commands, URLs or filesystem roots.

Source: `src/external.ts`, lines 32–34. Selected source; surrounding code omitted.

```typescript
return { mode: (value as RunConfig).mode };
}
export function filesystemConfig(
```

### 2. Declare the stdio command

Launch the pinned official filesystem server with an argument array and only the owned classroom root. The real model API key is not supplied to that process.

Source: `src/external.ts`, lines 44–49. Selected source; surrounding code omitted.

```typescript
command: process.execPath,
    args: delayed
      ? [resolve(ROOT, "scripts/delayed-filesystem.mjs"), server, cwd, "2000"]
      : [server, cwd],
    env: { ANTHROPIC_API_KEY: "" },
    alwaysLoad: true,
```

### 3. Declare the HTTP server

Connect to the real Claude Code docs MCP URL. This is an external HTTP service, distinct from both local stdio and an in-process SDK server.

Source: `src/external.ts`, lines 97–101. Selected source; surrounding code omitted.

```typescript
const docs: McpServerConfig = {
    type: "http",
    url: DOCS_URL,
    alwaysLoad: true,
  };
```

### 4. Write the project config

Write an actual .mcp.json into the fresh classroom project. Its filesystem server points only to that controlled folder.

Source: `src/external.ts`, lines 92–96. Selected source; surrounding code omitted.

```typescript
if (mode === "stdio-config")
    await writeFile(
      resolve(cwd, ".mcp.json"),
      JSON.stringify(projectConfig, null, 2),
    );
```

### 5. Enable the project setting source

The .mcp.json experiment includes the project source and explicitly approves its controlled project server. strictMcpConfig is disabled only for that experiment so project declarations can load.

Source: `src/agent.ts`, lines 58–61. Selected source; surrounding code omitted.

```typescript
settingSources: project ? ["project"] : [],
    settings: project ? { enableAllProjectMcpServers: true } : {},
    strictMcpConfig: !project,
    skills: [],
```

### 6. Approve the intended tool names

Use a fully qualified name for the docs search or a wildcard in the combined experiment. The separate host guard narrows actual actions to search and classroom listing.

Source: `src/external.ts`, lines 54–58. Selected source; surrounding code omitted.

```typescript
if (mode === "docs-http") return [DOCS_TOOL];
  if (mode === "combined")
    return ["mcp__claude-code-docs__*", "mcp__filesystem__list_directory"];
  return ["mcp__filesystem__list_directory"];
}
```

### 7. Start the real SDK query

Pass the chosen server declarations to query. The SDK spawns stdio processes or opens remote MCP connections and orchestrates model calls.

Source: `src/agent.ts`, lines 145–147. Selected source; surrounding code omitted.

```typescript
const run = query({ prompt: PROMPTS[c.mode](d.cwd), options });
  let text = "",
    status = "no_result",
```

### 8. Preserve initialization status

Initialization is a snapshot. Preserve the reported connection statuses and elapsed time instead of assuming every configured server has connected.

Source: `src/agent.ts`, lines 165–169. Selected source; surrounding code omitted.

```typescript
initServers = message.mcp_servers.map((s) => ({
          name: s.name,
          status: s.status,
        }));
        initElapsedMs = Math.round(performance.now() - started);
```

### 9. Poll current server state

Poll actual current status when needed and keep it distinct from the initialization snapshot. Tool lists and configuration source are visible when supplied by the runtime.

Source: `src/agent.ts`, lines 179–184. Selected source; surrounding code omitted.

```typescript
connectedServers = (await run.mcpServerStatus()).map((s) => ({
            name: s.name,
            status: s.status,
            source: s.source,
            tools: s.tools?.map((t) => t.name),
          }));
```

### 10. Observe the requested tool call

Inspect the actual model-requested MCP name and arguments. A discovered tool or prose answer alone does not establish successful execution.

Source: `src/agent.ts`, lines 202–204. Selected source; surrounding code omitted.

```typescript
if (block.type === "tool_use")
            emit({ type: "tool", name: block.name, args: block.input });
        }
```

### 11. Enforce the classroom boundary

The pre-tool hook records attempts and rejects unrelated operations. Native SDK permission rules and the callback then determine approval for allowed classroom targets.

Source: `src/agent.ts`, lines 87–92. Selected source; surrounding code omitted.

```typescript
attempts.push(input.tool_name);
              return hostAllows(
                d.cwd,
                input.tool_name,
                input.tool_input as Record<string, unknown>,
              )
```

### 12. Record actual completion

PostToolUse records completed calls separately from attempts and callback denials. Directory output comes from the external process and docs output from the real remote server.

Source: `src/agent.ts`, lines 110–112. Selected source; surrounding code omitted.

```typescript
if (input.hook_event_name === "PostToolUse")
                completed.push(input.tool_name);
              return {};
```

### 13. Render answers with evidence

Format and sanitize actual Markdown, including documentation links. Keep it beside actual connection status, permissions and tool-result evidence.

Source: `src/client.ts`, lines 47–49. Selected source; surrounding code omitted.

```typescript
if (e.type === "answer") renderMarkdown($("answer"), e.text);
  if (e.type === "result") {
    $("status").textContent = e.status;
```

## Reference topics and limits

- Read the UML as alternative paths: The diagram groups setup and alternative experiments. Code declarations, project config and the permission comparisons are not all executed by every query. Follow the selected mode and its trace.
- Installed server instead of startup downloads: The app uses pinned @modelcontextprotocol/server-filesystem and invokes its installed entry point with Node. This avoids downloading an unpinned package at every run and handles Windows paths as separate arguments.
- Connection timing is version-dependent: The presentation summarizes connection waits. Current runtime behavior also depends on named servers, tool-search deferral and cached discovery. This app explicitly sets a 6000 ms first-turn wait and alwaysLoad, preserves init status and polls actual current status. The two-second wrapper delay is a labelled classroom experiment, not a claim about default startup duration.
- Availability is not approval: The visible namespace does not mean every call can execute. Exact approval and acceptEdits experiments record actual denials. No bypassPermissions mode is used. The docs wildcard in Combined still passes through a separate search-only host guard.
- Controlled project settings: The generated .mcp.json loads with settingSources: ["project"], enableAllProjectMcpServers and strictMcpConfig: false in that mode only. Other experiments use code-only declarations and strict MCP configuration. These settings do not modify your existing home configuration.
- Transport references: stdio uses a command and arguments; HTTP uses a URL. Legacy SSE and JSON streamable-http aliases are reference topics here, not live experiments. In-process SDK servers were taught in Lessons 22 and 23; no in-process server substitutes for the external servers in this app.
- Authentication and cached discovery: OAuth and private remote credentials belong to the next lesson. The public docs endpoint used here needs no remote service credential. Each classroom run uses fresh local runtime directories, so this app does not claim to benchmark warmed discovery caches or demonstrate every timeout default.
- Read-only classroom behavior: The filesystem process is restricted to its supplied root, and the host allows only directory listing. The docs host guard rejects feedback and other tools. Original fixture bytes are checked after the run. These controls describe this application; they are not an operating-system sandbox.

## References

- [Custom tools: official SDK documentation](https://code.claude.com/docs/en/agent-sdk/custom-tools)
- [External MCP: official SDK documentation](https://code.claude.com/docs/en/agent-sdk/mcp)
- [Official MCP servers](https://github.com/modelcontextprotocol/servers)

Regenerate student pages with `python scripts/build-pages.py`. `npm test` checks classroom boundaries, server arguments, project config, approval selection and startup without paid model calls.
