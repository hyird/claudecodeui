# Cloud Terminal

一个轻量的 Web 终端界面，专注于多标签终端体验。

## 功能

- 多标签 Web 终端
- 每个标签独立 PTY 会话
- 断线后短时间内可重连并回放输出
- 主题和字号设置
- 自动适配终端尺寸

## 开发

需要 Bun（服务端依赖 bun:sqlite 和 bun-pty），依赖以 `bun.lock` 为准。

```bash
bun install
bun run dev
```

打开 http://localhost:5173。

测试跑在 node:test 上（Bun 的 runner 无法承载 node:test 文件），所以还需要 Node：

```bash
bun run build   # SPA fallback 和压缩用例需要真实的 dist/
npm test
```
