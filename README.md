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

## 本机 systemd 部署

当前工作站使用 `cloud-terminal.service`，应用文件安装到
`/opt/cloud-terminal/current`，SQLite 数据保存在
`/opt/cloud-terminal/data`。部署脚本会先构建并运行完整测试，成功后才覆盖产物和重启服务：

```bash
./scripts/deploy-local.sh
```

部署完成后打开 http://localhost:3001。常用检查命令：

```bash
sudo systemctl status cloud-terminal.service
sudo journalctl -u cloud-terminal.service -n 50 --no-pager
```

为避免更新时杀掉正在运行的 PTY，脚本检测到活跃终端会话时默认拒绝重启。
确认可以中断会话时可显式运行 `./scripts/deploy-local.sh --force`。
