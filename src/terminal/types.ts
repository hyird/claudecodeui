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
};

type TerminalServerMessageMeta = {
  seq?: number;
};

export type TerminalServerMessage =
  | ({ type: 'ready'; cwd: string; sessionId: string; reset: boolean; gap: boolean; lastSeq: number } & TerminalServerMessageMeta)
  | ({ type: 'output'; data: string } & TerminalServerMessageMeta)
  | ({ type: 'exit'; exitCode: number; signal?: string | null } & TerminalServerMessageMeta)
  | ({ type: 'error'; message: string } & TerminalServerMessageMeta)
  | ({ type: 'pong' } & TerminalServerMessageMeta)
  | { type: string; [key: string]: unknown };

export type TerminalTabsServerMessage =
  | { type: 'tabs'; state: TerminalTabsState }
  | { type: 'pong' }
  | { type: string; [key: string]: unknown };
