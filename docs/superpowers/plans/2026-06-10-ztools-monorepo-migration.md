# ztools Monorepo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Ink CLI (`my-ink-cli`) and Chrome extension (`devtools-newtab`) into the `ztools` Turborepo, extract shared VSIX logic into `@ztools/core`, and rename everything to `ztools`.

**Architecture:** pnpm + Turborepo monorepo. `packages/core` (`@ztools/core`) holds environment-agnostic Marketplace logic built with tsdown. `apps/cli` (`@ztools/cli`, binary `ztools`) and `apps/extension` (`@ztools/extension`) both depend on `@ztools/core` via `workspace:*`; each keeps its environment-specific download path.

**Tech Stack:** pnpm workspaces, Turborepo, tsdown (Rolldown), tsgo (type-check), Ink 4 (CLI), Vite + React + Tailwind (extension), ava (CLI tests).

**Source paths (copy from):**
- CLI: `/Users/kylan.zhang/me/my-ink-cli`
- Extension: `/Users/kylan.zhang/blofin/devtools-newtab`

**Monorepo root:** `/Users/kylan.zhang/me/ztools`

---

## Task 1: Initialize repo and clean scaffold

**Files:**
- Modify: `/Users/kylan.zhang/me/ztools/package.json`
- Delete: `apps/web/`, `apps/docs/`, `packages/ui/`

- [ ] **Step 1: Init git**

Run (in `/Users/kylan.zhang/me/ztools`):
```bash
git init
```
Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Remove demo apps and ui package**

Run:
```bash
rm -rf apps/web apps/docs packages/ui
```
Expected: directories gone; `ls apps` shows nothing, `ls packages` shows `eslint-config typescript-config`.

- [ ] **Step 3: Rename root package**

Modify `package.json` line 2: change `"name": "my-turborepo"` to `"name": "ztools"`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: init ztools repo, drop create-turbo demos"
```

---

## Task 2: Create @ztools/core package

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsdown.config.ts`
- Create: `packages/core/src/marketplace.ts`
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@ztools/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown --watch",
    "check-types": "tsgo --noEmit"
  },
  "devDependencies": {
    "@typescript/native-preview": "latest",
    "tsdown": "^0.9.0",
    "typescript": "5.9.2"
  }
}
```

Note: `tsgo` ships via the `@typescript/native-preview` package. If unavailable in the registry at install time, fall back to `"check-types": "tsc --noEmit"` and add `typescript` only.

- [ ] **Step 2: Create `packages/core/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "noEmit": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `packages/core/tsdown.config.ts`**

```ts
import {defineConfig} from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
});
```

- [ ] **Step 4: Create `packages/core/src/marketplace.ts`**

This is the pure logic copied from the CLI's `marketplace.ts` MINUS `downloadVsixToFile` (which is Node-specific and stays in the CLI). No `node:` imports here.

```ts
export type ExtensionRef = {
  publisher: string;
  name: string;
};

export type ResolvedExtension = ExtensionRef & {
  version: string;
  displayName?: string;
  publisherDisplayName?: string;
};

const MARKETPLACE_ORIGIN = 'https://marketplace.visualstudio.com';

export function parseExtensionInput(raw: string): ExtensionRef | null {
  const input = raw.trim();
  if (!input) {
    return null;
  }

  let itemName = input;

  if (input.includes('itemName=')) {
    try {
      const url = new URL(
        input.startsWith('http') ? input : `https://${input}`,
      );
      const param = url.searchParams.get('itemName');
      if (param) {
        itemName = param;
      }
    } catch {
      const match = input.match(/itemName=([^&\s]+)/);
      if (match) {
        itemName = decodeURIComponent(match[1]!);
      }
    }
  }

  const dot = itemName.indexOf('.');
  if (dot <= 0 || dot === itemName.length - 1) {
    return null;
  }

  const publisher = itemName.slice(0, dot).trim();
  const name = itemName.slice(dot + 1).trim();
  if (!publisher || !name) {
    return null;
  }

  return {publisher, name};
}

type QueryResponse = {
  results?: Array<{
    extensions?: Array<{
      displayName?: string;
      publisher?: {displayName?: string};
      versions?: Array<{version?: string}>;
    }>;
  }>;
};

export async function resolveExtension(
  ref: ExtensionRef,
): Promise<ResolvedExtension> {
  const itemName = `${ref.publisher}.${ref.name}`;

  const body = {
    filters: [
      {
        criteria: [
          {filterType: 8, value: 'Microsoft.VisualStudio.Code'},
          {filterType: 7, value: itemName},
        ],
        pageNumber: 1,
        pageSize: 1,
        sortBy: 0,
        sortOrder: 0,
      },
    ],
    flags: 513,
  };

  const response = await fetch(
    `${MARKETPLACE_ORIGIN}/_apis/public/gallery/extensionquery`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json;api-version=3.0-preview.1',
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(`Marketplace API 请求失败（HTTP ${response.status}）`);
  }

  const data = (await response.json()) as QueryResponse;
  const extension = data.results?.[0]?.extensions?.[0];
  const version = extension?.versions?.[0]?.version;

  if (!extension || !version) {
    throw new Error(`未找到扩展 "${itemName}"，请检查名称是否正确`);
  }

  return {
    ...ref,
    version,
    displayName: extension.displayName,
    publisherDisplayName: extension.publisher?.displayName,
  };
}

export function buildDownloadUrl(ref: ExtensionRef, version: string): string {
  return `${MARKETPLACE_ORIGIN}/_apis/public/gallery/publishers/${ref.publisher}/vsextensions/${ref.name}/${version}/vspackage`;
}

export function buildVsixFilename(ref: ExtensionRef, version: string): string {
  return `${ref.publisher}.${ref.name}-${version}.vsix`;
}
```

- [ ] **Step 5: Create `packages/core/src/index.ts`**

```ts
export {
  parseExtensionInput,
  resolveExtension,
  buildDownloadUrl,
  buildVsixFilename,
} from './marketplace.js';
export type {ExtensionRef, ResolvedExtension} from './marketplace.js';
```

- [ ] **Step 6: Install and build core**

Run (in repo root):
```bash
pnpm install
pnpm --filter @ztools/core build
```
Expected: `packages/core/dist/index.js` and `packages/core/dist/index.d.ts` exist.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(core): add @ztools/core shared marketplace logic"
```

---

## Task 3: Migrate CLI into apps/cli (@ztools/cli)

**Files:**
- Create: `apps/cli/` (copied tree from `my-ink-cli`, excluding `node_modules`, `dist`)
- Modify: `apps/cli/package.json`
- Modify: `apps/cli/source/tools/vsix/download.ts:1-10` (import from `@ztools/core`, keep local `downloadVsixToFile`)
- Delete: `apps/cli/source/lib/marketplace.ts`
- Create: `apps/cli/source/lib/download-file.ts`
- Create: `apps/cli/tsdown.config.ts`
- Modify: `apps/cli/test.tsx` → move pure-fn tests to core (Task 5), keep CLI-relevant tests
- Test: `packages/core/test/marketplace.test.ts` (added in Task 5)

- [ ] **Step 1: Copy CLI source tree**

Run (in repo root):
```bash
mkdir -p apps/cli
rsync -a --exclude node_modules --exclude dist --exclude package-lock.json \
  /Users/kylan.zhang/me/my-ink-cli/ apps/cli/
```
Expected: `apps/cli/source/cli.tsx` exists; no `node_modules` copied.

- [ ] **Step 2: Replace `apps/cli/package.json`**

```json
{
  "name": "@ztools/cli",
  "version": "0.0.0",
  "license": "MIT",
  "bin": {
    "ztools": "dist/cli.js"
  },
  "type": "module",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown --watch",
    "check-types": "tsgo --noEmit",
    "test": "ava"
  },
  "files": ["dist"],
  "dependencies": {
    "@ztools/core": "workspace:*",
    "@inquirer/prompts": "^7.0.0",
    "chalk": "^5.2.0",
    "ink": "^4.1.0",
    "ink-spinner": "^5.0.0",
    "ink-text-input": "^5.0.1",
    "meow": "^11.0.0",
    "ora": "^8.0.0",
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@sindresorhus/tsconfig": "^3.0.1",
    "@types/react": "^18.0.32",
    "@typescript/native-preview": "latest",
    "ava": "^5.2.0",
    "ink-testing-library": "^3.0.0",
    "prettier": "^2.8.7",
    "ts-node": "^10.9.1",
    "tsdown": "^0.9.0",
    "typescript": "^5.0.3"
  },
  "ava": {
    "extensions": {"ts": "module", "tsx": "module"},
    "nodeArguments": ["--loader=ts-node/esm"]
  },
  "prettier": "@vdemedes/prettier-config"
}
```

Note: drop `xo` (its `eslint-config-xo-react` pulls an old ESLint that conflicts in the workspace). Linting is handled at repo level later if desired. Verify exact dep versions against `my-ink-cli/package.json` after copy; keep whatever ink-* versions were installed there.

- [ ] **Step 3: Create `apps/cli/tsdown.config.ts`**

```ts
import {defineConfig} from 'tsdown';

export default defineConfig({
  entry: ['source/cli.tsx'],
  format: ['esm'],
  platform: 'node',
  dts: false,
  clean: true,
  outDir: 'dist',
});
```

The source file `source/cli.tsx` begins with `#!/usr/bin/env node`; tsdown preserves the shebang of the entry file. After build, verify `dist/cli.js` starts with `#!/usr/bin/env node` (see Step 8).

- [ ] **Step 4: Create `apps/cli/source/lib/download-file.ts`**

Move the Node-only download helper out of the old `marketplace.ts` into its own file:

```ts
import {createWriteStream} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';

export async function downloadVsixToFile(
  url: string,
  destPath: string,
): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`下载失败（HTTP ${response.status}）`);
  }

  if (!response.body) {
    throw new Error('下载失败：响应体为空');
  }

  await mkdir(path.dirname(destPath), {recursive: true});

  const nodeStream = Readable.fromWeb(
    response.body as Parameters<typeof Readable.fromWeb>[0],
  );
  await pipeline(nodeStream, createWriteStream(destPath));
}
```

- [ ] **Step 5: Delete old CLI marketplace module**

Run:
```bash
rm apps/cli/source/lib/marketplace.ts
```

- [ ] **Step 6: Rewrite imports in `apps/cli/source/tools/vsix/download.ts`**

Replace lines 1-10 (the import block) with:

```ts
import {stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {
  parseExtensionInput,
  resolveExtension,
  buildDownloadUrl,
  buildVsixFilename,
} from '@ztools/core';
import {downloadVsixToFile} from '../../lib/download-file.js';
```

The rest of `download.ts` (the `DownloadOptions`/`DownloadResult` types and `runVsixDownload`) is unchanged — it already calls `parseExtensionInput`, `resolveExtension`, `buildDownloadUrl`, `buildVsixFilename`, `downloadVsixToFile`.

- [ ] **Step 7: Install**

Run (repo root):
```bash
pnpm install
```
Expected: `@ztools/cli` resolves `@ztools/core` via workspace link (no error).

- [ ] **Step 8: Build CLI and verify shebang**

Run:
```bash
pnpm --filter @ztools/cli build
head -1 apps/cli/dist/cli.js
```
Expected: build succeeds; first line is `#!/usr/bin/env node`. If the shebang is missing, add to `tsdown.config.ts`: `outputOptions: {banner: '#!/usr/bin/env node'}` and rebuild.

- [ ] **Step 9: Smoke-test the CLI binary**

Run:
```bash
node apps/cli/dist/cli.js --help
```
Expected: prints the usage block including `$ ztools vsix <extension>`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(cli): migrate Ink CLI to apps/cli using @ztools/core, rename bin to ztools"
```

---

## Task 4: Migrate extension into apps/extension (@ztools/extension)

**Files:**
- Create: `apps/extension/` (copied tree from `devtools-newtab`, excluding `node_modules`, `dist`)
- Modify: `apps/extension/package.json`
- Modify: `apps/extension/src/lib/marketplace.ts` (keep only `downloadVsix`; re-export rest from `@ztools/core`)
- Modify: `apps/extension/src/tools/vsix/VsixDownloader.tsx:1-9` (import from `@ztools/core` + local download)

- [ ] **Step 1: Copy extension source tree**

Run (repo root):
```bash
mkdir -p apps/extension
rsync -a --exclude node_modules --exclude dist \
  /Users/kylan.zhang/blofin/devtools-newtab/ apps/extension/
```
Expected: `apps/extension/src/App.tsx`, `apps/extension/public/manifest.json`, `apps/extension/vite.config.ts` exist.

- [ ] **Step 2: Update `apps/extension/package.json`**

Set `"name": "@ztools/extension"` and add the core dependency. Merge into the existing file (keep existing scripts `dev`/`build`/`preview` and all existing dependencies/devDependencies):

```json
{
  "name": "@ztools/extension",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@ztools/core": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

Keep the existing `devDependencies` block from the copied file (`@tailwindcss/vite`, `@types/chrome`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `tailwindcss`, `typescript`, `vite`) unchanged.

- [ ] **Step 3: Rewrite `apps/extension/src/lib/marketplace.ts`**

Replace the entire file. Re-export shared logic from `@ztools/core`, keep only the browser-specific `downloadVsix`:

```ts
export {
  parseExtensionInput,
  resolveExtension,
  buildDownloadUrl,
  buildVsixFilename,
} from '@ztools/core';
export type {ExtensionRef, ResolvedExtension} from '@ztools/core';

/**
 * Triggers the download via chrome.downloads, with an anchor-click dev fallback.
 */
export function downloadVsix(
  url: string,
  filename: string,
  saveAs: boolean,
): Promise<number | void> {
  const chromeApi = (globalThis as {chrome?: typeof chrome}).chrome;
  if (chromeApi?.downloads?.download) {
    return new Promise((resolve, reject) => {
      chromeApi.downloads.download({url, filename, saveAs}, (id) => {
        const err = chromeApi.runtime?.lastError;
        if (err) reject(new Error(err.message));
        else resolve(id);
      });
    });
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return Promise.resolve();
}
```

`VsixDownloader.tsx` imports `parseExtensionInput`, `resolveExtension`, `buildDownloadUrl`, `buildVsixFilename`, `downloadVsix` from `../../lib/marketplace` — those names are still exported from this file, so no change needed in `VsixDownloader.tsx`.

- [ ] **Step 4: Install**

Run (repo root):
```bash
pnpm install
```
Expected: `@ztools/extension` links `@ztools/core`.

- [ ] **Step 5: Build extension**

Run:
```bash
pnpm --filter @ztools/extension build
```
Expected: `apps/extension/dist/` produced with `index.html`, `manifest.json` (from `public/`), and JS assets. No TS errors from the `@ztools/core` import.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(extension): migrate Chrome extension to apps/extension using @ztools/core"
```

---

## Task 5: Move pure-function tests into @ztools/core

**Files:**
- Create: `packages/core/test/marketplace.test.ts`
- Modify: `packages/core/package.json` (add `test` script + ava config)
- Modify: `apps/cli/test.tsx` (remove the moved pure-fn tests)

- [ ] **Step 1: Add ava to core `package.json`**

Add to `packages/core/package.json` `scripts`: `"test": "ava"`, and add devDeps `"ava": "^5.2.0"`, `"ts-node": "^10.9.1"`. Add at top level:

```json
"ava": {
  "extensions": {"ts": "module"},
  "nodeArguments": ["--loader=ts-node/esm"]
}
```

- [ ] **Step 2: Write the test file `packages/core/test/marketplace.test.ts`**

```ts
import test from 'ava';
import {
  parseExtensionInput,
  buildDownloadUrl,
  buildVsixFilename,
} from '../src/marketplace.js';

test('parseExtensionInput accepts publisher.extension', t => {
  t.deepEqual(parseExtensionInput('ms-python.python'), {
    publisher: 'ms-python',
    name: 'python',
  });
});

test('parseExtensionInput accepts marketplace URL', t => {
  t.deepEqual(
    parseExtensionInput(
      'https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode',
    ),
    {publisher: 'esbenp', name: 'prettier-vscode'},
  );
});

test('parseExtensionInput rejects invalid input', t => {
  t.is(parseExtensionInput('invalid'), null);
  t.is(parseExtensionInput(''), null);
});

test('buildDownloadUrl and buildVsixFilename', t => {
  const ref = {publisher: 'ms-python', name: 'python'};
  t.is(
    buildDownloadUrl(ref, '2024.20.0'),
    'https://marketplace.visualstudio.com/_apis/public/gallery/publishers/ms-python/vsextensions/python/2024.20.0/vspackage',
  );
  t.is(buildVsixFilename(ref, '2024.20.0'), 'ms-python.python-2024.20.0.vsix');
});
```

- [ ] **Step 3: Run core tests**

Run:
```bash
pnpm --filter @ztools/core test
```
Expected: 4 tests pass.

- [ ] **Step 4: Trim CLI tests**

Edit `apps/cli/test.tsx`: remove the `parseExtensionInput` / `buildDownloadUrl` / `buildVsixFilename` tests now living in core. If nothing CLI-specific remains, replace the file body with a single placeholder so ava has a test:

```tsx
import test from 'ava';
import {runVsixDownload} from './source/tools/vsix/download.js';

test('runVsixDownload rejects unparseable input', async t => {
  const result = await runVsixDownload({input: 'not-valid'});
  t.false(result.success);
  t.regex(result.message, /无法解析/);
});
```

- [ ] **Step 5: Run CLI tests**

Run:
```bash
pnpm --filter @ztools/cli test
```
Expected: the test passes (no network: `parseExtensionInput` returns null before any fetch).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test(core): move marketplace pure-fn tests to @ztools/core"
```

---

## Task 6: Wire turbo.json and root scripts

**Files:**
- Modify: `/Users/kylan.zhang/me/ztools/turbo.json`
- Modify: `/Users/kylan.zhang/me/ztools/package.json` (root scripts)
- Modify: `/Users/kylan.zhang/me/ztools/README.md`

- [ ] **Step 1: Replace `turbo.json`**

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "check-types": {
      "dependsOn": ["^check-types"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 2: Update root `package.json` scripts**

Set the `scripts` block to:

```json
"scripts": {
  "build": "turbo run build",
  "dev": "turbo run dev",
  "test": "turbo run test",
  "check-types": "turbo run check-types",
  "format": "prettier --write \"**/*.{ts,tsx,md}\""
}
```

- [ ] **Step 3: Build everything through turbo**

Run (repo root):
```bash
pnpm build
```
Expected: `@ztools/core`, `@ztools/cli`, `@ztools/extension` all build; core builds before its dependents (`^build` ordering).

- [ ] **Step 4: Run all tests through turbo**

Run:
```bash
pnpm test
```
Expected: core + cli test tasks pass.

- [ ] **Step 5: Replace README**

Overwrite `/Users/kylan.zhang/me/ztools/README.md`:

```markdown
# ztools

Personal developer tools, available both as a CLI and a Chrome extension.

## Packages

- `@ztools/core` — shared VS Code Marketplace logic (parse/resolve/build URL).
- `@ztools/cli` — Ink-based terminal app. Binary: `ztools`.
- `@ztools/extension` — Chrome new-tab dashboard (Vite + React + Tailwind).

## Develop

```sh
pnpm install
pnpm build              # build all
pnpm dev                # watch all
pnpm test               # run tests
```

## CLI

```sh
pnpm --filter @ztools/cli build
node apps/cli/dist/cli.js            # interactive dashboard
node apps/cli/dist/cli.js vsix esbenp.prettier-vscode
```

To install globally: `cd apps/cli && pnpm link --global` (exposes `ztools`).

## Extension

```sh
pnpm --filter @ztools/extension build
# load apps/extension/dist as an unpacked extension in Chrome
```
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: wire turbo tasks, root scripts, and README for ztools"
```

---

## Task 7: Final verification

- [ ] **Step 1: Clean build from scratch**

Run (repo root):
```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
pnpm build
```
Expected: all three packages build with no errors.

- [ ] **Step 2: Verify CLI binary link**

Run:
```bash
cd apps/cli && pnpm link --global && cd ../..
ztools --help
```
Expected: usage block with `$ ztools vsix <extension>`.

- [ ] **Step 3: Verify type-checking**

Run:
```bash
pnpm check-types
```
Expected: passes for all packages. (If `tsgo`/`@typescript/native-preview` failed to install, the fallback `tsc --noEmit` from Task 2 Step 1 applies.)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify ztools monorepo builds end-to-end"
```

---

## Notes for the implementer

- **Originals are not deleted.** `my-ink-cli` and `devtools-newtab` stay in place; the user removes them after verifying.
- **tsgo availability:** `tsgo` is distributed via `@typescript/native-preview`. If `pnpm install` cannot resolve it, switch every `check-types` script to `tsc --noEmit` and drop the `@typescript/native-preview` devDep. This is the only sanctioned deviation.
- **ink-* versions:** After copying the CLI, keep the exact `ink`, `ink-text-input`, `ink-spinner` versions that were already working in `my-ink-cli` (4.x / 5.x line). Do not upgrade `ink` to 5+, and do NOT reintroduce `ink-multi-select` (it is CJS and breaks under ESM `ink`).
- **No `packages/core` Node imports:** core must stay environment-agnostic. If you ever need `node:*` there, it belongs in the CLI instead.
```
