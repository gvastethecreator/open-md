# Code map · open.md

generated: 2026-09-07T00:58:38Z
commit: 253311e2cd4d
scope: .

counts: 8 nodes · 8 edges · 0 flows · 0 unknown

## Modules

- `external-dependencies` · `src-tauri/src/app_settings.rs` · external · External
  callers: src (imports), src-tauri-src (imports), vite-config (imports)
  callees: (none)
  tests: (none)
  entry: src-tauri/src/app_settings.rs:serde

- `repository` · `package.json` · module · Repository
  callers: (none)
  callees: scripts (calls), scripts-store (calls), src (calls)
  tests: (none)
  entry: package.json:{

- `scripts` · `scripts` · service · Scripts
  callers: repository (calls), src (imports), vite-config (imports)
  callees: (none)
  tests: src/free-port.test.js
  entry: scripts/check-bundle.mjs:listFiles

- `scripts-store` · `scripts/store` · database · Scripts
  callers: repository (calls)
  callees: (none)
  tests: (none)
  entry: scripts/store/Build-StoreInstaller.ps1:Invoke

- `src` · `src` · module · Src
  callers: repository (calls)
  callees: external-dependencies (imports), scripts (imports)
  tests: src/app-loading-screen.test.js, src/application-composition.test.js, src/application-lifecycle.test.js, src/application-runtime-adapters.test.js, src/context-menu-controller.test.js
  entry: src/main.js:cacheElements

- `src-tauri` · `src-tauri` · module · Src Tauri
  callers: (none)
  callees: (none)
  tests: (none)
  entry: src-tauri/Cargo.toml:package

- `src-tauri-src` · `src-tauri/src` · module · Src Tauri
  callers: (none)
  callees: external-dependencies (imports)
  tests: (none)
  entry: src-tauri/src/lib.rs:get_file_content

- `vite-config` · `vite.config.js` · module · Vite.Config
  callers: (none)
  callees: external-dependencies (imports), scripts (imports)
  tests: (none)
  entry: vite.config.js:import { defineConfig } from "vite";

## Edges

- repository -> scripts · calls
- repository -> scripts-store · calls
- repository -> src · calls
- src -> external-dependencies · imports
- src -> scripts · imports
- src-tauri-src -> external-dependencies · imports
- vite-config -> external-dependencies · imports
- vite-config -> scripts · imports

## Unknown

- none

## Flows

- none
