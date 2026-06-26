# @v-kit/cli

在终端里安装 VS Code / Cursor 扩展。从 Marketplace 下载 `.vsix`，并一键安装到本地编辑器。

## 安装

需要 [Node.js](https://nodejs.org/) 18 或更高版本。

```bash
npm install -g @v-kit/cli
```

## 使用前准备

安装扩展需要系统里能调用 **`cursor`** 或 **`code`** 命令。请在对应编辑器中打开命令面板，执行 **「Shell Command: Install 'cursor' command in PATH」**（Cursor）或 **「Shell Command: Install 'code' command in PATH」**（VS Code）。

![在编辑器中安装 cursor / code 命令](https://raw.githubusercontent.com/stekovinbranturry/vtools/main/images/install-command.png)

安装完成后，在终端执行 `cursor --version` 或 `code --version` 确认可用。

## 使用

### 交互模式

在终端输入 `vkit` 进入主菜单，选择 **VSIX 安装器**：

![vkit 主菜单](https://raw.githubusercontent.com/stekovinbranturry/vtools/main/images/cli-1.png)

输入扩展 ID（如 `ms-python.python`）或 Marketplace 链接，按 Enter 开始下载：

![输入扩展名称或链接](https://raw.githubusercontent.com/stekovinbranturry/vtools/main/images/cli-2.png)

下载完成后，选择要安装到的编辑器（Cursor / VS Code），按空格切换、Enter 确认，默认全部选择：

![选择安装目标](https://raw.githubusercontent.com/stekovinbranturry/vtools/main/images/cli-3.png)

### 命令行模式

不进入菜单，直接下载并安装：

```bash
# 下载并安装最新版
vkit vsix ms-python.python

# 指定版本
vkit vsix esbenp.prettier-vscode --version 11.0.0

# 指定保存目录（默认 ~/Downloads）
vkit vsix ms-python.python --out ./extensions/
```

仅打开 VSIX 安装器表单（不经过主菜单）：

```bash
vkit vsix
```

## 快捷键

| 场景 | 操作 |
|------|------|
| 主菜单 | ↑/↓ 选择 · Enter 进入 · `q` 退出 |
| VSIX 安装器 | Enter 确认 · Esc 返回 |
| 选择编辑器 | ↑/↓ 移动 · 空格 切换 · Enter 确认 |

## 问题排查

- **未找到 cursor 或 code 命令**：按上文「使用前准备」在编辑器中安装 Shell 命令，并重启终端。
- **扩展 ID 怎么填**：打开 [VS Code Marketplace](https://marketplace.visualstudio.com/)，扩展页 URL 中的 `publisher.name` 即为 ID，例如 `ms-python.python`。

## 链接

- [GitHub](https://github.com/stekovinbranturry/vtools)
- [问题反馈](https://github.com/stekovinbranturry/vtools/issues)
