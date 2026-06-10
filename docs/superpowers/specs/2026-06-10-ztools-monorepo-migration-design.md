# ztools Monorepo Migration Design

Date: 2026-06-10
Status: Awaiting user review

## Goal

Migrate two existing projects into the `ztools` Turborepo monorepo and rename everything to `ztools`:

- `my-ink-cli` (Ink CLI, `dev-tools`) → `apps/cli` (`@ztools/cli`)
- `devtools-newtab` (Vite + React Chrome extension) → `apps/extension` (`@ztools/extension`)

Extract shared VSIX logic into a new `packages/core` (`@ztools/core`).

## Decisions (confirmed)

- **Shared core**: extract `marketplace.ts` pure logic into `packages/core`; both apps import it.
- **Scaffold cleanup**: delete `apps/web`, `apps/docs`, `packages/ui`. Keep `packages/typescript-config` and `packages/eslint-config`.
- **Naming**: scoped packages `@ztools/core`, `@ztools/cli`, `@ztools/extension`; CLI binary command = `ztools`; root package name = `ztools`.
- **Build tool**: replace `tsc` build with **tsdown** (Rolldown-based) for `core` and `cli`, emitting ESM + `.d.ts`. Extension stays on Vite.
- **Type-check**: `check-types` task uses **tsgo** (not classic tsc). CLI tests stay on `ava` + `ts-node` for now.
- **Migration is non-destructive**: copy projects in; leave originals untouched. `git init` the `ztools` repo.

## Target Structure

```
ztools/                          # root package renamed "ztools"
├── turbo.json                   # tasks: build / dev / lint / check-types / test
├── pnpm-workspace.yaml          # apps/* + packages/*
├── apps/
│   ├── cli/                     # @ztools/cli (from my-ink-cli)
│   │   ├── source/
│   │   │   ├── cli.tsx          # bin → `ztools`
│   │   │   ├── app.tsx
│   │   │   └── tools/
│   │   │       ├── Dashboard.tsx
│   │   │       ├── registry.ts
│   │   │       └── vsix/
│   │   │           ├── VsixApp.tsx
│   │   │           ├── InstallPrompt.tsx
│   │   │           ├── download.ts        # @ztools/core + Node downloadVsixToFile
│   │   │           ├── install.ts
│   │   │           ├── prompt-install.ts
│   │   │           └── print-summary.ts
│   │   ├── tsdown.config.ts
│   │   └── package.json          # bin: { ztools }, dep @ztools/core
│   └── extension/                # @ztools/extension (from devtools-newtab)
│       ├── src/                  # App + tools/vsix/VsixDownloader uses @ztools/core
│       ├── public/manifest.json
│       ├── vite.config.ts
│       └── package.json          # dep @ztools/core
└── packages/
    ├── core/                     # @ztools/core
    │   ├── src/
    │   │   ├── marketplace.ts     # parse / resolve / buildUrl / buildFilename + types
    │   │   └── index.ts
    │   ├── tsdown.config.ts
    │   └── package.json
    ├── typescript-config/        # kept
    └── eslint-config/            # kept
```

## @ztools/core Boundary

Only environment-agnostic logic (works in Node 18+ and browser via global `fetch`):

| In core | Stays in app |
|---------|--------------|
| `parseExtensionInput` | `downloadVsixToFile` (CLI, Node `fs`) |
| `resolveExtension` | `downloadVsix` (extension, `chrome.downloads`) |
| `buildDownloadUrl` / `buildVsixFilename` | `install.ts` / `InstallPrompt` (CLI only) |
| types `ExtensionRef` / `ResolvedExtension` | UI components |

`@ztools/core` builds with tsdown → `dist/` (ESM) + `.d.ts`; `package.json` `exports` points to dist. CLI consumes compiled output; extension bundles it via Vite.

## Data Flow

```
@ztools/core  (parse → resolve → buildUrl/buildFilename)
   ├── apps/cli:       core + downloadVsixToFile (Node fs)
   └── apps/extension: core + downloadVsix (chrome.downloads)
```

## Per-App Tooling (minimize migration risk)

- **CLI**: tsdown build; keep `xo` + `ava` + prettier config; bin renamed `ztools`; add dep `@ztools/core: workspace:*`.
- **Extension**: keep `vite` + tailwind; add dep `@ztools/core: workspace:*`.
- Shared `typescript-config` / `eslint-config` remain available for optional later adoption; not force-applied now.

## turbo.json

- `build`: `dependsOn: ["^build"]`, outputs `dist/**` (drop Next-specific `.next/**`).
- `dev`: `cache: false`, `persistent: true`.
- `lint`, `check-types`: `dependsOn` upstream.
- add `test`.

## Testing

- Move `marketplace` pure-function tests into `packages/core`.
- CLI tests cover download/install wiring.
- Extension: no tests currently (unchanged).

## Migration Steps (high level)

1. Rename root `package.json` → `ztools`; delete demo apps/ui.
2. Create `packages/core` from shared `marketplace.ts`; add tsdown config.
3. Copy `my-ink-cli` → `apps/cli`; rewrite `download.ts` to import from `@ztools/core`; rename bin → `ztools`; add tsdown config.
4. Copy `devtools-newtab` → `apps/extension`; rewrite `VsixDownloader`/`marketplace` usage to import from `@ztools/core`.
5. Wire `turbo.json` tasks; `tsgo` for check-types.
6. `git init`; root `pnpm install`; verify each builds, `ztools` runs, extension `vite build` outputs `dist/`.

## Out of Scope

- Forcing unified tsconfig/eslint across apps.
- Deleting original source projects (left to user).
- New tools beyond the existing VSIX downloader.
