import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import * as vm from 'node:vm';
import ts from 'typescript';
import headlessXterm from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';

type Listener = (event: { type: string; data?: unknown }) => void;

class FakeClock {
  private nextId = 1;
  private nowMs = 0;
  private timers = new Map<number, {
    callback: () => void;
    due: number;
    interval: number;
  }>();

  setTimeout(callback: () => void, delay: number) {
    const id = this.nextId++;
    this.timers.set(id, {
      callback,
      due: this.nowMs + Math.max(0, delay),
      interval: 0,
    });
    return id;
  }

  clearTimeout(id: number) {
    this.timers.delete(id);
  }

  setInterval(callback: () => void, delay: number) {
    const id = this.nextId++;
    this.timers.set(id, {
      callback,
      due: this.nowMs + Math.max(0, delay),
      interval: Math.max(1, delay),
    });
    return id;
  }

  clearInterval(id: number) {
    this.timers.delete(id);
  }

  advance(duration: number) {
    const target = this.nowMs + duration;
    while (true) {
      let nextId: number | undefined;
      let nextDue = Number.POSITIVE_INFINITY;
      for (const [id, timer] of this.timers) {
        if (timer.due <= target && timer.due < nextDue) {
          nextId = id;
          nextDue = timer.due;
        }
      }

      if (nextId === undefined) {
        break;
      }

      this.nowMs = nextDue;
      const timer = this.timers.get(nextId);
      if (!timer) {
        continue;
      }
      if (timer.interval === 0) {
        this.timers.delete(nextId);
      } else {
        timer.due += timer.interval;
      }
      timer.callback();
    }
    this.nowMs = target;
  }

  get pendingCount() {
    return this.timers.size;
  }
}

class FakeEventTarget {
  private listeners = new Map<string, Set<Listener>>();

  addEventListener(type: string, listener: Listener) {
    let listeners = this.listeners.get(type);
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(type, listeners);
    }
    listeners.add(listener);
  }

  removeEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type);
    listeners?.delete(listener);
    if (listeners?.size === 0) {
      this.listeners.delete(type);
    }
  }

  dispatch(type: string, data?: unknown) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener({ type, data });
    }
  }

  listenerCount(type: string) {
    return this.listeners.get(type)?.size ?? 0;
  }
}

class FakeSocket extends FakeEventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly sent: unknown[] = [];
  closeCalls = 0;
  readyState = FakeSocket.CONNECTING;
  binaryType = '';
  sendThrows = false;

  constructor(readonly url: string) {
    super();
  }

  send(value: unknown) {
    if (this.sendThrows) {
      throw new Error('socket send failed');
    }
    this.sent.push(value);
  }

  open() {
    this.readyState = FakeSocket.OPEN;
    this.dispatch('open');
  }

  close() {
    if (this.readyState === FakeSocket.CLOSED) {
      return;
    }
    this.closeCalls += 1;
    this.readyState = FakeSocket.CLOSED;
    this.dispatch('close');
  }

  emit(type: string, data?: unknown) {
    this.dispatch(type, data);
  }
}

function classList() {
  const values = new Set<string>();
  return {
    add: (...names: string[]) => names.forEach((name) => values.add(name)),
    remove: (...names: string[]) => names.forEach((name) => values.delete(name)),
    contains: (name: string) => values.has(name),
    toggle: (name: string, force?: boolean) => {
      const next = force === undefined ? !values.has(name) : force;
      if (next) values.add(name); else values.delete(name);
      return next;
    },
  };
}

function makeElement() {
  const screen = {
    isConnected: true,
    offsetWidth: 800,
    offsetHeight: 600,
    style: {} as Record<string, string>,
    classList: classList(),
  };
  const viewport = {
    isConnected: true,
    classList: classList(),
  };
  const element = {
    clientWidth: 800,
    clientHeight: 600,
    classList: classList(),
    style: {} as Record<string, string>,
    querySelector: (selector: string) => selector === '.xterm-screen' ? screen : viewport,
  };
  return { element, screen, viewport };
}

class FakeTerminal {
  cols = 80;
  rows = 24;
  readonly options: Record<string, unknown>;
  readonly buffer = { active: { baseY: 0, viewportY: 0, type: 'normal' } };
  readonly modes = { mouseTrackingMode: 'none', synchronizedOutputMode: false };
  readonly modeReportHandlers = new Map<string, (params: number[]) => boolean>();
  readonly parser = { registerCsiHandler: (id: { prefix?: string }, handler: (params: number[]) => boolean) => {
    const key = id.prefix ?? '';
    this.modeReportHandlers.set(key, handler);
    return { dispose: () => { this.modeReportHandlers.delete(key); } };
  } };
  readonly element = makeElement().element;
  readonly writes: string[] = [];
  private dataListener: ((data: string) => void) | undefined;
  private parsedListener: (() => void) | undefined;
  wheelHandler?: (event: { preventDefault(): void; stopPropagation(): void }) => boolean;
  disposed = false;
  refreshCalls = 0;

  constructor(options: Record<string, unknown>) {
    this.options = options;
  }

  loadAddon(addon: { activate?: (terminal: FakeTerminal) => void }) { addon.activate?.(this); }
  open() {}
  attachCustomKeyEventHandler() {}
  attachCustomWheelEventHandler(handler: typeof this.wheelHandler) { this.wheelHandler = handler; }
  onData(listener: (data: string) => void) {
    this.dataListener = listener;
    return {
      dispose: () => {
        if (this.dataListener === listener) {
          this.dataListener = undefined;
        }
      },
    };
  }
  emitData(data: string) { this.dataListener?.(data); }
  onTitleChange() { return { dispose() {} }; }
  onScroll() { return { dispose() {} }; }
  onWriteParsed(listener: () => void) { this.parsedListener = listener; return { dispose: () => { this.parsedListener = undefined; } }; }
  emitParsed() { this.parsedListener?.(); }
  onResize() { return { dispose() {} }; }
  writeln() {}
  write(data: string) { this.writes.push(data); }
  clear() {}
  refresh() { this.refreshCalls += 1; }
  resize(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
  }
  input(data: string) { this.emitData(data); }
  hasSelection() { return false; }
  getSelection() { return ''; }
  focus() {}
  blur() {}
  dispose() { this.disposed = true; }
}

class FakeResizeObserver {
  disconnected = false;

  constructor(readonly callback: () => void) {}
  observe() {}
  disconnect() { this.disconnected = true; }
}

type Harness = ReturnType<typeof createHarness>;

function createHarness() {
  const clock = new FakeClock();
  const window = new FakeEventTarget() as FakeEventTarget & Record<string, unknown>;
  const document = new FakeEventTarget() as FakeEventTarget & Record<string, unknown>;
  const sockets: FakeSocket[] = [];
  const root = { classList: classList() };
  const container = makeElement().element;
  const localStorage = new Map<string, string>();
  const terminalInstances: FakeTerminal[] = [];
  const rendererAddons: Array<{ disposed: boolean; contextLossListener?: () => void }> = [];
  const stateUpdates: unknown[] = [];

  Object.assign(window, {
    setTimeout: (callback: () => void, delay: number) => clock.setTimeout(callback, delay),
    clearTimeout: (id: number) => clock.clearTimeout(id),
    setInterval: (callback: () => void, delay: number) => clock.setInterval(callback, delay),
    clearInterval: (id: number) => clock.clearInterval(id),
    requestAnimationFrame: (callback: () => void) => clock.setTimeout(callback, 0),
    cancelAnimationFrame: (id: number) => clock.clearTimeout(id),
    getComputedStyle: () => ({ paddingLeft: '0px', paddingRight: '0px', paddingTop: '0px', paddingBottom: '0px' }),
    dispatchEvent: (event: { type: string }) => { window.dispatch(event.type); return true; },
  });
  Object.assign(document, {
    visibilityState: 'visible',
    documentElement: root,
    body: { appendChild() {}, removeChild() {} },
    title: '',
    createElement: () => ({ style: {}, select() {}, value: '' }),
    execCommand: () => true,
    dispatchEvent: (event: { type: string }) => { document.dispatch(event.type); return true; },
  });

  const setLocalStorage = {
    getItem: (key: string) => localStorage.get(key) ?? null,
    setItem: (key: string, value: string) => localStorage.set(key, value),
  };
  const navigator = { clipboard: undefined, onLine: true };

  const openAuthenticatedSocket = (path: string) => {
    const socket = new FakeSocket(path);
    sockets.push(socket);
    return socket;
  };

  const hooks = {
    effects: [] as Array<() => void | (() => void)>,
    refs: [] as Array<{ current: unknown }>,
    useCallback: <T extends (...args: never[]) => unknown>(callback: T) => callback,
    useEffect: (callback: () => void | (() => void)) => { hooks.effects.push(callback); },
    useLayoutEffect: () => {},
    useMemo: <T>(factory: () => T) => factory(),
    useRef: <T>(current: T) => {
      const ref = { current };
      hooks.refs.push(ref);
      return ref;
    },
    useState: <T>(initial: T | (() => T)) => {
      let value = typeof initial === 'function' ? (initial as () => T)() : initial;
      return [value, (next: T | ((previous: T) => T)) => {
        value = typeof next === 'function' ? (next as (previous: T) => T)(value) : next;
        stateUpdates.push(value);
      }] as const;
    },
  };

  const encode = (message: unknown) => JSON.stringify(message);
  const decode = async (raw: unknown) => {
    if (typeof raw !== 'string') return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  return {
    clock,
    window,
    document,
    sockets,
    container,
    localStorage: setLocalStorage,
    navigator,
    terminalInstances,
    rendererAddons,
    rendererUnavailable: false,
    stateUpdates,
    hooks,
    openAuthenticatedSocket,
    encode,
    decode,
    FakeSocket,
    FakeTerminal,
    FakeResizeObserver,
  };
}

type LoopKind = 'tabs' | 'terminal';

function loadLoop(kind: LoopKind, harness: Harness) {
  const sourceUrl = kind === 'tabs'
    ? new URL('../App.tsx', import.meta.url)
    : new URL('./TerminalPane.tsx', import.meta.url);
  const source = fs.readFileSync(sourceUrl, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: sourceUrl.pathname,
  }).outputText;

  const module = { exports: {} as Record<string, unknown> };
  const reactRuntime = {
    ...harness.hooks,
  };
  const jsxRuntime = {
    Fragment: Symbol('Fragment'),
    jsx: (type: unknown, props: unknown) => ({ type, props }),
    jsxs: (type: unknown, props: unknown) => ({ type, props }),
  };
  const iconRuntime = new Proxy({}, { get: () => function Icon() { return null; } });
  const authRuntime = { AuthGate: function AuthGate() { return null; } };
  const terminalPaneRuntime = {
    default: function TerminalPane() { return null; },
    clearTerminalInputStates() {},
    discardTerminalInputState() {},
  };
  const fitRuntime = { FitAddon: class { proposeDimensions() { return { cols: 80, rows: 24 }; } } };
  const emptyAddon = { ClipboardAddon: class {}, WebLinksAddon: class {} };
  const webglRuntime = { WebglAddon: class {
    disposed = false;
    contextLossListener?: () => void;
    constructor() { harness.rendererAddons.push(this); }
    activate() {
      if (harness.rendererUnavailable) throw new Error('WebGL unavailable');
    }
    onContextLoss(listener: () => void) {
      this.contextLossListener = listener;
      return { dispose: () => { this.contextLossListener = undefined; } };
    }
    dispose() { this.disposed = true; }
  } };
  const xtermRuntime = { Terminal: class extends harness.FakeTerminal {
    constructor(options: Record<string, unknown>) {
      super(options);
      harness.terminalInstances.push(this);
    }
  } };
  const wsCodecRuntime = {
    encodeTabsClientMessage: harness.encode,
    decodeTabsServerMessage: harness.decode,
    encodeTerminalClientMessage: harness.encode,
    decodeTerminalServerMessage: harness.decode,
  };
  const moduleCache = new Map<string, Record<string, unknown>>();
  const require = (specifier: string, from = sourceUrl): any => {
    if (specifier === 'react') return reactRuntime;
    if (specifier === 'react/jsx-runtime') return jsxRuntime;
    if (specifier === 'lucide-react') return iconRuntime;
    if (specifier === './auth') return authRuntime;
    if (specifier === './terminal/TerminalPane') return terminalPaneRuntime;
    if (specifier === '@xterm/addon-fit') return fitRuntime;
    if (specifier === '@xterm/addon-clipboard') return emptyAddon;
    if (specifier === '@xterm/addon-web-links') return emptyAddon;
    if (specifier === '@xterm/addon-webgl') return webglRuntime;
    if (specifier === '@xterm/addon-unicode-graphemes') return { UnicodeGraphemesAddon: class {} };
    if (specifier === '@xterm/xterm') return xtermRuntime;
    if (specifier === './themes') return { terminalTheme: {} };
    if (specifier === './clipboard') return {
      copyToClipboard: async () => true,
      readClipboardText: async () => '',
    };
    if (specifier === './terminal/wsCodec' || specifier === './wsCodec') return wsCodecRuntime;
    if (specifier === '../wsHost' || specifier === './wsHost') {
      return { openAuthenticatedSocket: harness.openAuthenticatedSocket };
    }
    if (specifier === '../uuid') return { createUuidV4: () => '00000000-0000-4000-8000-000000000001' };
    if (specifier === './auth/CollaboratorsDialog') return { default: () => null };
    if (specifier.startsWith('.')) {
      const candidates = ['.ts', '.tsx'].map((extension) => new URL(specifier + extension, from));
      const file = candidates.find((candidate) => fs.existsSync(candidate));
      if (file) {
        const cached = moduleCache.get(file.href);
        if (cached) return cached;
        const child = { exports: {} as Record<string, unknown> };
        moduleCache.set(file.href, child.exports);
        const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
          compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
          fileName: file.pathname,
        }).outputText;
        const run = vm.runInContext(`(function(require,module,exports){${compiled}\n})`, context);
        run((name: string) => require(name, file), child, child.exports);
        return child.exports;
      }
    }
    throw new Error(`Unexpected VM import: ${specifier}`);
  };

  const deterministicMath = Object.create(Math) as Math & { random: () => number };
  deterministicMath.random = () => 0;
  const context = vm.createContext({
    console,
    Math: deterministicMath,
    TextEncoder,
    TextDecoder,
    WebSocket: harness.FakeSocket,
    ResizeObserver: harness.FakeResizeObserver,
    window: harness.window,
    document: harness.document,
    localStorage: harness.localStorage,
    navigator: harness.navigator,
  });
  const wrapper = vm.runInContext(
    `(function (require, module, exports, __filename, __dirname) {${output}\nif (typeof TerminalApp !== 'undefined') module.exports.__recoveryTerminalApp = TerminalApp;\n})`,
    context,
  ) as (require: typeof require, module: typeof module, exports: typeof module.exports, filename: string, dirname: string) => void;
  wrapper(require, module, module.exports, sourceUrl.pathname, sourceUrl.pathname.slice(0, sourceUrl.pathname.lastIndexOf('/')));

  const component = (kind === 'tabs' ? module.exports.__recoveryTerminalApp : module.exports.default) as (props: Record<string, unknown>) => unknown;
  const props = kind === 'tabs'
    ? { authToken: 'test-token', user: { username: 'tester' }, onLogout: async () => {} }
    : {
      tab: { id: '00000000-0000-4000-8000-000000000001', title: 'Terminal', status: 'connecting' },
      active: true,
      focusOnMount: false,
      authToken: 'test-token',
      preferences: { fontSize: 14 },
      onStatusChange: () => {},
      onTitleChange: () => {},
    };
  component(props);

  if (kind === 'terminal') {
    harness.hooks.refs[0].current = harness.container;
  }

  const marker = kind === 'tabs' ? 'createTabsSocket' : 'connectTerminal';
  const effect = harness.hooks.effects.find((candidate) => candidate.toString().includes(marker));
  if (!effect) {
    throw new Error(`Could not locate ${kind} recovery effect`);
  }
  const cleanup = effect() ?? (() => {});
  return { cleanup, component };
}

function emitResume(harness: Harness, event: 'focus' | 'visibilitychange' | 'online') {
  if (event === 'visibilitychange') {
    harness.document.dispatch(event);
  } else {
    harness.window.dispatch(event);
  }
}

function pingCount(socket: FakeSocket) {
  return socket.sent.filter((message) => typeof message === 'string' && message.includes('"type":"ping"')).length;
}

function sentMessages(socket: FakeSocket) {
  return socket.sent
    .filter((message): message is string => typeof message === 'string')
    .map((message) => JSON.parse(message) as Record<string, unknown>);
}

function sentMessagesOfType(socket: FakeSocket, type: string) {
  return sentMessages(socket).filter((message) => message.type === type);
}

async function flushMicrotasks() {
  for (let index = 0; index < 20; index += 1) {
    await Promise.resolve();
  }
}

function emitServerMessage(harness: Harness, socket: FakeSocket, message: Record<string, unknown>) {
  socket.emit('message', harness.encode(message));
}

async function readyInputConnection(harness: Harness, generation: string) {
  await flushMicrotasks();
  const input = harness.sockets.at(-1)!;
  expect(input.url).toBe('/terminal/input');
  input.open();
  emitServerMessage(harness, input, { type: 'ready', sessionGeneration: generation });
  await flushMicrotasks();
  return input;
}

function makeFailureSequence(harness: Harness) {
  const reconnectDelays = [500, 1000, 2000];
  for (const delay of reconnectDelays) {
    const socket = harness.sockets.at(-1)!;
    socket.close();
    harness.clock.advance(delay);
  }
  const socket = harness.sockets.at(-1)!;
  socket.close();
  return socket;
}

describe('runtime socket recovery', () => {
  for (const kind of ['tabs', 'terminal'] as const) {
    test(`${kind} retries a socket stuck in CONNECTING after 10 seconds`, () => {
      const harness = createHarness();
      const { cleanup } = loadLoop(kind, harness);
      const first = harness.sockets[0];

      harness.clock.advance(9999);
      expect(harness.sockets).toHaveLength(1);
      expect(first.closeCalls).toBe(0);

      harness.clock.advance(1);
      expect(first.closeCalls).toBe(1);
      expect(harness.sockets).toHaveLength(1);

      harness.clock.advance(500);
      expect(harness.sockets).toHaveLength(2);
      expect(harness.sockets[1].readyState).toBe(FakeSocket.CONNECTING);
      cleanup();
    });

    test(`${kind} clears the CONNECTING watchdog when the socket opens`, () => {
      const harness = createHarness();
      const { cleanup } = loadLoop(kind, harness);
      const first = harness.sockets[0];

      first.open();
      harness.clock.advance(10000);

      expect(first.closeCalls).toBe(0);
      expect(harness.sockets).toHaveLength(1);
      cleanup();
    });

    test(`${kind} keeps the first pong deadline across repeated focus`, () => {
      const harness = createHarness();
      const { cleanup } = loadLoop(kind, harness);
      const first = harness.sockets[0];
      first.open();

      emitResume(harness, 'focus');
      expect(pingCount(first)).toBe(1);
      harness.clock.advance(2000);
      emitResume(harness, 'focus');
      expect(pingCount(first)).toBe(1);
      harness.clock.advance(500);

      expect(first.closeCalls).toBe(1);
      cleanup();
    });

    for (const event of ['focus', 'visibilitychange', 'online'] as const) {
      test(`${kind} ${event} bypasses a long reconnect backoff`, () => {
        const harness = createHarness();
        const { cleanup } = loadLoop(kind, harness);
        makeFailureSequence(harness);
        const before = harness.sockets.length;

        emitResume(harness, event);

        expect(harness.sockets).toHaveLength(before + 1);
        expect(harness.sockets.at(-1)?.readyState).toBe(FakeSocket.CONNECTING);
        cleanup();
      });
    }

    test(`${kind} cleanup cancels recovery timers and listeners`, () => {
      const harness = createHarness();
      const { cleanup } = loadLoop(kind, harness);
      const first = harness.sockets[0];

      expect(harness.clock.pendingCount).toBeGreaterThan(0);
      expect(harness.window.listenerCount('focus')).toBe(1);
      expect(harness.window.listenerCount('online')).toBe(1);
      expect(harness.document.listenerCount('visibilitychange')).toBe(1);

      cleanup();

      expect(harness.clock.pendingCount).toBe(0);
      expect(harness.window.listenerCount('focus')).toBe(0);
      expect(harness.window.listenerCount('online')).toBe(0);
      expect(harness.document.listenerCount('visibilitychange')).toBe(0);
      const socketCount = harness.sockets.length;
      harness.clock.advance(20000);
      first.emit('close');
      first.emit('error');
      expect(harness.sockets).toHaveLength(socketCount);
    });

    test(`${kind} ignores stale callbacks after a replacement socket is active`, () => {
      const harness = createHarness();
      const { cleanup } = loadLoop(kind, harness);
      const first = harness.sockets[0];

      // Let the first connection's watchdog create the replacement, then fire
      // late callbacks from the first socket against the live replacement.
      harness.clock.advance(10000);
      harness.clock.advance(500);
      const replacement = harness.sockets[1];
      expect(replacement).toBeDefined();
      first.emit('open');
      first.emit('error');
      first.emit('close');

      expect(replacement.closeCalls).toBe(0);
      expect(harness.sockets).toHaveLength(2);
      cleanup();
    });
  }
});

describe('terminal renderer recovery', () => {
  test('OMP sees synchronized output support and its current state through the input socket', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const output = harness.sockets[0];
    output.open();
    emitServerMessage(harness, output, { type: 'ready', sessionGeneration: 'mode-probe' });
    const input = await readyInputConnection(harness, 'mode-probe');
    const terminal = harness.terminalInstances[0];
    const query = terminal.modeReportHandlers.get('?')!;
    query([2026]);
    terminal.modes.synchronizedOutputMode = true;
    query([2026]);
    terminal.modes.synchronizedOutputMode = false;
    query([2026]);
    query([9999]);
    terminal.modeReportHandlers.get('')!([2026]);
    expect(sentMessagesOfType(input, 'input').map((message) => message.data)).toEqual([
      '\x1b[?2026;2$y', '\x1b[?2026;1$y', '\x1b[?2026;2$y', '\x1b[?9999;0$y', '\x1b[2026;0$y',
    ]);
    cleanup();
    expect(terminal.modeReportHandlers.size).toBe(0);
  });

  test('alternate-screen animation parses only dirty rows instead of forcing a full refresh', () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    terminal.buffer.active.type = 'alternate';
    const before = terminal.refreshCalls;
    for (let frame = 0; frame < 20; frame++) terminal.emitParsed();
    expect(terminal.refreshCalls).toBe(before);
    terminal.buffer.active.baseY = 20;
    terminal.buffer.active.viewportY = 10;
    terminal.emitParsed();
    expect(terminal.refreshCalls).toBeGreaterThan(before);
    cleanup();
  });

  test('mouse capture passes wheel events to the application even with zero local scrollback', () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    let blocked = false;
    const event = { preventDefault() { blocked = true; }, stopPropagation() {} };
    expect(terminal.wheelHandler?.(event)).toBe(false);
    expect(blocked).toBe(true);
    terminal.modes.mouseTrackingMode = 'any';
    blocked = false;
    expect(terminal.wheelHandler?.(event)).toBe(true);
    expect(blocked).toBe(false);
    cleanup();
  });

  test('downloaded terminal fonts redraw the existing renderer without reconnecting', async () => {
    const harness = createHarness();
    let releaseFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => { releaseFonts = resolve; });
    harness.document.fonts = { load: () => fontsReady };
    const { cleanup } = loadLoop('terminal', harness);
    const socket = harness.sockets[0];
    const terminal = harness.terminalInstances[0];
    const before = terminal.refreshCalls;
    releaseFonts();
    await flushMicrotasks();
    expect(terminal.refreshCalls).toBeGreaterThan(before);
    expect(terminal.options.fontFamily).toContain('Maple Mono NF CN');
    expect(harness.terminalInstances).toHaveLength(1);
    expect(harness.sockets).toHaveLength(1);
    expect(socket.closeCalls).toBe(0);
    cleanup();
  });

  test('a font download completing after unmount cannot revive timers or a disposed terminal', async () => {
    const harness = createHarness();
    let releaseFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => { releaseFonts = resolve; });
    harness.document.fonts = { load: () => fontsReady };
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    cleanup();
    const before = terminal.refreshCalls;
    releaseFonts();
    await flushMicrotasks();
    expect(terminal.disposed).toBe(true);
    expect(terminal.refreshCalls).toBe(before);
    expect(harness.clock.pendingCount).toBe(0);
  });

  test('ordinary output does not force a full viewport refresh for each frame', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const output = harness.sockets[0];
    output.open();
    emitServerMessage(harness, output, { type: 'ready', sessionGeneration: 'generation-1', reset: false });
    await readyInputConnection(harness, 'generation-1');
    const terminal = harness.terminalInstances[0];
    const before = terminal.refreshCalls;
    for (let seq = 1; seq <= 10; seq++) {
      emitServerMessage(harness, output, { type: 'output', data: `line ${seq}\r\n`, seq });
      await flushMicrotasks();
    }
    expect(terminal.writes).toHaveLength(10);
    expect(terminal.refreshCalls).toBe(before);
    expect(terminal.options.fontFamily).toContain('Maple Mono NF CN');
    expect(terminal.options.fontFamily).not.toContain('Microsoft YaHei');
    cleanup();
  });

  test('unavailable WebGL keeps the terminal connection usable', () => {
    const harness = createHarness();
    harness.rendererUnavailable = true;
    const { cleanup } = loadLoop('terminal', harness);
    const socket = harness.sockets[0];
    socket.open();

    expect(sentMessagesOfType(socket, 'init')).toHaveLength(1);
    expect(harness.rendererAddons[0].disposed).toBe(true);
    expect(harness.rendererAddons[0].contextLossListener).toBeUndefined();
    expect(harness.terminalInstances[0].disposed).toBe(false);
    cleanup();
  });

  test('context loss redraws the same terminal without replacing its socket', () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const socket = harness.sockets[0];
    socket.open();
    const terminal = harness.terminalInstances[0];
    const before = terminal.refreshCalls;
    const addon = harness.rendererAddons[0];
    addon.contextLossListener?.();

    expect(addon.disposed).toBe(true);
    expect(addon.contextLossListener).toBeUndefined();
    expect(terminal.refreshCalls).toBeGreaterThan(before);
    expect(terminal.disposed).toBe(false);
    expect(socket.closeCalls).toBe(0);
    expect(harness.sockets).toHaveLength(1);
    cleanup();
    expect(harness.clock.pendingCount).toBe(0);
  });
});

describe('terminal client snapshot recovery', () => {
  test('uplink failure reconnects the pair and keeps pending input for deduplicated retry', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const output = harness.sockets[0];
    output.open();
    emitServerMessage(harness, output, { type: 'ready', sessionGeneration: 'generation-1' });
    const input = await readyInputConnection(harness, 'generation-1');
    harness.terminalInstances[0].emitData('pending\r');
    input.close();
    expect(output.closeCalls).toBe(1);
    harness.clock.advance(500);
    const replacement = harness.sockets.at(-1)!;
    expect(replacement.url).toBe('/terminal/output');
    replacement.open();
    emitServerMessage(harness, replacement, { type: 'ready', sessionGeneration: 'generation-1' });
    const replacementInput = await readyInputConnection(harness, 'generation-1');
    expect(sentMessagesOfType(replacementInput, 'input')).toEqual([{ type: 'input', data: 'pending\r', inputSeq: 1 }]);
    cleanup();
    expect(harness.clock.pendingCount).toBe(0);
  });

  test('retains input queued before a first ready with an unknown generation', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    const socket = harness.sockets[0];

    terminal.emitData('queued before ready\r');
    socket.open();

    const init = sentMessagesOfType(socket, 'init')[0];
    expect(init.sessionGeneration).toBe('');
    emitServerMessage(harness, socket, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-1',
      sessionGeneration: 'generation-1',
      reset: false,
      gap: false,
      lastSeq: 0,
    });
    const input = await readyInputConnection(harness, 'generation-1');

    expect(sentMessagesOfType(socket, 'input')).toEqual([]);
    expect(sentMessagesOfType(input, 'input')).toEqual([
      { type: 'input', data: 'queued before ready\r', inputSeq: 1 },
    ]);
    cleanup();
  });

  test('retries the same pending input sequence across a same-generation reconnect until ack', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    const first = harness.sockets[0];

    first.open();
    emitServerMessage(harness, first, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-1',
      sessionGeneration: 'generation-1',
      reset: false,
      gap: false,
      lastSeq: 0,
    });
    const firstInput = await readyInputConnection(harness, 'generation-1');
    terminal.emitData('pending command\r');
    expect(sentMessagesOfType(firstInput, 'input')).toEqual([
      { type: 'input', data: 'pending command\r', inputSeq: 1 },
    ]);

    first.close();
    harness.clock.advance(500);
    const second = harness.sockets.at(-1)!;
    second.open();
    const secondInit = sentMessagesOfType(second, 'init')[0];
    expect(secondInit.sessionGeneration).toBe('generation-1');
    emitServerMessage(harness, second, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-1',
      sessionGeneration: 'generation-1',
      reset: false,
      gap: false,
      lastSeq: 0,
    });
    const secondInput = await readyInputConnection(harness, 'generation-1');
    expect(sentMessagesOfType(secondInput, 'input')).toEqual([
      { type: 'input', data: 'pending command\r', inputSeq: 1 },
    ]);

    emitServerMessage(harness, secondInput, { type: 'input-ack', inputSeq: 1 });
    await flushMicrotasks();
    second.close();
    harness.clock.advance(500);
    const third = harness.sockets.at(-1)!;
    third.open();
    emitServerMessage(harness, third, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-1',
      sessionGeneration: 'generation-1',
      reset: false,
      gap: false,
      lastSeq: 0,
    });
    const thirdInput = await readyInputConnection(harness, 'generation-1');

    expect(sentMessagesOfType(thirdInput, 'input')).toEqual([]);
    cleanup();
  });

  test('discards pending input on a new generation, resets numbering, and keeps the stream id', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    const first = harness.sockets[0];

    first.open();
    emitServerMessage(harness, first, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-1',
      sessionGeneration: 'generation-1',
      reset: false,
      gap: false,
      lastSeq: 0,
    });
    const firstInput = await readyInputConnection(harness, 'generation-1');
    terminal.emitData('old pending command\r');
    expect(sentMessagesOfType(firstInput, 'input')).toHaveLength(1);

    const firstInit = sentMessagesOfType(first, 'init')[0];
    first.close();
    harness.clock.advance(500);
    const second = harness.sockets.at(-1)!;
    second.open();
    const secondInit = sentMessagesOfType(second, 'init')[0];
    expect(secondInit.sessionGeneration).toBe('generation-1');
    expect(secondInit.inputStreamId).toBe(firstInit.inputStreamId);
    emitServerMessage(harness, second, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-2',
      sessionGeneration: 'generation-2',
      reset: true,
      gap: true,
      lastSeq: 0,
    });
    const secondInput = await readyInputConnection(harness, 'generation-2');

    expect(sentMessagesOfType(secondInput, 'input')).toEqual([]);
    expect(harness.stateUpdates).toContain(true);

    terminal.emitData('new command\r');
    expect(sentMessagesOfType(secondInput, 'input')).toEqual([
      { type: 'input', data: 'new command\r', inputSeq: 1 },
    ]);

    second.close();
    harness.clock.advance(500);
    const third = harness.sockets.at(-1)!;
    third.open();
    const thirdInit = sentMessagesOfType(third, 'init')[0];
    expect(thirdInit.sessionGeneration).toBe('generation-2');
    expect(thirdInit.inputStreamId).toBe(firstInit.inputStreamId);
    cleanup();
  });

  test('writes RIS before applying a reset snapshot frame', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    const socket = harness.sockets[0];

    socket.open();
    emitServerMessage(harness, socket, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-1',
      sessionGeneration: 'generation-1',
      reset: true,
      gap: false,
      lastSeq: 0,
    });
    emitServerMessage(harness, socket, {
      type: 'output',
      data: 'authoritative snapshot',
      seq: 1,
    });
    await flushMicrotasks();

    expect(terminal.writes).toEqual(['\x1bc', 'authoritative snapshot']);
    cleanup();
  });

  test('RIS restores dirty normal and alternate screens before a serialized snapshot', async () => {
    const paneSource = fs.readFileSync(new URL('./connection.ts', import.meta.url), 'utf8');
    const resetMatch = paneSource.match(/writeTerminalData\('([^']+)'\)/);
    expect(resetMatch?.[1]).toBeDefined();
    const resetSequence = resetMatch![1].replace(/\\x([0-9a-f]{2})/gi, (_, value: string) => (
      String.fromCharCode(Number.parseInt(value, 16))
    ));
    expect(resetSequence).toBe('\x1bc');

    const reference = new headlessXterm.Terminal({ allowProposedApi: true, cols: 20, rows: 4, scrollback: 1000 });
    const referenceSerializer = new SerializeAddon();
    reference.loadAddon(referenceSerializer);
    await new Promise<void>((resolve) => reference.write('normal snapshot\r\n', resolve));
    await new Promise<void>((resolve) => reference.write('\x1b[?1049h\x1b[Halternate snapshot', resolve));
    const snapshot = referenceSerializer.serialize();

    const dirty = new headlessXterm.Terminal({ allowProposedApi: true, cols: 20, rows: 4, scrollback: 1000 });
    const dirtySerializer = new SerializeAddon();
    dirty.loadAddon(dirtySerializer);
    await new Promise<void>((resolve) => dirty.write('dirty normal\r\n', resolve));
    await new Promise<void>((resolve) => dirty.write('\x1b[?1049h\x1b[Hdirty alternate', resolve));
    await new Promise<void>((resolve) => dirty.write(resetSequence + snapshot, resolve));

    expect(dirty.buffer.active.type).toBe('alternate');
    expect(dirtySerializer.serialize()).toBe(snapshot);
    reference.dispose();
    dirty.dispose();
  });
});
