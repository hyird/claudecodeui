# Cloud Terminal

一个轻量的 Web 终端界面，专注于多标签终端体验。

## 功能

- 多标签 Web 终端
- 管理员添加协作者；每个账户有独立的标签和 PTY 会话
- 断线后短时间内可重连并回放输出
- 主题和字号设置
- 自动适配终端尺寸
- 上行、下行分别使用 `/terminal/input` 和 `/terminal/output` 两个 WebSocket
- 随网页提供 Maple Mono NF CN 编程字体，包含 Nerd Font 图标和 2:1 中英文等宽字形
- Unicode 15 emoji/组合字符占列支持
- Linux systemd 部署通过独立 bun-pty 服务保留更新前的终端会话
- 浏览器本地保存 10,000 行历史，原生滚轮和滚动条同步更新，无需服务端滚动往返

首次启动时创建管理员账户，登录后可从工具栏的“管理协作者”添加或移除账户。
移除账户会结束该账户的终端会话。账户之间的终端状态独立，但 PTY 仍以
同一个服务器系统用户运行；需要文件或进程级隔离时，应使用独立容器或系统账户。

## 开发

需要 Bun（服务端依赖 bun:sqlite 和 bun-pty），依赖以 `bun.lock` 为准。

```bash
bun install
bun run dev
```

打开 http://localhost:5173。

终端字体使用 Maple Mono NF CN v7.9，字体与授权文件在 `packages/terminal-fonts/`。
这是私有 Bun 工作区依赖 `@cloud-terminal/maple-mono-nf-cn`，`bun install` 安装后
自动复制到生成目录 `public/fonts/`，构建与开发时也会检查并复制。
字体以 WOFF2 提供，版本化文件名使用长期缓存；浏览器无需额外安装字体。
`scripts/build-terminal-fonts.py` 可用官方 ZIP 和 SHA256 文件重新生成网页字体，
只改变压缩格式，保留原始字形。

`bun-pty 0.4.11` 的读取循环通过 `patches/` 中的 Bun 补丁优化：输入会唤醒等待，
交互期间以 1ms 检查新输出，闲置后恢复 8ms 间隔。补丁随 `bun install` 自动应用。

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

脚本会创建独立的 `cloud-terminal-pty.service`，
终端里的 shell 和命令运行在该服务中。后续更新只重启 Web 服务，浏览器短暂断线后
自动连接回原来的 shell；标签顺序、当前标签和输入确认序号保存在 SQLite 中。
不要在更新时重启 PTY 服务，也不要把它设置成 Web 服务的 `PartOf`。
PTY 服务通过权限为 0600 的 Unix socket 转发原始字节，不包装终端屏幕；
历史滚动由浏览器 xterm 完成。输入确认和去重由 PTY 服务处理。

首次从旧架构迁移时，旧 PTY 无法转移到新服务。脚本仍会拒绝打断这些会话，
需要先结束旧会话；确认可以中断时才使用 `./scripts/deploy-local.sh --force`。
远程部署脚本 `./scripts/deploy.sh` 也会检查旧会话并配置独立 PTY 服务。

直接运行 `bun run dev` 默认使用普通 PTY。持久模式需要先以相同系统用户启动独立的
`bun server/pty-broker.js`，再设置 `CLOUDCLI_PERSIST_TERMINALS=1`；`CLOUDCLI_PTY_SOCKET`
默认为 `/run/cloud-terminal/pty.sock`，开发时可改到用户可写目录。服务器重启或 PTY 服务退出仍会
结束 shell，会话保留的范围是 Web 程序更新。

`server/persistent-restart.spec.ts` 在 Linux/macOS 环境验证真实重启：
检查 shell PID、历史、标签和代次不变，重发未确认输入不会再次执行，Web 停止时后台命令继续输出。
在 Windows 上跳过该 Unix 服务测试，普通 Windows 开发仍直接使用 bun-pty。
