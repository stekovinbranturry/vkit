# @ztools/cli

Ink-based CLI port of the [devtools-newtab](https://github.com/) browser extension. Use your dev tools from the terminal.

## Install

```bash
npm install
npm run build
npm link
```

## Usage

**Interactive dashboard** — pick a tool from the menu:

```bash
ztools
```

**VSIX downloader (script mode)**:

```bash
ztools vsix ms-python.python
ztools vsix esbenp.prettier-vscode --version 11.0.0
ztools vsix ms-python.python --out ./extensions/
```

**VSIX downloader (interactive form)**:

```bash
ztools vsix
```

## Tools

| Tool | Status |
|------|--------|
| VSIX 下载器 | Available |
| More tools | Coming soon |

## Development

```bash
npm run dev    # watch TypeScript
npm run build
node dist/cli.js
```

Design spec: [docs/superpowers/specs/2026-06-10-devtools-cli-design.md](docs/superpowers/specs/2026-06-10-devtools-cli-design.md)
