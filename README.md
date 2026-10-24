# Cloud Terminal

一个轻量的 Web 终端界面，专注于多标签终端体验。

## 功能

- 多标签 Web 终端
- 标签和浏览器标题只显示当前工作目录；Linux 自动跟踪 shell 路径，终端程序设置的任务标题不会覆盖它
- 管理员添加协作者；每个账户有独立的标签和 PTY 会话
- 断线后自动重连，恢复当前屏幕和保留的历史
- 主题和字号设置
- 自动适配终端尺寸
- 支持手机横竖屏、软键盘和安全区；标签栏可左右滑动，终端可上下滑动查看历史输出
- 移动端快捷键栏提供键盘开关、Esc、Tab、Ctrl+C 和方向键；全屏终端应用的滑动遵循其鼠标或方向键模式
- 每个终端标签使用一个 `/terminal` WebSocket，承载输入、输出、尺寸更新和消费确认
- 切换标签不会断开连接或重新恢复历史
- 整个界面（包括登录页）统一使用 Maple Mono NF CN 编程字体，包含 Nerd Font 图标和 2:1 中英文等宽字形；不依赖外部字体服务
- Unicode 15 emoji/组合字符占列支持
- Linux systemd 部署通过独立 Node.js / node-pty 服务保留更新前的终端会话
- 历史最多保留最近 10,000 行；恢复快照按 16 MiB 预算进一步裁掉旧行，保留完整当前屏幕
- 原生滚轮和滚动条同步更新，无需服务端滚动往返
- 刷新时整份压缩快照一次恢复，解析完成后发送待确认输入，避免逐行滚动和重复执行命令

首次启动时创建管理员账户，登录后可从工具栏的“管理协作者”添加或移除账户。
移除账户会结束该账户的终端会话。账户之间的终端状态独立，但 PTY 仍以
同一个服务器系统用户运行；需要文件或进程级隔离时，应使用独立容器或系统账户。
每个账户同一时间只有一个有效页面：新登录会让旧登录退出；同一浏览器新打开的标签页会在加载时
换发新会话（`POST /api/auth/session`），之前的标签页随即退出并提示“已在另一个浏览器标签页中打开”。

## 开发

需要 Node.js 24 或更新版本，依赖以 `package-lock.json` 为准。
HTTP 使用 Hono 的 Node 适配器，WebSocket 使用 `ws`，SQLite 使用 `better-sqlite3`，PTY 使用 `node-pty`。

```bash
npm ci
npm run dev
```

打开 http://localhost:5173。

代码按职责组织：

- `server/index.js` 负责装配，HTTP 鉴权、WebSocket 分发、标签状态、终端会话和快照恢复分别在独立模块中。
- `src/App.tsx` 负责页面组合；标签状态与连接在 `use-terminal-tabs.ts`，拖动和键盘交互在 `TerminalTabs.tsx`。
- `TerminalPane.tsx` 负责终端组件生命周期；单 WebSocket 连接在 `connection.ts`，输入确认状态在 `input-state.ts`，尺寸计算和渲染配置分别在布局与渲染模块中。
- `server/pty-broker.js` 仍是独立进程入口，通过 `pty-channel.js` 与 Web 服务通信。

终端和界面字体都使用 Maple Mono NF CN v7.9（系统字体仅作后备），字体与授权文件在
`packages/terminal-fonts/`。这是私有 npm 工作区依赖 `@cloud-terminal/maple-mono-nf-cn`，
`npm ci` 安装后自动同步到生成目录 `public/fonts/`（并删除包里已不存在的旧文件），
构建与开发时也会检查并同步。
每个字重按 `unicode-range` 拆成 15 个 WOFF2 分块（base、cjk、han01–han10、nerd、mdi、ext），
浏览器只下载页面实际用到的分块；首屏预加载常规和粗体的 base 分块（ASCII、Latin-1、标点、
制表符、Powerline 和常用 Nerd 图标）。后续分块加载完成后终端会清空字形缓存并重绘。
版本化文件名使用长期缓存，分块方案改变时必须改文件名。
`scripts/build-terminal-fonts.py` 用官方 ZIP 和 SHA256 文件重新生成分块和
`maple-mono-nf-cn.css`，逐码点校验字形、步进宽度和垂直度量，输出与提交内容逐字节一致；
依赖 fonttools 4.66.1 和 brotli 1.2.0（见脚本说明）。

PTY 使用 Microsoft 的 `node-pty` 包，通过原生 PTY 事件接收输出。
安装时可能需要 Python 和 C++ 编译工具；Linux 可安装 `python3 make g++`，
Windows 使用 Visual Studio C++ Build Tools。构建和部署必须在目标平台上执行，不能跨平台复制原生模块。
终端打开前等待常规和粗体的基础字体加载完成，避免用后备字体的尺寸启动 PTY 后再改变网格。
下行输出只在同一轮事件循环内合并，按 16 KiB 拆帧；终端绘制由 xterm 原生动画帧和脏行调度。
参考 [xterm 流控指南](https://xtermjs.org/docs/guides/flowcontrol/) 和 ttyd 的流控机制，
浏览器通过 `terminal.write` 的完成回调累计确认已解析的输出序号（每 64 KiB 或 50 ms 一次）。
未消费输出达到 256 KiB 时暂停 PTY，降到 64 KiB 后恢复；输入和心跳仍可发送。
后台标签继续接收和解析输出，通过隐藏容器触发 xterm 原生暂停绘制，切回时整屏重绘一次；WebGL 上下文丢失后会自动重建
（30 秒内连续丢失 3 次后退回 DOM 渲染）。
参考 [ttyd](https://github.com/tsl0922/ttyd/blob/main/html/src/components/terminal/xterm/index.ts)
和 [VS Code](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/terminal/browser/xterm/xtermTerminal.ts)
的接入方式，终端输出、能力探测和局部刷新由 xterm 原生处理，不添加 OMP/Vim 特判，也不修改渲染器私有方法。
FitAddon 在选定渲染器后测量独立内容容器，避免从取整后的屏幕高度反推单元格尺寸。
服务端无头终端解析使用相同的高低水位背压，每个字节都会解析，不跳过解析。
多个消费者同时积压时，要全部恢复到低水位才会恢复读取；断开浏览器会释放该浏览器的暂停状态，
后台命令继续运行。持久 PTY 通道通过 Node 流的 pause/resume 和 write/drain 传递背压。
恢复快照在 zlib 线程池压缩，不阻塞事件循环；压缩期间暂停生产者以限制待发送队列。
尺寸变化后自动回到底部，等待滚动条更新高度后继续跟随。

尺寸变更与输出共用有序下行：浏览器只请求新尺寸，等旧尺寸输出解析完成后再切换网格。
持久模式利用原有 PTY 连接的命令顺序确认尺寸边界，无需重启 PTY 服务；
恢复快照带上实际网格尺寸，后续尺寸变更与实时输出按 WebSocket 顺序处理。

会话恢复采用 [VS Code 的无头终端序列化思路](https://github.com/microsoft/vscode/blob/main/src/vs/platform/terminal/node/ptyService.ts)：
每次浏览器连接都先恢复完整快照，再接收实时输出。不在 Web 服务保存第二份增量回放日志，
也不在浏览器维护乱序缓冲或缺号重试。独立 PTY 服务内部的短日志仅用于原子衔接快照与实时订阅，
避免 Web 服务重启后的连接切换丢失输出。输入保留序号和确认，重连时只重试未确认输入；
会话代次改变时丢弃旧输入，防止将旧命令发送到新 shell。

测试分三部分：服务端用例跑在 `node:test` 上；前端组件行为和持久会话用例由 Vitest 在 Node 中运行；
`tsconfig.spec.json` 对 spec 做类型检查。组件用例继续使用 `src/terminal/test-support/component-harness.ts`。

```bash
npm run build   # SPA fallback 和压缩用例需要真实的 dist/
npm test        # 依次运行 test:types、test:node、test:spec，任一失败则整体失败
```

部署脚本用例需要 POSIX bash，在 Windows 上跳过。`npm run smoke:browser -- <url> <token>
<desktop.png> <mobile.png>` 通过 CDP（`CDP_PORT`，默认 9223）驱动真实 Chromium 做界面冒烟。
CI 会检查提交的 `proto/` 与 `npm run proto` 输出一致。
服务端由 esbuild 生成 Node ESM 产物，并将原生模块及其依赖复制到 `dist-server/node_modules/`；
部署时必须携带整个 `dist-server/`，包括声明 ESM 的 `package.json`。

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
自动连接回原来的 shell；标签顺序、当前标签和已退出标签在变化时保存到 SQLite。
不要在更新时重启 PTY 服务，也不要把它设置成 Web 服务的 `PartOf`。
PTY 服务通过权限为 0600 的 Unix socket 转发原始字节，不包装终端屏幕；
历史滚动由浏览器 xterm 完成。输入确认和去重只由 PTY 服务处理，不写入 SQLite。
Web 服务与 PTY 服务保持一条异步控制连接，缓存服务推送的存活会话列表；
shell 退出后 PTY 服务立即释放该会话。

`deploy/*.service` 是带 `@NAME@` 占位符的模板，由两个部署脚本通过
`deploy/render-unit.sh` 渲染，不能直接复制到 `/etc/systemd/system`。
Web 服务启用沙箱：只有 `<base>/data` 和 `/run/cloud-terminal` 可写，主目录只读。
PTY 服务承载用户 shell，故意不加沙箱，以免 sudo、挂载等操作失效；其工作目录为用户主目录。
`deploy-local.sh` 整体替换 `dist/`，旧的版本化字体会被清除。

在远端 Debian 切换到服务账户使用 `sudo -iu cloudcli`。`sudo -i cloudcli` 会执行系统里
另一个 CloudCLI 命令；该程序的认证和 WebSocket 协议与本项目不同。

首次从旧架构迁移时，旧 PTY 无法转移到新服务。脚本仍会拒绝打断这些会话，
需要先结束旧会话；确认可以中断时才使用 `./scripts/deploy-local.sh --force`。
远程部署脚本 `./scripts/deploy.sh` 也会检查旧会话并配置独立 PTY 服务。它先 `git fetch`，
本地 HEAD 和目标提交都必须已在 `origin/<branch>` 中，否则拒绝部署；新版本先放到
`current.next` 再改名切换，停止 Web 服务后任何一步失败都会回滚到旧版本和旧 unit，
并重新启动旧 Web 服务。PTY 服务始终不重启。默认目标仍是 `cloudcli` 远端，可用
`DEPLOY_BRANCH`、`DEPLOY_GROUP`、`DEPLOY_HOME`、`DEPLOY_NODE` 覆盖。首次运行会用渲染出的
unit 替换手写的 `cloudcli.service`（手工添加的配置会丢失），删除
`20-persistent-terminals.conf` drop-in，并把数据库从 `<base>/.cloudcli.sqlite` 迁移到
`<base>/data/auth.sqlite`。

直接运行 `npm run dev` 默认使用普通 PTY。持久模式需要先以相同系统用户启动独立的
`node server/pty-broker.js`，再设置 `CLOUDCLI_PERSIST_TERMINALS=1`；`CLOUDCLI_PTY_SOCKET`
默认为 `/run/cloud-terminal/pty.sock`，开发时可改到用户可写目录。服务器重启或 PTY 服务退出仍会
结束 shell，会话保留的范围是 Web 程序更新。

`server/persistent-restart.spec.ts` 在 Linux/macOS 环境验证真实重启：
检查 shell PID、历史、标签和代次不变，重发未确认输入不会再次执行，Web 停止时后台命令继续输出。
在 Windows 上跳过该 Unix 服务测试，普通 Windows 开发使用 node-pty 的 ConPTY 后端。

从旧运行时迁移时，Node Web 服务仍兼容已运行的旧 PTY 服务。部署不会重启 PTY，
现有 shell 会继续运行；新 unit 的 Node 启动命令在下一次 PTY 服务启动时生效。
`/api/health` 的 `runtime` 是 Web 运行时，`persistentBackend` 是 PTY 服务实际报告的后端；
旧服务未报告后端时显示 `legacy-pty`，不会误报为已完成切换。
要立即切换 PTY 后端，必须先结束所有旧会话，再单独重启 PTY 服务。
