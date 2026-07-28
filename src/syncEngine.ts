/**
 * Core sync engine — TypeScript port of sync_engine.py
 * Fetches models from an OpenAI-compatible endpoint and merges them into
 * VS Code's chatLanguageModels.json.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export const DEFAULT_BASE_URL = "https://dc-ai.dabeecao.org";

export const DEFAULT_MODEL_PROPS = {
  toolCalling: true,
  vision: true,
  maxInputTokens: 128000,
  maxOutputTokens: 16000,
} as const;

export const DEFAULT_IMAGE_MODEL_KEYWORDS = [
  "image",
  "flux",
  "stable-diffusion",
] as const;

export interface ModelEntry {
  id: string;
  name?: string;
  url?: string;
  toolCalling?: boolean;
  vision?: boolean;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  [key: string]: unknown;
}

export interface ProviderEntry {
  name?: string;
  models: ModelEntry[];
  [key: string]: unknown;
}

export type LogCallback = (msg: string) => void;

export class SyncResult {
  added: string[] = [];
  updated: string[] = [];
  unchanged: string[] = [];
  removed: string[] = [];
  skippedImageModels: string[] = [];
  providerName = "";
  providerUrl = "";
  totalFetched = 0;
  error?: string;
  success = false;
}

export interface SyncOptions {
  baseUrl: string;
  apiKey: string;
  dryRun?: boolean;
  prune?: boolean;
  keep?: string[];
  includeImageModels?: boolean;
  configPath?: string;
  logCallback?: LogCallback;
}

/** Return the VS Code chat language models config path for the current OS. */
export function getConfigPath(): string {
  const envOverride = process.env.VSCODE_CHAT_LANGUAGE_MODELS_PATH;
  if (envOverride) {
    return expandHome(envOverride);
  }

  const home = os.homedir();

  if (process.platform === "win32") {
    const appdata = process.env.APPDATA;
    if (appdata) {
      return path.join(appdata, "Code", "User", "chatLanguageModels.json");
    }
  }

  if (process.platform === "darwin") {
    return path.join(
      home,
      "Library",
      "Application Support",
      "Code",
      "User",
      "chatLanguageModels.json"
    );
  }

  return path.join(home, ".config", "Code", "User", "chatLanguageModels.json");
}

function expandHome(p: string): string {
  if (p.startsWith("~")) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

/** Call GET /v1/models on an OpenAI-compatible endpoint. */
export async function fetchModels(
  baseUrl: string,
  apiKey: string
): Promise<Record<string, unknown>[]> {
  const url = baseUrl.replace(/\/+$/, "") + "/v1/models";

  let resp: Response;
  try {
    resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "User-Agent": "VSCodeModelSync/1.0",
      },
    });
  } catch (e) {
    throw new Error(`Network error: ${String(e)}`);
  }

  if (!resp.ok) {
    let detail = "";
    try {
      detail = await resp.text();
    } catch {
      /* ignore */
    }
    throw new Error(
      `HTTP ${resp.status} ${resp.statusText} from ${url}\n${detail}`
    );
  }

  let body: unknown;
  try {
    body = await resp.json();
  } catch (e) {
    throw new Error(`Invalid JSON response: ${String(e)}`);
  }

  const data =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { data?: unknown }).data ?? body
      : body;

  if (!Array.isArray(data)) {
    throw new Error(`Unexpected response shape: ${JSON.stringify(body)}`);
  }

  const models: Record<string, unknown>[] = [];
  for (const item of data) {
    if (typeof item === "string") {
      models.push({ id: item });
    } else if (item && typeof item === "object" && "id" in item) {
      models.push(item as Record<string, unknown>);
    }
  }
  return models;
}

/** Extract only explicit parameters returned by the API for a model. */
export function extractModelProps(
  model: Record<string, unknown>
): Partial<ModelEntry> {
  const props: Partial<ModelEntry> = {};

  const inputKeys = [
    "context_length",
    "max_input_tokens",
    "max_tokens",
    "maxInputTokens",
    "context_window",
  ];
  for (const key of inputKeys) {
    const v = model[key];
    if (typeof v === "number" && v > 0) {
      props.maxInputTokens = v;
      break;
    }
  }

  const outputKeys = ["max_output_tokens", "max_completion_tokens", "maxOutputTokens"];
  for (const key of outputKeys) {
    const v = model[key];
    if (typeof v === "number" && v > 0) {
      props.maxOutputTokens = v;
      break;
    }
  }

  const toolKeys = ["toolCalling", "tool_calling", "tools"];
  for (const key of toolKeys) {
    const v = model[key];
    if (typeof v === "boolean") {
      props.toolCalling = v;
      break;
    }
  }

  const visionKeys = ["vision", "supports_vision"];
  for (const key of visionKeys) {
    const v = model[key];
    if (typeof v === "boolean") {
      props.vision = v;
      break;
    }
  }

  return props;
}

function modelMatchesKeywords(
  model: Record<string, unknown>,
  keywords: readonly string[]
): boolean {
  const searchable = [String(model.id ?? ""), String(model.name ?? "")]
    .join(" ")
    .toLowerCase();
  return keywords.some((k) => searchable.includes(k));
}

export function filterImageModels(
  models: Record<string, unknown>[],
  keywords: readonly string[]
): { kept: Record<string, unknown>[]; skipped: string[] } {
  const kept: Record<string, unknown>[] = [];
  const skipped: string[] = [];
  for (const model of models) {
    if (modelMatchesKeywords(model, keywords)) {
      skipped.push(String(model.id ?? ""));
    } else {
      kept.push(model);
    }
  }
  return { kept, skipped };
}

export function loadConfig(configPath: string): ProviderEntry[] {
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    return [{ name: "OpenAI-compatible", models: [] }];
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(raw);

  if (!Array.isArray(config)) {
    throw new Error(
      `Unexpected config shape in ${configPath}: expected a JSON array`
    );
  }

  return config as ProviderEntry[];
}

export function saveConfig(configPath: string, config: ProviderEntry[]): void {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const tmp = configPath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2) + "\n", "utf-8");
  fs.renameSync(tmp, configPath);
}

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "").replace(/\/v1$/, "");
}

/** Run the full sync operation. */
export async function runSync(options: SyncOptions): Promise<SyncResult> {
  const result = new SyncResult();
  const log = options.logCallback ?? (() => {});
  const {
    baseUrl,
    apiKey,
    dryRun = false,
    prune = true,
    keep = [],
    includeImageModels = false,
  } = options;

  try {
    log(`Fetching models from ${baseUrl}/v1/models ...`);
    let fetched = await fetchModels(baseUrl, apiKey);
    result.totalFetched = fetched.length;
    log(`Found ${fetched.length} models.`);

    if (!includeImageModels) {
      const filtered = filterImageModels(fetched, DEFAULT_IMAGE_MODEL_KEYWORDS);
      fetched = filtered.kept;
      result.skippedImageModels = filtered.skipped;
      log(`Filtered out ${filtered.skipped.length} image model(s).`);
      for (const mid of filtered.skipped) {
        log(`  - ${mid}`);
      }
    }

    const targetPath = options.configPath || getConfigPath();
    const config = loadConfig(targetPath);
    const keepSet = new Set(keep);
    const baseNorm = normalizeBase(baseUrl);

    if (config.length === 0) {
      config.push({ name: "OpenAI-compatible", models: [] });
    }

    let target: ProviderEntry | undefined;
    for (const provider of config) {
      const models = provider.models ?? [];
      if (models.length === 0) {
        continue;
      }
      if (
        models.some(
          (m) => normalizeBase(String(m.url ?? "")) === baseNorm
        )
      ) {
        target = provider;
        break;
      }
    }
    if (!target) {
      target = config[0];
      log(
        `No provider matched ${baseUrl}, using first provider: ${target.name ?? ""}`
      );
    }

    result.providerName = String(target.name ?? "");
    result.providerUrl = baseUrl;

    const existing = new Map<string, ModelEntry>();
    for (const m of target.models ?? []) {
      existing.set(m.id, m);
    }
    const fetchedIds = new Set(fetched.map((m) => String(m.id)));

    for (const m of fetched) {
      const mid = String(m.id);
      const props = extractModelProps(m);
      const modelName = (m.name as string) || mid;

      const entry = existing.get(mid);
      if (entry) {
        let changed = false;

        if (entry.name !== modelName && "name" in m) {
          entry.name = modelName;
          changed = true;
        }

        for (const [propKey, propValue] of Object.entries(props)) {
          if ((entry as Record<string, unknown>)[propKey] !== propValue) {
            (entry as Record<string, unknown>)[propKey] = propValue;
            changed = true;
          }
        }

        if (changed) {
          result.updated.push(mid);
        } else {
          result.unchanged.push(mid);
        }
        continue;
      }

      const newEntry: ModelEntry = {
        id: mid,
        name: modelName,
        url: baseUrl,
        ...DEFAULT_MODEL_PROPS,
        ...props,
      };
      existing.set(mid, newEntry);
      result.added.push(mid);
    }

    if (prune) {
      for (const [mid, m] of Array.from(existing.entries())) {
        if (keepSet.has(mid)) {
          continue;
        }
        if (fetchedIds.has(mid)) {
          continue;
        }
        const mUrl = normalizeBase(String(m.url ?? ""));
        if (mUrl && mUrl !== baseNorm) {
          continue;
        }
        existing.delete(mid);
        result.removed.push(mid);
      }
    }

    target.models = Array.from(existing.values());

    log(`Provider: ${target.name ?? ""}  (${baseUrl})`);
    log(`  Added:   ${result.added.length}`);
    for (const mid of result.added) {
      log(`    + ${mid}`);
    }
    if (result.updated.length) {
      log(
        `  Updated: ${result.updated.length} (overwrote parameters from endpoint)`
      );
      for (const mid of result.updated) {
        log(`    ~ ${mid}`);
      }
    }
    log(`  Kept:    ${result.unchanged.length} (already present)`);
    if (prune) {
      log(`  Removed: ${result.removed.length}`);
      for (const mid of result.removed) {
        log(`    - ${mid}`);
      }
    } else {
      log("  Prune disabled: stale models kept");
    }

    if (dryRun) {
      log("\nDry run: no changes written.");
      result.success = true;
      return result;
    }

    saveConfig(targetPath, config);
    log(`\nWrote ${targetPath}`);
    log("Reload VS Code (Developer: Reload Window) to pick up changes.");
    result.success = true;
  } catch (e) {
    result.error = String(e instanceof Error ? e.message : e);
    log(`ERROR: ${result.error}`);
  }

  return result;
}
