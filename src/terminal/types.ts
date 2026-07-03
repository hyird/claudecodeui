export type TerminalStatus = 'connecting' | 'connected' | 'disconnected' | 'exited' | 'error';

export type TerminalPreferences = {
  fontSize: number;
};

export type TerminalTab = {
  id: string;
  title: string;
  status: TerminalStatus;
};

export type TerminalTabsState = {
  tabs: TerminalTab[];
  activeId: string;
  nextIndex: number;
};

export type TerminalServerMessage =
  | { type: 'ready'; cwd: string; sessionId: string }
  | { type: 'output'; data: string }
  | { type: 'exit'; exitCode: number; signal?: string | null }
  | { type: 'error'; message: string }
  | { type: 'pong' }
  | { type: string; [key: string]: unknown };

export type TerminalTabsServerMessage =
  | { type: 'tabs'; state: TerminalTabsState }
  | { type: 'pong' }
  | { type: string; [key: string]: unknown };
