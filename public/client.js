import { renderMarkdown } from "./markdown.js";
const $ = (id) => document.getElementById(id);
const button = $("run"), rows = [];
const json = (id, value) => {
    $(id).textContent = JSON.stringify(value, null, 2);
    window.Prism?.highlightElement($(id));
};
const native = [];
function receive(e) {
    rows.push(e);
    if (e.type === "configuration") {
        const select = $("configuration-file");
        select.replaceChildren();
        e.files.forEach((file, i) => {
            const option = document.createElement("option");
            option.value = String(i);
            option.textContent = file.name;
            select.append(option);
        });
        const show = () => {
            json("configuration-content", JSON.parse(e.files[Number(select.value)].contents));
        };
        select.onchange = show;
        show();
    }
    if (e.type === "options")
        json("options", e.options);
    if (e.type === "initialized") {
        $("session").textContent = e.sessionId;
        json("init", e);
        json("discovery", {
            actualInitTools: e.tools.filter((name) => name.startsWith("mcp__")),
            serversAtInit: e.servers,
            elapsedMs: e.elapsedMs,
        });
    }
    if (e.type === "connection")
        json("connections", { servers: e.servers, elapsedMs: e.elapsedMs });
    if (e.type === "native-result") {
        native.push(e);
        json("native", native);
    }
    if (e.type === "answer")
        renderMarkdown($("answer"), e.text);
    if (e.type === "result") {
        $("status").textContent = e.status;
        $("cost").textContent = "$" + e.costUsd.toFixed(5);
        renderMarkdown($("answer"), e.text);
    }
    if (e.type === "evidence") {
        json("evidence", {
            mode: e.mode,
            completed: e.completed,
            permissionRequests: e.permissionRequests,
            filesUnchanged: e.filesUnchanged,
            projectConfigUsed: e.projectConfigUsed,
            serverDelayMs: e.serverDelayMs,
            initElapsedMs: e.initElapsedMs,
            initServers: e.initServers,
            connectedServers: e.connectedServers.map((s) => ({
                name: s.name,
                status: s.status,
                source: s.source,
            })),
            attempts: e.attempts,
        });
        const tr = document.createElement("tr");
        for (const value of [
            e.mode,
            e.connectedServers.map((s) => s.name + ": " + s.status).join(", "),
            e.completed.join(", ") || "No completed call",
            String(e.permissionRequests.length),
            String(e.initElapsedMs) + " ms",
        ]) {
            const td = document.createElement("td");
            td.textContent = value;
            tr.append(td);
        }
        $("history").append(tr);
    }
    if (e.type === "error" || e.type === "notice")
        $("notice").textContent = e.text;
    if (e.type === "error")
        $("status").textContent = "Could not finish";
    if (["message", "tool", "native-result", "result", "error"].includes(e.type)) {
        const li = document.createElement("li");
        li.textContent = JSON.stringify(e);
        $("events").append(li);
    }
}
button.onclick = async () => {
    button.disabled = true;
    native.length = 0;
    $("answer").replaceChildren();
    $("events").replaceChildren();
    $("notice").textContent = "";
    $("status").textContent = "Running…";
    for (const id of [
        "options",
        "init",
        "discovery",
        "connections",
        "native",
        "evidence",
    ])
        json(id, {});
    $("session").textContent = "—";
    $("cost").textContent = "—";
    const config = {
        mode: $("mode").value,
    };
    try {
        const response = await fetch("/api/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
        });
        if (!response.ok)
            throw new Error(await response.text());
        const reader = response.body.getReader(), decoder = new TextDecoder();
        let pending = "";
        while (true) {
            const { done, value } = await reader.read();
            pending += decoder.decode(value, { stream: !done });
            const lines = pending.split("\n");
            pending = lines.pop();
            for (const line of lines)
                if (line.trim())
                    receive(JSON.parse(line));
            if (done)
                break;
        }
        if ($("status").textContent === "Running…")
            $("status").textContent = "No final result";
    }
    catch (error) {
        $("status").textContent = "Could not finish";
        $("notice").textContent =
            error instanceof Error ? error.message : "Request failed.";
    }
    finally {
        button.disabled = false;
    }
};
$("download").onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "lesson24-observations.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
fetch("/api/config")
    .then((r) => r.json())
    .then((c) => {
    $("configuration").textContent = c.ready
        ? "Key configured on server · " + c.model
        : "Set your key in .env and restart.";
    button.disabled = !c.ready;
});
