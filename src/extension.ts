import * as vscode from "vscode";
import {
  DEFAULT_BASE_URL,
  getConfigPath,
  runSync,
  SyncResult,
} from "./syncEngine";
import { getWebviewContent, WebviewState } from "./webview";

const SECRET_KEY = "modelSync.apiKey";
const VIEW_ID = "modelSyncView";

export function activate(context: vscode.ExtensionContext) {
  // ── shared state helpers ───────────────────────────────────────────────
  const getState = async (): Promise<WebviewState> => {
    const cfg = vscode.workspace.getConfiguration("modelSync");
    const apiKey = (await context.secrets.get(SECRET_KEY)) ?? "";
    return {
      baseUrl: cfg.get<string>("baseUrl", DEFAULT_BASE_URL),
      apiKey,
      dryRun: cfg.get<boolean>("dryRun", false),
      prune: cfg.get<boolean>("prune", true),
      includeImageModels: cfg.get<boolean>("includeImageModels", false),
      forceKeep: cfg.get<string[]>("forceKeep", []),
      configPath: cfg.get<string>("configPath", "") || getConfigPath(),
    };
  };

  const persistState = async (state: Partial<WebviewState>) => {
    const cfg = vscode.workspace.getConfiguration("modelSync");
    if (state.baseUrl !== undefined) {
      await cfg.update("baseUrl", state.baseUrl, vscode.ConfigurationTarget.Global);
    }
    if (state.dryRun !== undefined) {
      await cfg.update("dryRun", state.dryRun, vscode.ConfigurationTarget.Global);
    }
    if (state.prune !== undefined) {
      await cfg.update("prune", state.prune, vscode.ConfigurationTarget.Global);
    }
    if (state.includeImageModels !== undefined) {
      await cfg.update(
        "includeImageModels",
        state.includeImageModels,
        vscode.ConfigurationTarget.Global
      );
    }
    if (state.forceKeep !== undefined) {
      await cfg.update("forceKeep", state.forceKeep, vscode.ConfigurationTarget.Global);
    }
    if (state.configPath !== undefined) {
      await cfg.update("configPath", state.configPath, vscode.ConfigurationTarget.Global);
    }
    if (state.apiKey !== undefined) {
      await context.secrets.store(SECRET_KEY, state.apiKey);
    }
  };

  const doSync = async (
    state: WebviewState,
    log: (msg: string) => void
  ): Promise<SyncResult> => {
    if (!state.baseUrl) {
      log("Vui lòng nhập Base URL.");
      return Object.assign(new SyncResult(), { error: "Thiếu Base URL" });
    }
    if (!state.apiKey) {
      log("Vui lòng nhập khoá API.");
      return Object.assign(new SyncResult(), { error: "Thiếu khoá API" });
    }
    return runSync({
      baseUrl: state.baseUrl,
      apiKey: state.apiKey,
      dryRun: state.dryRun,
      prune: state.prune,
      includeImageModels: state.includeImageModels,
      keep: state.forceKeep,
      configPath: state.configPath || undefined,
      logCallback: log,
    });
  };

  const maybePromptReload = async (dryRun: boolean) => {
    if (dryRun) {
      return;
    }
    const reload = "Tải lại cửa sổ";
    const choice = await vscode.window.showInformationMessage(
      "Đã đồng bộ mô hình. Tải lại VS Code để áp dụng?",
      reload
    );
    if (choice === reload) {
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
    }
  };

  // ── sidebar webview provider ───────────────────────────────────────────
  const provider = new (class implements vscode.WebviewViewProvider {
    private view?: vscode.WebviewView;

    resolveWebviewView(
      view: vscode.WebviewView,
      _ctx: vscode.WebviewViewResolveContext,
      _token: vscode.CancellationToken
    ): void {
      this.view = view;
      view.webview.options = { enableScripts: true };

      const render = async () => {
        const state = await getState();
        view.webview.html = getWebviewContent(view.webview, state);
      };
      void render();

      view.webview.onDidReceiveMessage(async (message) => {
        const post = (m: Record<string, unknown>) =>
          view.webview.postMessage(m);

        switch (message.command) {
          case "ready": {
            const s = await getState();
            post({ command: "init", state: s });
            break;
          }
          case "save": {
            await persistState(message.state);
            post({ command: "saved" });
            break;
          }
          case "browse": {
            const uri = await vscode.window.showOpenDialog({
              canSelectFiles: true,
              canSelectFolders: false,
              canSelectMany: false,
              filters: { JSON: ["json"] },
              openLabel: "Chọn chatLanguageModels.json",
            });
            if (uri && uri[0]) {
              post({ command: "configPath", path: uri[0].fsPath });
            }
            break;
          }
          case "reload": {
            await vscode.commands.executeCommand("workbench.action.reloadWindow");
            break;
          }
          case "sync": {
            const current: WebviewState = {
              ...(await getState()),
              ...message.state,
            };
            await persistState(current);

            post({ command: "syncStart" });
            const result = await doSync(current, (msg) =>
              post({ command: "log", message: msg })
            );
            post({
              command: "syncEnd",
              success: result.success,
              error: result.error,
              added: result.added.length,
              updated: result.updated.length,
              removed: result.removed.length,
              dryRun: current.dryRun,
            });
            if (result.success) {
              await maybePromptReload(current.dryRun);
            }
            break;
          }
        }
      });

      view.onDidDispose(() => {
        this.view = undefined;
      });
    }
  })();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_ID, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // ── status bar quick-sync button ───────────────────────────────────────
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    50
  );
  statusItem.name = "Model Sync";
  statusItem.command = "modelSync.syncNow";
  statusItem.text = "$(sync) Model Sync";
  statusItem.tooltip = "Đồng bộ mô hình ngay";
  statusItem.show();
  context.subscriptions.push(statusItem);

  // ── commands ───────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("modelSync.open", async () => {
      await vscode.commands.executeCommand(`${VIEW_ID}.focus`);
    }),

    vscode.commands.registerCommand("modelSync.syncNow", async () => {
      const state = await getState();

      if (!state.apiKey) {
        const key = await vscode.window.showInputBox({
          prompt: "Nhập khoá API (được lưu an toàn)",
          password: true,
          ignoreFocusOut: true,
        });
        if (!key) {
          return;
        }
        state.apiKey = key;
        await persistState({ apiKey: key });
      }

      statusItem.text = "$(sync~spin) Đang đồng bộ…";
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Model Sync",
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: "Đang đồng bộ mô hình…" });
          const result = await doSync(state, () => {});
          if (result.success) {
            statusItem.text = `$(check) +${result.added.length} ~${result.updated.length} −${result.removed.length}`;
            vscode.window.showInformationMessage(
              `Model Sync: +${result.added.length} thêm, ~${result.updated.length} cập nhật, −${result.removed.length} xoá.`
            );
            await maybePromptReload(state.dryRun);
          } else {
            statusItem.text = "$(error) Đồng bộ thất bại";
            vscode.window.showErrorMessage(
              `Model Sync thất bại: ${result.error ?? "lỗi không xác định"}`
            );
          }
        }
      );
    })
  );
}

export function deactivate() {
  /* nothing to clean up */
}
