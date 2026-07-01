# @v-kit/cli

## 0.3.0

### Minor Changes

- 18bf9ec: 新增「查看管理 Node 端口」工具：列出 macOS 上 node 进程的 TCP 监听端口，支持过滤、Table 展示、选中高亮与 Confirm 确认后关闭占用进程。

### Patch Changes

- Updated dependencies [18bf9ec]
  - @v-kit/core@0.3.0

## 0.2.0

### Minor Changes

- 重构 vsix-sync 交互：用逐项状态列表（等待/下载/成功/失败）替代单一进度条，去掉独立的步骤条与成功页，原地完成并更新文案（安装中 / 安装完成）。新增常驻 VKIT 大标题 Banner（所有界面可见），统一在键盘提示上方加分隔线，并优化相关文案与术语（扩展 → 插件）。

### Patch Changes

- @v-kit/core@0.2.0

## 0.1.1

### Patch Changes

- c3d0bed: 更新 README：精简文档，补充同步功能与升级提示说明。
- Updated dependencies [c3d0bed]
  - @v-kit/core@0.1.1

## 0.1.0

### Minor Changes

- 7fd91c1: 新增「同步 VS Code 插件到 Cursor」命令（`vkit vsix-sync`），交互式选择缺失的插件并自动下载安装；新增启动时的新版本升级提示（update-notifier）。子进程调用迁移到 execa / which，安装逻辑更健壮。优化主面板：渐变大字标题、功能列表与键盘提示样式。

### Patch Changes

- Updated dependencies [7fd91c1]
  - @v-kit/core@0.1.0

## 0.0.3

### Patch Changes

- 97ba18b: Re-enable npm provenance for published packages.
- Updated dependencies [97ba18b]
  - @v-kit/core@0.0.3

## 0.0.2

### Patch Changes

- 133a20f: Publish under the `@v-kit` scope; the CLI binary is now `vkit`.
- Updated dependencies [133a20f]
  - @v-kit/core@0.0.2

## 0.0.1

### Patch Changes

- publish
- Updated dependencies
  - @v-kit/core@0.0.1

## 0.0.2

### Patch Changes

- cee30de: publish
- Updated dependencies [cee30de]
  - vtools-core@0.0.2

## 0.0.1

### Patch Changes

- 750ae21: first publish
- Updated dependencies [750ae21]
  - vtools-core@0.0.1
