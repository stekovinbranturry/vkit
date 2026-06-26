# vtools

Personal developer tools, available both as a CLI and a Chrome extension.

## Packages

- `@v-kit/core` — shared VS Code Marketplace logic (parse/resolve/build URL).
- `@v-kit/cli` — Ink-based terminal app. Binary: `vkit`.
- `vtools-extension` — Chrome new-tab dashboard (Vite + React + Tailwind).

## Develop

```sh
pnpm install
pnpm build              # build all
pnpm dev                # watch all
pnpm test               # run tests
```

## CLI

```sh
pnpm --filter @v-kit/cli build
node apps/cli/dist/cli.js            # interactive dashboard
node apps/cli/dist/cli.js vsix esbenp.prettier-vscode
```

To install globally: `cd apps/cli && pnpm link --global` (exposes `vkit`).

## Publish to npm

Published packages: **`@v-kit/core`** (library) and **`@v-kit/cli`** (CLI). Both stay on the **same version** (`fixed` group in Changesets).

### One-time setup

1. On [npmjs.com](https://www.npmjs.com/), create an **Automation** access token with publish permission.
2. In GitHub repo **Settings → Secrets and variables → Actions**, add `NPM_TOKEN` with that token.
3. Ensure the npm package names `@v-kit/cli` and `@v-kit/core` are available (the `v-kit` npm org must exist and the token must have publish access to it).

### Release flow (automated)

1. In your feature PR, add a changeset when you change publishable packages:
   ```sh
   pnpm changeset
   ```
   Commit the generated `.changeset/*.md` file with your PR.

2. Merge the PR to `main`.

3. The [Release workflow](.github/workflows/release.yml) will open a **Version Packages** PR that bumps versions and updates changelogs.

4. Merge the Version Packages PR → CI builds and publishes to npm (order and `workspace:*` rewriting are handled by Changesets).

Users can then install globally:

```sh
npm install -g @v-kit/cli
vkit --help
```

### Local dry run

```sh
pnpm changeset version   # apply pending changesets locally
pnpm release             # build + publish (requires npm login)
```

## Extension

```sh
pnpm --filter vtools-extension build
# load apps/extension/dist as an unpacked extension in Chrome
```
