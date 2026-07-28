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
      --ms-purple: #a855f7;
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
    .card-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px;
    }
    .card-header > h2, .card > h2 {
      display: flex; align-items: center; gap: 8px;
      margin: 0;
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--ms-dim);
    }
    .card-header > h2::before, .card > h2::before {
      content: ""; width: 3px; height: 13px; border-radius: 2px;
      background: var(--ms-accent);
    }

    .field { margin-bottom: 11px; }
    .field:last-child { margin-bottom: 0; }
    .field label {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 5px;
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
      flex: none; width: 34px; height: 34px;
      display: grid; place-items: center;
      border: 1px solid var(--ms-field-border);
      border-radius: 8px;
      background: var(--ms-field);
      color: var(--ms-dim);
      cursor: pointer;
      transition: color .15s, transform .1s, background .15s;
    }
    .iconbtn svg { width: 15px; height: 15px; }
    .iconbtn:hover { color: var(--ms-text); background: color-mix(in srgb, var(--ms-accent) 14%, var(--ms-field)); }
    .iconbtn:active { transform: scale(.94); }

    .textbtn {
      flex: none; padding: 0 10px; height: 34px;
      display: inline-flex; align-items: center; gap: 6px;
      border: 1px solid var(--ms-field-border);
      border-radius: 8px; background: var(--ms-field);
      color: var(--ms-text); cursor: pointer; font-size: 11px; font-weight: 500;
      transition: background .15s, transform .1s;
    }
    .textbtn svg { width: 13px; height: 13px; }
    .textbtn:hover { background: color-mix(in srgb, var(--ms-accent) 14%, var(--ms-field)); }
    .textbtn:active { transform: scale(.97); }

    /* ── options ─────────────────────────────────── */
    .opt {
      display: flex; align-items: flex-start; gap: 9px;
      padding: 7px 8px; border-radius: 8px; cursor: pointer;
      transition: background .15s;
    }
    .opt:hover { background: color-mix(in srgb, var(--ms-accent) 8%, transparent); }
    .opt input { accent-color: var(--ms-accent); width: 15px; height: 15px; cursor: pointer; margin-top: 2px; }
    .opt-label { display: flex; flex-direction: column; }
    .opt-title { font-size: 12px; font-weight: 500; }
    .opt-sub { font-size: 10px; color: var(--ms-dim); margin-top: 2px; }

    /* ── sync summary dashboard & model breakdown ───── */
    .test-status {
      font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: none;
    }
    .test-status.ok { display: inline; color: var(--ms-ok); background: color-mix(in srgb, var(--ms-ok) 15%, transparent); }
    .test-status.err { display: inline; color: var(--ms-err); background: color-mix(in srgb, var(--ms-err) 15%, transparent); }

    .search-box {
      margin-bottom: 10px; position: relative;
    }
    .search-box input {
      padding-left: 28px; font-family: var(--vscode-font-family, sans-serif); font-size: 11px;
    }
    .search-box svg {
      position: absolute; left: 9px; top: 9px; width: 13px; height: 13px; color: var(--ms-dim); pointer-events: none;
    }

    .stats-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px;
    }
    .stat-card {
      background: color-mix(in srgb, var(--ms-card) 95%, transparent);
      border: 1px solid var(--ms-border); border-radius: 9px;
      padding: 8px 4px; text-align: center;
      transition: transform .12s, border-color .15s;
    }
    .stat-card:hover { transform: translateY(-1px); border-color: color-mix(in srgb, var(--ms-accent) 40%, transparent); }
    .stat-card .num { font-size: 15px; font-weight: 800; line-height: 1.1; }
    .stat-card .label { font-size: 9px; color: var(--ms-dim); margin-top: 3px; text-transform: uppercase; letter-spacing: 0.04em; }

    .stat-card.added .num { color: var(--ms-ok); }
    .stat-card.updated .num { color: var(--ms-warn); }
    .stat-card.removed .num { color: var(--ms-err); }
    .stat-card.filtered .num { color: var(--ms-purple); }

    .model-group { margin-bottom: 10px; }
    .model-group:last-child { margin-bottom: 0; }
    .group-header {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700; color: var(--ms-dim);
      margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .group-header svg { width: 13px; height: 13px; }

    .model-chips {
      display: flex; flex-wrap: wrap; gap: 5px;
    }
    .model-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 8px; border-radius: 8px;
      font-size: 11px; font-weight: 600;
      border: 1px solid transparent;
      box-shadow: 0 2px 6px -3px rgba(0,0,0,0.1);
      transition: transform .12s, background .15s;
    }
    .model-pill:hover { transform: translateY(-1px); }
    .model-pill .slug { font-size: 9px; opacity: 0.7; font-weight: 400; font-family: var(--ms-mono); margin-left: 2px; }

    .model-badges { display: inline-flex; gap: 3px; margin-left: 2px; }
    .spec-badge {
      font-size: 8px; font-weight: 700; padding: 1px 4px; border-radius: 3px;
      text-transform: uppercase; letter-spacing: 0.02em;
    }
    .spec-badge.vision { background: color-mix(in srgb, #3b82f6 22%, transparent); color: #60a5fa; }
    .spec-badge.tools { background: color-mix(in srgb, #eab308 22%, transparent); color: #fde047; }
    .spec-badge.ctx { background: color-mix(in srgb, #a855f7 22%, transparent); color: #c084fc; }

    .model-pill.added {
      background: color-mix(in srgb, var(--ms-ok) 14%, transparent);
      border-color: color-mix(in srgb, var(--ms-ok) 35%, transparent);
      color: var(--ms-text);
    }
    .model-pill.updated {
      background: color-mix(in srgb, var(--ms-warn) 14%, transparent);
      border-color: color-mix(in srgb, var(--ms-warn) 35%, transparent);
      color: var(--ms-text);
    }
    .model-pill.removed {
      background: color-mix(in srgb, var(--ms-err) 12%, transparent);
      border-color: color-mix(in srgb, var(--ms-err) 30%, transparent);
      color: var(--ms-text);
    }
    .model-pill.filtered {
      background: color-mix(in srgb, var(--ms-purple) 12%, transparent);
      border-color: color-mix(in srgb, var(--ms-purple) 30%, transparent);
      color: var(--ms-text);
    }

    /* ── live sync stepper ───────────────────────────── */
    .stepper {
      display: flex; flex-direction: column; gap: 8px; padding: 6px 0;
    }
    .step-item {
      display: flex; align-items: center; gap: 9px;
      font-size: 12px; color: var(--ms-dim);
    }
    .step-item.active { color: var(--ms-text); font-weight: 600; }
    .step-item.done { color: var(--ms-ok); }
    .step-icon {
      width: 18px; height: 18px; border-radius: 50%;
      border: 1px solid var(--ms-border); display: grid; place-items: center;
      flex: none; font-size: 10px;
    }
    .step-item.active .step-icon { border-color: var(--ms-accent); color: var(--ms-accent); animation: ping 1.2s infinite; }
    .step-item.done .step-icon { border-color: var(--ms-ok); background: var(--ms-ok); color: #000; }

    /* ── collapsible console logs ───────────────────── */
    details.log-details {
      margin-top: 12px; border-top: 1px dashed var(--ms-border); padding-top: 8px;
    }
    details.log-details summary {
      font-size: 11px; color: var(--ms-dim); cursor: pointer;
      user-select: none; font-weight: 600; outline: none;
      display: flex; align-items: center; gap: 6px;
    }
    details.log-details summary:hover { color: var(--ms-text); }

    #log {
      display: flex; flex-direction: column; gap: 6px;
      min-height: 90px; max-height: 200px; overflow-y: auto;
      padding: 6px 2px 2px;
      scrollbar-width: thin;
    }

    .log-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 6px; padding: 22px 12px; text-align: center; color: var(--ms-dim);
      border: 1px dashed color-mix(in srgb, var(--ms-border) 70%, transparent);
      border-radius: 10px; background: color-mix(in srgb, var(--ms-card) 40%, transparent);
    }
    .log-empty svg { width: 26px; height: 26px; opacity: 0.45; }
    .log-empty p { margin: 0; font-size: 11px; }

    .log-item {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 6px 8px; border-radius: 8px;
      background: color-mix(in srgb, var(--ms-card) 95%, transparent);
      border: 1px solid color-mix(in srgb, var(--ms-border) 60%, transparent);
      font-size: 11px; line-height: 1.4;
      animation: rise .2s ease both;
    }

    .log-item .icon-badge {
      flex: none; width: 18px; height: 18px; border-radius: 5px;
      display: grid; place-items: center; margin-top: 1px;
    }
    .log-item .icon-badge svg { width: 11px; height: 11px; }

    .log-item.ok .icon-badge { background: color-mix(in srgb, var(--ms-ok) 18%, transparent); color: var(--ms-ok); }
    .log-item.err .icon-badge { background: color-mix(in srgb, var(--ms-err) 18%, transparent); color: var(--ms-err); }
    .log-item.warn .icon-badge { background: color-mix(in srgb, var(--ms-warn) 18%, transparent); color: var(--ms-warn); }
    .log-item.added .icon-badge { background: color-mix(in srgb, var(--ms-accent) 22%, transparent); color: var(--ms-accent); }
    .log-item.updated .icon-badge { background: color-mix(in srgb, var(--ms-warn) 22%, transparent); color: var(--ms-warn); }
    .log-item.removed .icon-badge { background: color-mix(in srgb, var(--ms-err) 15%, transparent); color: var(--ms-err); }
    .log-item.info .icon-badge { background: color-mix(in srgb, var(--ms-dim) 18%, transparent); color: var(--ms-dim); }

    .log-item .log-body { flex: 1 1 auto; min-width: 0; }
    .log-item .log-time {
      font-size: 9px; font-family: var(--ms-mono);
      color: var(--ms-dim); opacity: 0.8; margin-bottom: 1px;
    }
    .log-item .log-msg { word-break: break-word; white-space: pre-wrap; }

    .header-icon-btn {
      display: inline-flex; align-items: center; gap: 4px;
      background: transparent; border: 1px solid var(--ms-border);
      color: var(--ms-dim); padding: 3px 7px; border-radius: 6px;
      font-size: 11px; cursor: pointer;
      transition: color .15s, border-color .15s, background .15s;
    }
    .header-icon-btn svg { width: 12px; height: 12px; }
    .header-icon-btn:hover { color: var(--ms-text); border-color: var(--ms-accent); background: color-mix(in srgb, var(--ms-accent) 10%, transparent); }

    /* ── sticky dock ─── */
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
    .syncbtn .glyph { display: inline-flex; align-items: center; transition: transform .4s; }
    .syncbtn .glyph svg { width: 16px; height: 16px; }
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
    .reloadbtn svg { width: 14px; height: 14px; }
    .reloadbtn.show { display: flex; }
    .reloadbtn:hover { background: color-mix(in srgb, var(--ms-ok) 22%, transparent); }

    .secondary { display: flex; gap: 8px; margin-top: 8px; }
    .secondary button {
      flex: 1; padding: 8px 10px; border-radius: 9px; cursor: pointer;
      border: 1px solid var(--ms-border);
      background: transparent; color: var(--ms-dim); font-size: 11px;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      transition: color .15s, border-color .15s, background .15s;
    }
    .secondary button svg { width: 13px; height: 13px; }
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
        <label for="baseUrl">
          <span>Máy chủ (Base URL)</span>
          <span class="test-status" id="testStatus"></span>
        </label>
        <div class="inputrow">
          <input type="text" id="baseUrl" placeholder="https://dc-ai.dabeecao.org" />
          <button class="textbtn" id="testBtn" title="Kiểm tra kết nối tới server">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>Thử</span>
          </button>
        </div>
      </div>
      <div class="field">
        <label for="apiKey">Khoá API</label>
        <div class="inputrow">
          <input type="password" id="apiKey" placeholder="sk-xxxx" />
          <button class="iconbtn" id="toggleKey" title="Hiện / ẩn khoá">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
      <div class="field">
        <label for="configPath">Đường dẫn cấu hình</label>
        <div class="inputrow">
          <input type="text" id="configPath" />
          <button class="textbtn" id="browse">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span>Chọn…</span>
          </button>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Tuỳ chọn</h2>
      <label class="opt">
        <input type="checkbox" id="dryRun" />
        <div class="opt-label">
          <span class="opt-title">Chạy thử (dry run) — chỉ xem trước</span>
        </div>
      </label>
      <label class="opt">
        <input type="checkbox" id="prune" checked />
        <div class="opt-label">
          <span class="opt-title">Dọn mô hình cũ không còn trên máy chủ</span>
        </div>
      </label>
      <label class="opt">
        <input type="checkbox" id="includeImageModels" />
        <div class="opt-label">
          <span class="opt-title">Gồm cả mô hình ảnh & âm thanh</span>
          <span class="opt-sub">Bao gồm mô hình tạo ảnh, TTS, Whisper, CosyVoice, Bark...</span>
        </div>
      </label>
      <div class="field" style="margin-top:10px">
        <label for="forceKeep">Giữ cố định (cách nhau bằng khoảng trắng)</label>
        <input type="text" id="forceKeep" placeholder="model-id-1 model-id-2" />
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <h2>Kết quả & Nhật ký hoạt động</h2>
        <button class="header-icon-btn" id="clearBtn" title="Xoá kết quả & nhật ký">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          <span>Xoá</span>
        </button>
      </div>

      <!-- Dashboard View container -->
      <div id="dashboardView">
        <div class="log-empty" id="emptyLogState">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <p>Chưa có dữ liệu đồng bộ. Nhấn "Đồng bộ ngay" để bắt đầu.</p>
        </div>
      </div>

      <details class="log-details" id="logDetails">
        <summary>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          <span>Chi tiết nhật ký hệ thống (Console log)</span>
        </summary>
        <div id="log"></div>
      </details>
    </section>
  </div>

  <div class="dock">
    <div class="statusline" id="status"><span class="pulse"></span><span id="statusText">Sẵn sàng</span></div>
    <button class="syncbtn" id="syncBtn">
      <span class="glyph">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
      </span>
      <span id="syncLabel">Đồng bộ ngay</span>
    </button>
    <button class="reloadbtn" id="reloadBtn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
      <span>Tải lại cửa sổ để áp dụng</span>
    </button>
    <div class="secondary">
      <button id="saveBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        <span>Lưu cài đặt</span>
      </button>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const $ = (id) => document.getElementById(id);
    const logBox = $("log");
    const dashboardView = $("dashboardView");

    const EYE_SVG = \`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>\`;
    const EYE_OFF_SVG = \`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>\`;

    const BADGE_ICONS = {
      ok: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>\`,
      err: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>\`,
      warn: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>\`,
      added: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>\`,
      updated: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>\`,
      removed: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" x2="16" y1="12" y2="12"/></svg>\`,
      info: \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>\`
    };

    function ts() { return new Date().toLocaleTimeString([], { hour12: false }); }

    function formatModelId(id) {
      if (!id) return "";
      if (/\\s/.test(id) && /[A-Z]/.test(id)) return id;

      const SPECIAL_TOKENS = {
        gpt: "GPT", tts: "TTS", llm: "LLM", deepseek: "DeepSeek", qwen: "Qwen",
        glm: "GLM", yi: "Yi", db: "DB", api: "API", sdxl: "SDXL", dalle: "DALL-E",
        "dall-e": "DALL-E", gemini: "Gemini", claude: "Claude", llama: "Llama",
        mistral: "Mistral", whisper: "Whisper", cosyvoice: "CosyVoice", bark: "Bark",
        flux: "Flux", gemma: "Gemma", phi: "Phi", coder: "Coder", instruct: "Instruct",
        flash: "Flash", lite: "Lite", pro: "Pro", sonnet: "Sonnet", haiku: "Haiku",
        opus: "Opus", preview: "Preview", turbo: "Turbo", schnell: "Schnell",
        large: "Large", medium: "Medium", small: "Small", mini: "Mini", nano: "Nano",
        vision: "Vision", audio: "Audio", speech: "Speech", suno: "Suno", musicgen: "MusicGen"
      };

      const tokens = id.split(/[-_/ ]+/).filter(Boolean);
      return tokens.map(token => {
        const lower = token.toLowerCase();
        if (SPECIAL_TOKENS[lower]) return SPECIAL_TOKENS[lower];
        if (/^\\d+(\\.\\d+)*$/.test(token)) return token;
        if (/^\\d+[bBmMkK]$/.test(token)) return token.slice(0, -1) + token.slice(-1).toUpperCase();
        if (/^v\\d+(\\.\\d+)*$/i.test(token)) return "v" + token.slice(1);
        return token.charAt(0).toUpperCase() + token.slice(1);
      }).join(" ");
    }

    function renderSpecBadges(props) {
      if (!props) return "";
      let html = "";
      if (props.vision) {
        html += \`<span class="spec-badge vision">Vision</span>\`;
      }
      if (props.toolCalling) {
        html += \`<span class="spec-badge tools">Tools</span>\`;
      }
      if (props.maxInputTokens) {
        const k = Math.round(props.maxInputTokens / 1000);
        html += \`<span class="spec-badge ctx">\${k >= 1000 ? (k/1000)+'M' : k+'K'}</span>\`;
      }
      return html ? \`<span class="model-badges">\${html}</span>\` : "";
    }

    function determineType(m) {
      if (/^ERROR/i.test(m)) return "err";
      if (/^\\s*\\+\s+/.test(m) || /^Added:/i.test(m)) return "added";
      if (/^\\s*~\\s+/.test(m) || /^Updated:/i.test(m)) return "updated";
      if (/^\\s*-\\s+/.test(m) || /^Removed:/i.test(m)) return "removed";
      if (/^Wrote|saved|Reload|applied/i.test(m) || /\\bWrote\\b/.test(m)) return "ok";
      if (/Dry run|Filtered|Prune disabled|No provider/i.test(m)) return "warn";
      return "info";
    }

    function renderEmptyState() {
      dashboardView.innerHTML = \`
        <div class="log-empty" id="emptyLogState">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <p>Chưa có dữ liệu đồng bộ. Nhấn "Đồng bộ ngay" để bắt đầu.</p>
        </div>\`;
      logBox.innerHTML = "";
    }

    function renderSyncDashboard(data) {
      const addedList = data.added || [];
      const updatedList = data.updated || [];
      const removedList = data.removed || [];
      const skippedList = data.skippedImageModels || [];
      const modelDetails = data.modelDetails || {};
      const totalFetched = data.totalFetched || 0;

      const makePillGroup = (title, list, typeClass, iconSvg) => {
        if (!list || list.length === 0) return "";
        const pillsHtml = list.map(mid => {
          const details = modelDetails[mid] || {};
          const titleFormatted = formatModelId(mid);
          const badges = renderSpecBadges(details);
          return \`<span class="model-pill \${typeClass}" data-search="\${(titleFormatted + ' ' + mid).toLowerCase()}" title="\${mid}">
            <span>\${titleFormatted}</span>
            \${badges}
            \${titleFormatted !== mid ? \`<span class="slug">(\${mid})</span>\` : ""}
          </span>\`;
        }).join("");

        return \`
          <div class="model-group">
            <div class="group-header">
              \${iconSvg}
              <span>\${title} (\${list.length})</span>
            </div>
            <div class="model-chips">
              \${pillsHtml}
            </div>
          </div>\`;
      };

      const addedGroupHtml = makePillGroup("Mô hình mới thêm", addedList, "added", BADGE_ICONS.added);
      const updatedGroupHtml = makePillGroup("Mô hình cập nhật", updatedList, "updated", BADGE_ICONS.updated);
      const removedGroupHtml = makePillGroup("Mô hình đã dọn dẹp", removedList, "removed", BADGE_ICONS.removed);
      const skippedGroupHtml = makePillGroup("Mô hình ảnh & âm thanh bị ẩn", skippedList, "filtered", BADGE_ICONS.warn);

      dashboardView.innerHTML = \`
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="modelSearch" placeholder="Tìm kiếm mô hình (vd: flash, vision, qwen)..." />
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="num">\${totalFetched}</div>
            <div class="label">Tổng trên server</div>
          </div>
          <div class="stat-card added">
            <div class="num">+\${addedList.length}</div>
            <div class="label">Thêm mới</div>
          </div>
          <div class="stat-card updated">
            <div class="num">~\${updatedList.length}</div>
            <div class="label">Cập nhật</div>
          </div>
          <div class="stat-card removed">
            <div class="num">-\${removedList.length}</div>
            <div class="label">Loại bỏ</div>
          </div>
        </div>

        \${addedGroupHtml}
        \${updatedGroupHtml}
        \${removedGroupHtml}
        \${skippedGroupHtml}
      \`;

      const searchInput = $("modelSearch");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          const q = e.target.value.trim().toLowerCase();
          const pills = dashboardView.querySelectorAll(".model-pill");
          pills.forEach(pill => {
            const text = pill.getAttribute("data-search") || "";
            pill.style.display = text.includes(q) ? "inline-flex" : "none";
          });
        });
      }
    }

    function renderSyncStepper() {
      dashboardView.innerHTML = \`
        <div class="stepper">
          <div class="step-item active">
            <div class="step-icon">1</div>
            <span>Đang kết nối API máy chủ & tải danh sách mô hình…</span>
          </div>
          <div class="step-item">
            <div class="step-icon">2</div>
            <span>Đang lọc mô hình ảnh & âm thanh (Non-text)…</span>
          </div>
          <div class="step-item">
            <div class="step-icon">3</div>
            <span>Cập nhật cấu hình chatLanguageModels.json…</span>
          </div>
        </div>\`;
    }

    function log(msg) {
      const type = determineType(msg);
      const card = document.createElement("div");
      card.className = "log-item " + type;

      const iconDiv = document.createElement("div");
      iconDiv.className = "icon-badge";
      iconDiv.innerHTML = BADGE_ICONS[type] || BADGE_ICONS.info;

      const bodyDiv = document.createElement("div");
      bodyDiv.className = "log-body";

      const timeDiv = document.createElement("div");
      timeDiv.className = "log-time";
      timeDiv.textContent = ts();

      const msgDiv = document.createElement("div");
      msgDiv.className = "log-msg";
      msgDiv.textContent = msg;

      bodyDiv.appendChild(timeDiv);
      bodyDiv.appendChild(msgDiv);
      card.appendChild(iconDiv);
      card.appendChild(bodyDiv);

      logBox.appendChild(card);
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
      $("toggleKey").innerHTML = inp.type === "password" ? EYE_SVG : EYE_OFF_SVG;
    });
    $("apiKey").addEventListener("input", () => refreshKeyChip($("apiKey").value.trim()));
    $("browse").addEventListener("click", () => vscode.postMessage({ command: "browse" }));
    $("clearBtn").addEventListener("click", () => {
      renderEmptyState();
    });
    $("testBtn").addEventListener("click", () => {
      const st = $("testStatus");
      st.className = "test-status ok";
      st.textContent = "Đang thử...";
      st.style.display = "inline";
      vscode.postMessage({
        command: "testConnection",
        baseUrl: $("baseUrl").value.trim(),
        apiKey: $("apiKey").value.trim(),
      });
    });
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
        case "testResult": {
          const st = $("testStatus");
          if (m.success) {
            st.className = "test-status ok";
            st.textContent = "✓ Tốt (" + m.count + " mô hình)";
          } else {
            st.className = "test-status err";
            st.textContent = "✗ Lỗi (" + (m.error || "kết nối thất bại") + ")";
          }
          st.style.display = "inline";
          break;
        }
        case "syncStart":
          setBusy(true); setStatus("Đang đồng bộ…", "busy");
          renderSyncStepper();
          $("reloadBtn").classList.remove("show"); break;
        case "syncEnd":
          setBusy(false);
          if (m.success) {
            const addedCount = Array.isArray(m.added) ? m.added.length : (m.added || 0);
            const updatedCount = Array.isArray(m.updated) ? m.updated.length : (m.updated || 0);
            const removedCount = Array.isArray(m.removed) ? m.removed.length : (m.removed || 0);

            setStatus("Xong · +" + addedCount + "  ~" + updatedCount + "  −" + removedCount, "done");
            renderSyncDashboard(m);

            if (!m.dryRun) $("reloadBtn").classList.add("show");
          } else {
            setStatus("Thất bại: " + (m.error || "lỗi không xác định"), "fail");
          }
          break;
      }
    });

    renderEmptyState();
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
