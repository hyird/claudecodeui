# CloudCLI Terminal Lite

一个从零重做的轻量 Web 终端，只保留多标签终端体验。

## 功能

- 多标签 Web 终端
- 每个标签独立 PTY 会话
- 断线后短时间内可重连并回放输出
- 主题和字号设置
- 自动适配终端尺寸

## 环境要求

- [Bun](https://bun.sh) ≥ 1.3（服务端运行时、包管理、构建、测试统一使用 Bun）

## 开发

```bash
bun install
bun run dev
```

打开 http://localhost:5173。

## 其他命令

```bash
bun run build     # 类型检查 + 前端构建
bun run start     # 生产模式启动服务端
bun test server/  # 运行测试
bun run proto     # 改动 proto/messages.proto 后重新生成编解码模块
```

## WebSocket 协议

前后端的 WebSocket 消息体统一使用 **protobuf** 编码,schema 是唯一事实来源:
[proto/messages.proto](proto/messages.proto)。改动后运行 `bun run proto` 重新生成
`proto/messages.js` / `proto/messages.d.ts`(生成物已入库,无需 protoc)。终端输出仍在
protobuf 帧内保留 DEFLATE 压缩。
