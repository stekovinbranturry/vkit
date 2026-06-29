# @v-kit/cli

![vkit dashboard](https://raw.githubusercontent.com/stekovinbranturry/vkit/main/images/dashboard.png)

终端里的开发者工具箱（Your terminal dev toolbox）。

- **安装 VS Code / Cursor 插件** — 输入插件 ID 或 Marketplace 链接，下载 `.vsix` 并安装到 VS Code / Cursor。
- **同步插件到 Cursor** — 读取 VS Code 已装插件，把 Cursor 缺失的批量同步过去。
- **自动升级提示** — 有新版本时启动后友好提醒。


## 安装

需要 [Node.js](https://nodejs.org/) 18+。

```bash
npm install -g @v-kit/cli
```

## 使用前准备

安装插件需要系统里能调用 **`cursor`** 或 **`code`** 命令。请在对应编辑器中打开命令面板，执行 **「Shell Command: Install 'cursor' command in PATH」**（Cursor）或 **「Shell Command: Install 'code' command in PATH」**（VS Code）。

![在编辑器中安装 cursor / code 命令](https://raw.githubusercontent.com/stekovinbranturry/vkit/main/images/install-command.png)

安装完成后，在终端执行 `cursor --version` 或 `code --version` 确认可用。


## 使用

```bash
vkit              # 进入主菜单
vkit vsix-sync    # 同步 VS Code 插件到 Cursor
vkit vsix         # 打开 安装 VS Code / Cursor 插件表单

# 直接下载并安装某个插件
vkit vsix ms-python.python
vkit vsix esbenp.prettier-vscode --version 11.0.0
vkit vsix ms-python.python --out ./extensions/
```

界面均支持键盘操作，提示就在底部，按提示来即可。

## 链接

- [GitHub](https://github.com/stekovinbranturry/vkit)
- [问题反馈](https://github.com/stekovinbranturry/vkit/issues)
