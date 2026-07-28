import * as vscode from "vscode";

export interface WebviewState {
  baseUrl: string;
  apiKey: string;
  dryRun: boolean;
  prune: boolean;
  includeImageModels: boolean;
  forceKeep: string[];
  configPath: string;
}

export function getWebviewContent(
  _webview: vscode.Webview,
  state: WebviewState
): string {
  const nonce = getNonce();
  const initialState = JSON.stringify(state).replace(/</g, "\\u003c");

  return /* html */ `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
  <title>Model Sync</title>
  <style nonce="${nonce}">
    :root {
      --ms-accent: var(--vscode-button-background);
      --ms-accent-fg: var(--vscode-button-foreground);
      --ms-accent-hover: var(--vscode-button-hoverBackground);
      --ms-bg: var(--vscode-sideBar-background);
      --ms-card: var(--vscode-editor-background);
      --ms-field: var(--vscode-input-background);
      --ms-field-border: var(--vscode-input-border, transparent);
      --ms-border: var(--vscode-widget-border, var(--vscode-panel-border));
      --ms-text: var(--vscode-foreground);
      --ms-dim: var(--vscode-descriptionForeground);
      --ms-ok: var(--vscode-testing-iconPassed, #73c991);
      --ms-err: var(--vscode-errorForeground, #f48771);
      --ms-warn: var(--vscode-editorWarning-foreground, #cca700);
      --ms-mono: var(--vscode-editor-font-family, "Cascadia Code", Consolas, monospace);
    }

    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }

    body {
      display: flex;
      flex-direction: column;
      color: var(--ms-text);
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      font-size: 13px;
      background:
        radial-gradient(120% 60% at 100% -10%,
          color-mix(in srgb, var(--ms-accent) 16%, transparent), transparent 60%),
        radial-gradient(90% 50% at -10% 110%,
          color-mix(in srgb, var(--ms-accent) 9%, transparent), transparent 55%),
        var(--ms-bg);
      background-attachment: fixed;
    }

    /* ── scroll region ───────────────────────────── */
    .scroll {
      flex: 1 1 auto;
      overflow-y: auto;
      padding: 14px 14px 6px;
      scrollbar-width: thin;
    }

    /* ── brand header ────────────────────────────── */
    .brand { display: flex; align-items: center; gap: 11px; margin-bottom: 16px; }
    .brand .mark {
      width: 38px; height: 38px; flex: none;
      display: grid; place-items: center;
      border-radius: 11px;
      color: var(--ms-accent-fg);
      background: linear-gradient(150deg,
        var(--ms-accent),
        color-mix(in srgb, var(--ms-accent) 55%, #000));
      box-shadow: 0 6px 18px -8px color-mix(in srgb, var(--ms-accent) 80%, transparent);
      animation: floaty 5s ease-in-out infinite;
    }
    .brand .mark svg { width: 21px; height: 21px; }
    .brand .titles { min-width: 0; }
    .brand h1 {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      line-height: 1;
    }
    .brand p {
      margin: 4px 0 0;
      font-size: 11px;
      color: var(--ms-dim);
      line-height: 1.3;
    }
    .chip {
      margin-left: auto; flex: none;
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 10px; letter-spacing: 0.04em;
      padding: 4px 9px; border-radius: 999px;
      border: 1px solid var(--ms-border);
      color: var(--ms-dim);
      background: color-mix(in srgb, var(--ms-card) 70%, transparent);
    }
    .chip .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ms-err); }
    .chip.on .dot { background: var(--ms-ok); box-shadow: 0 0 0 0 color-mix(in srgb, var(--ms-ok) 70%, transparent); animation: ping 2.4s ease-out infinite; }
    .chip.on { color: var(--ms-text); }

    /* ── cards / sections ────────────────────────── */
    .card {
      position: relative;
      background: color-mix(in srgb, var(--ms-card) 82%, transparent);
      border: 1px solid var(--ms-border);
      border-radius: 12px;
      padding: 13px 13px 14px;
      margin-bottom: 12px;
      backdrop-filter: blur(2px);
    }
    .card > h2 {
      display: flex; align-items: center; gap: 8px;
      margin: 0 0 12px;
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--ms-dim);
    }
    .card > h2::before {
      content: ""; width: 3px; height: 13px; border-radius: 2px;
      background: var(--ms-accent);
    }

    .field { margin-bottom: 11px; }
    .field:last-child { margin-bottom: 0; }
    .field label {
      display: block; margin-bottom: 5px;
      font-size: 11px; color: var(--ms-dim);
    }
    .inputrow { display: flex; gap: 6px; }
    input[type="text"], input[type="password"] {
      width: 100%;
      background: var(--ms-field);
      border: 1px solid var(--ms-field-border);
      border-radius: 8px;
      color: var(--ms-text);
      padding: 7px 10px;
      font-size: 12px;
      font-family: var(--ms-mono);
      outline: none;
      transition: border-color .15s, box-shadow .15s;
    }
    input::placeholder { color: color-mix(in srgb, var(--ms-dim) 80%, transparent); font-family: var(--vscode-font-family, sans-serif); }
    input:focus {
      border-color: var(--ms-accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--ms-accent) 22%, transparent);
    }

    .iconbtn {
      flex: none; width: 34px;
      display: grid; place-items: center;
      border: 1px solid var(--ms-field-border);
      border-radius: 8px;
      background: var(--ms-field);
      color: var(--ms-dim);
      cursor: pointer; font-size: 13px;
      transition: color .15s, transform .1s, background .15s;
    }
    .iconbtn:hover { color: var(--ms-text); background: color-mix(in srgb, var(--ms-accent) 14%, var(--ms-field)); }
    .iconbtn:active { transform: scale(.94); }
    .textbtn {
      flex: none; padding: 0 12px;
      border: 1px solid var(--ms-field-border);
      border-radius: 8px; background: var(--ms-field);
      color: var(--ms-text); cursor: pointer; font-size: 12px;
      transition: background .15s, transform .1s;
    }
    .textbtn:hover { background: color-mix(in srgb, var(--ms-accent) 14%, var(--ms-field)); }
    .textbtn:active { transform: scale(.97); }

    /* ── options ─────────────────────────────────── */
    .opt {
      display: flex; align-items: center; gap: 9px;
      padding: 7px 8px; border-radius: 8px; cursor: pointer;
      transition: background .15s;
    }
    .opt:hover { background: color-mix(in srgb, var(--ms-accent) 8%, transparent); }
    .opt input { accent-color: var(--ms-accent); width: 15px; height: 15px; cursor: pointer; }
    .opt span { font-size: 12px; }

    /* ── log ─────────────────────────────────────── */
    #log {
      min-height: 120px; max-height: 240px; overflow-y: auto;
      background: color-mix(in srgb, #000 18%, var(--ms-card));
      border: 1px solid var(--ms-border);
      border-radius: 10px;
      padding: 9px 10px;
      font-family: var(--ms-mono);
      font-size: 11px; line-height: 1.55;
      scrollbar-width: thin;
    }
    #log:empty::before {
      content: "Chưa có hoạt động. Nhấn “Đồng bộ ngay” để bắt đầu.";
      color: var(--ms-dim); font-style: italic;
      font-family: var(--vscode-font-family, sans-serif);
    }
    .line { white-space: pre-wrap; word-break: break-word; animation: rise .28s ease both; }
    .line.err { color: var(--ms-err); }
    .line.ok { color: var(--ms-ok); }
    .line.warn { color: var(--ms-warn); }
    .line.dim { color: var(--ms-dim); }

    /* ── sticky dock (sync button at the bottom) ─── */
    .dock {
      flex: none;
      padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
      border-top: 1px solid var(--ms-border);
      background: color-mix(in srgb, var(--ms-bg) 86%, transparent);
      backdrop-filter: blur(6px);
    }
    .statusline {
      display: flex; align-items: center; gap: 7px;
      font-size: 11px; color: var(--ms-dim);
      margin-bottom: 9px; min-height: 14px;
    }
    .statusline .pulse {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--ms-dim); flex: none;
    }
    .statusline.busy .pulse { background: var(--ms-warn); animation: ping 1.1s ease-out infinite; }
    .statusline.done .pulse { background: var(--ms-ok); }
    .statusline.fail .pulse { background: var(--ms-err); }

    .syncbtn {
      position: relative; overflow: hidden;
      width: 100%;
      padding: 12px 14px;
      border: none; border-radius: 11px;
      background: var(--ms-accent); color: var(--ms-accent-fg);
      font-size: 14px; font-weight: 700; letter-spacing: 0.02em;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 9px;
      box-shadow: 0 8px 22px -10px color-mix(in srgb, var(--ms-accent) 90%, transparent);
      transition: transform .12s, box-shadow .2s, background .2s;
    }
    .syncbtn:hover { background: var(--ms-accent-hover); transform: translateY(-1px); box-shadow: 0 12px 26px -10px color-mix(in srgb, var(--ms-accent) 95%, transparent); }
    .syncbtn:active { transform: translateY(0) scale(.99); }
    .syncbtn:disabled { opacity: .65; cursor: progress; transform: none; }
    .syncbtn .glyph { display: inline-block; transition: transform .4s; }
    .syncbtn:hover .glyph { transform: rotate(180deg); }
    .syncbtn::after {
      content: ""; position: absolute; top: 0; left: -60%;
      width: 40%; height: 100%;
      background: linear-gradient(100deg, transparent, color-mix(in srgb, #fff 35%, transparent), transparent);
      transform: skewX(-18deg);
    }
    .syncbtn:hover::after { animation: sheen .8s ease; }
    .syncbtn.busy .glyph { animation: spin .9s linear infinite; }

    .reloadbtn {
      width: 100%; margin-top: 8px;
      padding: 9px; border-radius: 10px; cursor: pointer;
      border: 1px dashed color-mix(in srgb, var(--ms-ok) 60%, transparent);
      background: color-mix(in srgb, var(--ms-ok) 12%, transparent);
      color: var(--ms-text); font-size: 12px; font-weight: 600;
      display: none; align-items: center; justify-content: center; gap: 7px;
      animation: rise .3s ease both;
      transition: background .15s;
    }
    .reloadbtn.show { display: flex; }
    .reloadbtn:hover { background: color-mix(in srgb, var(--ms-ok) 22%, transparent); }

    .secondary { display: flex; gap: 8px; margin-top: 8px; }
    .secondary button {
      flex: 1; padding: 7px; border-radius: 9px; cursor: pointer;
      border: 1px solid var(--ms-border);
      background: transparent; color: var(--ms-dim); font-size: 11px;
      transition: color .15s, border-color .15s, background .15s;
    }
    .secondary button:hover { color: var(--ms-text); border-color: var(--ms-accent); background: color-mix(in srgb, var(--ms-accent) 8%, transparent); }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes sheen { to { left: 130%; } }
    @keyframes rise { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
    @keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
    @keyframes ping { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 55%, transparent); } 70%,100% { box-shadow: 0 0 0 6px transparent; } }
  </style>
</head>
<body>
  <div class="scroll">
    <div class="brand">
      <div class="mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/>
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>
        </svg>
      </div>
      <div class="titles">
        <h1>Model&nbsp;Sync</h1>
        <p>Đồng bộ mô hình OpenAI-compatible vào VS&nbsp;Code</p>
      </div>
      <span class="chip" id="keyChip"><span class="dot"></span><span id="keyChipText">chưa có key</span></span>
    </div>

    <section class="card">
      <h2>Kết nối</h2>
      <div class="field">
        <label for="baseUrl">Máy chủ (Base URL)</label>
        <input type="text" id="baseUrl" placeholder="https://dc-ai.dabeecao.org" />
      </div>
      <div class="field">
        <label for="apiKey">Khoá API</label>
        <div class="inputrow">
          <input type="password" id="apiKey" placeholder="sk-xxxx" />
          <button class="iconbtn" id="toggleKey" title="Hiện / ẩn khoá">👁</button>
        </div>
      </div>
      <div class="field">
        <label for="configPath">Đường dẫn cấu hình</label>
        <div class="inputrow">
          <input type="text" id="configPath" />
          <button class="textbtn" id="browse">Chọn…</button>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Tuỳ chọn</h2>
      <label class="opt"><input type="checkbox" id="dryRun" /><span>Chạy thử (dry run) — chỉ xem trước</span></label>
      <label class="opt"><input type="checkbox" id="prune" checked /><span>Dọn mô hình cũ không còn trên máy chủ</span></label>
      <label class="opt"><input type="checkbox" id="includeImageModels" /><span>Gồm cả mô hình tạo ảnh</span></label>
      <div class="field" style="margin-top:10px">
        <label for="forceKeep">Giữ cố định (cách nhau bằng khoảng trắng)</label>
        <input type="text" id="forceKeep" placeholder="model-id-1 model-id-2" />
      </div>
    </section>

    <section class="card">
      <h2>Nhật ký</h2>
      <div id="log"></div>
    </section>
  </div>

  <div class="dock">
    <div class="statusline" id="status"><span class="pulse"></span><span id="statusText">Sẵn sàng</span></div>
    <button class="syncbtn" id="syncBtn"><span class="glyph">⟳</span><span id="syncLabel">Đồng bộ ngay</span></button>
    <button class="reloadbtn" id="reloadBtn">↻ Tải lại cửa sổ để áp dụng</button>
    <div class="secondary">
      <button id="saveBtn">💾 Lưu cài đặt</button>
      <button id="clearBtn">🗑 Xoá nhật ký</button>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const $ = (id) => document.getElementById(id);
    const logBox = $("log");

    function ts() { return new Date().toLocaleTimeString([], { hour12: false }); }
    function levelOf(m) {
      if (/^ERROR/i.test(m)) return "err";
      if (/^Wrote|saved|Reload|applied/i.test(m) || /\\bWrote\\b/.test(m)) return "ok";
      if (/Dry run|Filtered|Prune disabled|No provider/i.test(m)) return "warn";
      if (/^\\s+[-+~]/.test(m)) return "dim";
      return "";
    }
    function log(msg) {
      const line = document.createElement("div");
      line.className = "line " + levelOf(msg);
      line.textContent = "[" + ts() + "] " + msg;
      logBox.appendChild(line);
      logBox.scrollTop = logBox.scrollHeight;
    }

    function readState() {
      return {
        baseUrl: $("baseUrl").value.trim(),
        apiKey: $("apiKey").value.trim(),
        dryRun: $("dryRun").checked,
        prune: $("prune").checked,
        includeImageModels: $("includeImageModels").checked,
        forceKeep: $("forceKeep").value.trim().split(/\\s+/).filter(Boolean),
        configPath: $("configPath").value.trim(),
      };
    }
    function refreshKeyChip(apiKey) {
      const on = !!apiKey;
      $("keyChip").classList.toggle("on", on);
      $("keyChipText").textContent = on ? "đã có key" : "chưa có key";
    }
    function applyState(s) {
      $("baseUrl").value = s.baseUrl || "";
      $("apiKey").value = s.apiKey || "";
      $("dryRun").checked = !!s.dryRun;
      $("prune").checked = s.prune !== false;
      $("includeImageModels").checked = !!s.includeImageModels;
      $("forceKeep").value = (s.forceKeep || []).join(" ");
      $("configPath").value = s.configPath || "";
      refreshKeyChip(s.apiKey);
    }
    function setStatus(text, kind) {
      const el = $("status");
      el.className = "statusline" + (kind ? " " + kind : "");
      $("statusText").textContent = text;
    }
    function setBusy(busy) {
      const btn = $("syncBtn");
      btn.disabled = busy;
      btn.classList.toggle("busy", busy);
      $("syncLabel").textContent = busy ? "Đang đồng bộ…" : "Đồng bộ ngay";
    }

    $("toggleKey").addEventListener("click", () => {
      const inp = $("apiKey");
      inp.type = inp.type === "password" ? "text" : "password";
      $("toggleKey").textContent = inp.type === "password" ? "👁" : "🙈";
    });
    $("apiKey").addEventListener("input", () => refreshKeyChip($("apiKey").value.trim()));
    $("browse").addEventListener("click", () => vscode.postMessage({ command: "browse" }));
    $("clearBtn").addEventListener("click", () => { logBox.innerHTML = ""; });
    $("saveBtn").addEventListener("click", () => {
      vscode.postMessage({ command: "save", state: readState() });
    });
    $("syncBtn").addEventListener("click", () => {
      $("reloadBtn").classList.remove("show");
      vscode.postMessage({ command: "sync", state: readState() });
    });
    $("reloadBtn").addEventListener("click", () => vscode.postMessage({ command: "reload" }));

    window.addEventListener("message", (ev) => {
      const m = ev.data;
      switch (m.command) {
        case "init": applyState(m.state); break;
        case "configPath": $("configPath").value = m.path; break;
        case "saved": log("Đã lưu cài đặt."); setStatus("Đã lưu cài đặt", "done"); break;
        case "log": log(m.message); break;
        case "syncStart":
          setBusy(true); setStatus("Đang đồng bộ…", "busy");
          $("reloadBtn").classList.remove("show"); break;
        case "syncEnd":
          setBusy(false);
          if (m.success) {
            setStatus("Xong · +" + m.added + "  ~" + m.updated + "  −" + m.removed, "done");
            if (!m.dryRun) $("reloadBtn").classList.add("show");
          } else {
            setStatus("Thất bại: " + (m.error || "lỗi không xác định"), "fail");
          }
          break;
      }
    });

    applyState(${initialState});
    vscode.postMessage({ command: "ready" });
  </script>
</body>
</html>`;
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
