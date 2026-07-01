# Port Viewer Design

Date: 2026-07-01  
Status: Approved

## Goal

给 `vkit` CLI 新增一个「查看 / 释放端口」工具 `port-viewer`：列出正在监听的 TCP 端口及其进程，帮助开发时定位「3000 端口被占，却不知道是谁启动的」，并支持一键关闭占用进程。

仅支持 macOS（底层用 `lsof`）。

## UX

进入 Dashboard 选择「查看 / 释放端口」后进入子工具，交互为一个 phase 状态机：

- `loading`：跑 `lsof` 时显示 spinner。
- `list`：
  - 顶部过滤输入框，输入端口号或进程名实时过滤（如 `3000` / `node`）。
  - 单选高亮列表，每行展示：`端口  进程名  PID  启动命令`。命令过长按面板宽度截断（`…`）。
  - 列表带滚动窗口（参考 `useMultiSelectList` 的窗口逻辑），短终端不错行。
  - 键位：`↑↓ 移动`、`输入 过滤`、`k/↵ 关闭`、`r 刷新`、`Esc 返回`。
- `confirm`：关闭前确认，显示「即将关闭 端口 <port> · <command> · PID <pid>？」，`↵ 确认` / `Esc 取消`，防误杀。
- `killing`：执行关闭；成功后自动重新扫描回到 `list`。
- `error`：lsof 不存在 / 无监听端口 / 无权限 / 关闭失败时展示明确原因，`↵ / q` 返回。

空列表提示「当前没有监听中的 TCP 端口」；过滤无结果提示「没有匹配的端口」。

## Data source & scope

- 只列 **TCP LISTEN** 状态端口（正在等待连接的服务）。
- 列表信息：端口 + 进程名 + PID + 完整启动命令/路径。

## Structure

沿用现有 tool 的「逻辑 / UI 分离」约定：

```
source/tools/port/
├── ports.ts          # 纯逻辑 + 类型
└── PortViewerApp.tsx  # Ink UI
```

- `registry.ts` 新增：`{ id: 'port-viewer', name: '查看 / 释放端口', description: '列出正在监听的端口及其进程，一键关闭占用（如 3000 被占）', available: true }`。
- `Dashboard.tsx` 新增 `activeTool === 'port-viewer'` 分支，渲染 `<PortViewerApp onBack={...} />`。

## Logic (`ports.ts`)

```ts
type PortEntry = {
  port: number;
  pid: number;
  command: string;      // 进程名（lsof COMMAND）
  fullCommand: string;  // 完整启动命令（ps 补全）
  protocol: 'tcp';
};

listListeningPorts(): Promise<PortEntry[]>
killPort(pid: number): Promise<void>
```

- `listListeningPorts`：
  - `execa('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN', '-F', ...])`，用 lsof `-F` 机器可读格式解析（比按列切文本更稳），得到 port / pid / command。
  - 对去重后的 PID 批量跑一次 `ps -o command= -p <pids>` 补全 `fullCommand`。
  - 按端口号升序返回；同一进程监听多个端口时，每个端口一行。
  - lsof 缺失 / 无结果 / 无权限抛出带明确 message 的错误，交给 UI 的 `error` phase 展示。
- `killPort`：调用 `fkill(pid, { force: false, forceAfterTimeout: 3000 })` —— 先 `SIGTERM` 优雅退出，3s 未退再 `SIGKILL` 强制。

## Dependencies

- 新增 `fkill`（sindresorhus 出品，与项目已用的 `execa` / `ora` / `chalk` 同生态），内置 SIGTERM→SIGKILL 升级，避免手写信号升级样板。
- 复用现有依赖：`execa`、`ink`、`ink-text-input`、`ink-spinner`，以及共享 UI 组件 `Divider` / `KeyHint`。

## Out of scope

- Windows / Linux 支持（仅 macOS）。
- UDP、非 LISTEN 连接（ESTABLISHED 等）。
- 多选批量关闭（本期单个关闭）。
- 定时自动轮询刷新（仅关闭后自动刷新 + `r` 手动刷新）。
- 脚本模式（`vkit port ...` 非交互）——本期只做 TUI 子工具。
