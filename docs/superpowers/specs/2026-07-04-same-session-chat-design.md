# Same-Session Chat View Design

## Goal

Add a chat-style front-end for Claude Code and Codex without creating a second agent session.

The terminal view and chat view must represent the same live PTY session:

- One backend terminal session.
- One `node-pty` child process tree.
- One current working directory and process state.
- One input path into the PTY.
- One output stream from the PTY.

The chat view is another renderer for the terminal session, not a replacement for the terminal and not a separate SDK conversation.

## Non-Goals

- Do not introduce Claude SDK or Codex SDK chat runs for this feature.
- Do not create independent chat sessions that only share a provider session id.
- Do not try to convert arbitrary shell usage into perfect chat messages.
- Do not remove or weaken the existing xterm terminal renderer.

## Existing System

The app currently has a terminal tab model in `src/App.tsx` and a terminal renderer in `src/terminal/TerminalPane.tsx`.

The backend keeps terminal sessions in `server/index.js`. Each session owns:

- A PTY.
- A terminal websocket attachment.
- A headless xterm snapshot for reconnect replay.
- A bounded replay state.

This is the correct source of truth for the new chat view.

## Proposed UX

Each terminal tab can switch between two synchronized views:

- Terminal: current xterm view.
- Chat: message-oriented view for Claude Code and Codex.

The toolbar should expose a compact segmented control or icon toggle near the active terminal controls. The default remains Terminal so existing behavior does not change.

The chat view shows:

- User messages submitted from the chat composer.
- User commands typed directly in the terminal when they are submitted with Enter.
- Assistant output parsed from PTY output.
- Tool/status blocks parsed from recognizable Claude Code or Codex output.
- Raw terminal blocks when output cannot be safely classified.

The chat composer sends text to the same PTY by appending a newline. The terminal should show the same input as if it had been typed there.

## Backend Design

Extend each terminal session with a `conversation` projection derived from the same PTY stream.

Suggested session fields:

- `conversationEvents`: bounded array of structured chat events.
- `pendingInput`: input accumulator for user-entered text before Enter.
- `terminalMode`: inferred mode such as `unknown`, `claude`, or `codex`.
- `parserState`: provider-specific incremental parser state.
- `conversationSubscribers`: websocket subscribers for chat view clients.

The existing terminal websocket remains responsible for raw terminal I/O. A new websocket path can be added for chat projection, for example `/terminal/conversation`, using the same auth and `sessionId` attachment pattern as `/terminal`.

The backend should broadcast conversation events whenever it observes:

- Input written to the PTY.
- Output emitted by the PTY.
- Session ready, exit, error, reconnect, or resize-relevant state.

All chat events must carry `sessionId` and a monotonically increasing `seq` so clients can reconnect and replay missed events without duplicating messages.

## Input Flow

There must be exactly one final write path into the PTY.

Terminal input:

1. `TerminalPane` sends `{ type: "input", data }` to `/terminal`.
2. Backend writes `data` to the PTY.
3. Backend also feeds `data` into the conversation input accumulator.
4. When the accumulator sees Enter, it emits a user message event.

Chat input:

1. `ConversationPane` sends `{ type: "submit", text }` to `/terminal/conversation`.
2. Backend converts it to `text + "\n"`.
3. Backend writes it to the same PTY through the same internal write helper used by terminal input.
4. Backend emits the same user message event.
5. Terminal view receives the PTY echo normally.

This keeps terminal-typed and chat-typed prompts synchronized.

## Output Flow

PTY output continues to be sent to the terminal renderer as raw ANSI/protobuf frames.

In parallel, the backend feeds the same output chunks into a conversation parser:

- Strip or interpret ANSI only for the chat projection.
- Preserve raw text in the event metadata for debugging and fallback.
- Coalesce streaming assistant text to avoid excessive event volume.
- Detect provider mode from process command and output markers.

For Claude Code and Codex, the parser should handle common patterns first:

- Prompt echo and submitted user prompt.
- Assistant text.
- Tool call/status blocks.
- Permission or confirmation prompts.
- Completion or error messages.

If classification is uncertain, emit a `terminal_block` event rather than dropping content.

## Frontend Design

Add a small `conversation` module under `src/terminal`:

- `ConversationPane.tsx`: chat UI for the active terminal tab.
- `conversationTypes.ts`: event and message types.
- `conversationParserClient.ts` or equivalent reducer for event-to-message state.
- Focused tests for synchronization expectations.

`App.tsx` should keep the active tab mounting behavior. Only the active tab renders either terminal view or conversation view to avoid websocket bursts.

The chat view should reconnect like the terminal websocket:

- Attach by `sessionId`.
- Receive initial replay from `seq = 0`.
- Track last `seq`.
- On reconnect, request missed events after last `seq`.

## Data Model

Initial event kinds:

- `ready`: session metadata.
- `user_message`: text submitted through terminal or chat.
- `assistant_delta`: streaming assistant text.
- `assistant_message`: finalized assistant text when known.
- `tool_event`: recognizable tool/status/permission output.
- `terminal_block`: fallback output block.
- `error`: parser or session error.
- `exit`: PTY exit.

The frontend can render deltas into stable message bubbles and keep raw fallback blocks visually distinct.

## Error Handling

Parser errors must never break the terminal.

Rules:

- Raw terminal output always continues.
- Conversation parser failures become `terminal_block` or `error` events.
- Unknown provider mode falls back to terminal blocks until Claude or Codex is detected.
- Chat submit is disabled when the PTY session is exited or unavailable.
- If the conversation websocket disconnects, terminal remains usable.

## Testing

Backend tests:

- Terminal input and chat submit both write to the same PTY helper.
- Terminal input ending with Enter emits `user_message`.
- Chat submit emits `user_message` and writes `text + "\n"` to the PTY.
- PTY output is still sent to terminal subscribers while conversation subscribers receive parsed events.
- Parser fallback emits `terminal_block` for unknown output.
- Conversation replay uses monotonic `seq`.

Frontend tests:

- View toggle does not create or restart a terminal session.
- Chat composer sends to the active terminal session id.
- Terminal and chat views share status from the same tab.
- Reconnect sends last known `seq`.
- Unknown output renders as a raw terminal block.

Manual verification:

- Start Claude Code in terminal view, switch to chat, submit a prompt, verify terminal shows the same prompt.
- Type a prompt in terminal view, switch to chat, verify it appears as a user message.
- Repeat with Codex.
- Restart or reconnect browser and verify both views replay consistent state.

## Implementation Order

1. Add backend session event projection and shared PTY write helper.
2. Add conversation websocket with replay and submit support.
3. Add minimal parser with fallback-first behavior.
4. Add frontend chat view toggle and `ConversationPane`.
5. Add Claude Code and Codex parser refinements.
6. Deploy behind the existing authenticated app surface.

## Open Design Decisions

The MVP should use a simple toggle, not a permanent split view. A split view can be added after the shared event model is proven.

The parser should be conservative. It is acceptable for MVP messages to contain raw terminal blocks when output shape is ambiguous. It is not acceptable for the chat view to lose output or create an independent agent process.
