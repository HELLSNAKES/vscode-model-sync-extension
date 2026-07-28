# VS Code Model Sync — Extension

VS Code extension port of the desktop `vscode-model-sync-app`. Syncs OpenAI-compatible models into VS Code's `chatLanguageModels.json` from inside VS Code itself.

## Features

- **Command Palette** integration (`Model Sync: ...`)
- **Webview panel** with the same dark UI as the desktop app
- **Secure API key storage** via VS Code SecretStorage (never written to plain settings)
- Dry run, prune, force-keep, and image-model filtering
- One-click **Reload Window** after syncing

## Commands

| Command | Description |
| --- | --- |
| `Model Sync: Open Model Sync Panel` | Open the full webview UI |
| `Model Sync: Sync Models Now` | Quick sync using saved settings |

## Settings (`modelSync.*`)

- `baseUrl` — OpenAI-compatible endpoint (default `https://dc-ai.dabeecao.org`)
- `dryRun`, `prune`, `includeImageModels`, `forceKeep`, `configPath`

The API key is stored in VS Code's SecretStorage, not in settings.

## Develop

```bash
cd vscode-extension
npm install
npm run compile
```

Press **F5** in VS Code to launch an Extension Development Host, then run
`Model Sync: Open Model Sync Panel` from the Command Palette.

## Package a .vsix

```bash
npm run package
```

This produces a `.vsix` you can install via
`Extensions: Install from VSIX...`.
