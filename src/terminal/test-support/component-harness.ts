// Shared vm harness for the client behaviour specs. It compiles the real .tsx/.ts
// sources with `typescript` and runs them inside a vm context whose React hooks,
// timers, sockets and xterm are deterministic fakes, so a component's effects can
// be driven like a browser would drive them without a DOM.
import { expect } from 'bun:test';
import fs from 'node:fs';
import * as vm from 'node:vm';
import ts from 'typescript';

type Listener = (event: { type: string; data?: unknown }) => void;

export class FakeClock {
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

  get now() {
    return this.nowMs;
  }
}

// One 60 Hz display frame. Animation frames must advance the fake clock, or the
// 25 FPS limiter's wait-for-next-frame requeue would never reach its deadline.
const FRAME_MS = 16;

type FrameScheduler = {
  request(callback: () => void): number;
  cancel(id: number): void;
};

// xterm's private RenderDebouncer, the hook the frame limiter wraps: dirty rows
// accumulate and one animation frame paints their union.
class FakeRenderDebouncer {
  _animationFrame?: number;
  private dirty?: [number, number];

  constructor(private readonly frames: FrameScheduler, private readonly paint: (start: number, end: number) => void) {}

  refresh(start: number, end: number) {
    this.dirty = this.dirty ? [Math.min(this.dirty[0], start), Math.max(this.dirty[1], end)] : [start, end];
    if (this._animationFrame) return;
    this._animationFrame = this.frames.request(() => this._innerRefresh());
  }

  _innerRefresh() {
    this._animationFrame = undefined;
    const dirty = this.dirty;
    if (!dirty) return;
    this.dirty = undefined;
    this.paint(dirty[0], dirty[1]);
  }

  dispose() {
    if (this._animationFrame) this.frames.cancel(this._animationFrame);
    this._animationFrame = undefined;
  }
}

export class FakeEventTarget {
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

export class FakeSocket extends FakeEventTarget {
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

interface FakeClassList {
  add(...names: string[]): void;
  remove(...names: string[]): void;
  contains(name: string): boolean;
  toggle(name: string, force?: boolean): boolean;
}

function classList(): FakeClassList {
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

interface FakeNode {
  isConnected: boolean;
  classList: FakeClassList;
  offsetWidth?: number;
  offsetHeight?: number;
  style?: Record<string, string>;
}

export interface FakeElement {
  clientWidth: number;
  clientHeight: number;
  classList: FakeClassList;
  style: Record<string, string>;
  querySelector(selector: string): FakeNode;
}

// An xterm root element whose `.xterm-screen` is an 80x24 grid of 10x25 px cells.
function makeElement(): FakeElement {
  const screen: FakeNode = {
    isConnected: true,
    offsetWidth: 800,
    offsetHeight: 600,
    style: {},
    classList: classList(),
  };
  const viewport: FakeNode = {
    isConnected: true,
    classList: classList(),
  };
  return {
    clientWidth: 800,
    clientHeight: 600,
    classList: classList(),
    style: {},
    querySelector: (selector: string) => selector === '.xterm-screen' ? screen : viewport,
  };
}

export type FakeKeyEvent = {
  type: string;
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  preventDefault(): void;
};

export class FakeTerminal {
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
  readonly element = makeElement();
  readonly writes: string[] = [];
  // Row ranges the renderer actually painted, one entry per animation frame.
  readonly paints: Array<[number, number]> = [];
  readonly _core: { _renderService: { _renderDebouncer: FakeRenderDebouncer } };
  private readonly utf8 = new TextDecoder();
  private dataListener: ((data: string) => void) | undefined;
  private parsedListener: (() => void) | undefined;
  keyHandler?: (event: FakeKeyEvent) => boolean;
  wheelHandler?: (event: { preventDefault(): void; stopPropagation(): void }) => boolean;
  selection = '';
  disposed = false;
  refreshCalls = 0;
  blurCalls = 0;
  textureAtlasClears = 0;

  constructor(options: Record<string, unknown>, frames: FrameScheduler) {
    this.options = options;
    this._core = { _renderService: { _renderDebouncer: new FakeRenderDebouncer(frames, (start, end) => {
      this.paints.push([start, end]);
    }) } };
  }

  loadAddon(addon: { activate?: (terminal: FakeTerminal) => void }) { addon.activate?.(this); }
  open() {}
  attachCustomKeyEventHandler(handler: typeof this.keyHandler) { this.keyHandler = handler; }
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
  deferWrites = false;
  readonly writeCallbacks: Array<() => void> = [];
  // Records bytes as text, decoding UTF-8 across writes like xterm does.
  write(data: string | Uint8Array, onParsed?: () => void) {
    this.writes.push(typeof data === 'string' ? data : this.utf8.decode(data, { stream: true }));
    // Parsed output dirties the cursor row.
    this._core._renderService._renderDebouncer.refresh(this.rows - 1, this.rows - 1);
    if (onParsed) {
      if (this.deferWrites) this.writeCallbacks.push(onParsed); else onParsed();
    }
  }
  scrollToBottom() { this.buffer.active.viewportY = this.buffer.active.baseY; }
  clear() {}
  refresh(start: number, end: number) {
    this.refreshCalls += 1;
    this._core._renderService._renderDebouncer.refresh(start, end);
  }
  clearTextureAtlas() { this.textureAtlasClears += 1; }
  resize(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    const screen = this.element.querySelector('.xterm-screen');
    screen.offsetWidth = cols * 10;
    screen.offsetHeight = rows * 25;
  }
  input(data: string) { this.emitData(data); }
  hasSelection() { return this.selection !== ''; }
  getSelection() { return this.selection; }
  focus() {}
  blur() { this.blurCalls += 1; }
  dispose() {
    this.disposed = true;
    this._core._renderService._renderDebouncer.dispose();
  }
}

// `document.fonts`: load() settles with `loaded`; dispatch('loadingdone') emulates a
// later web-font arrival.
export class FakeFontFaceSet extends FakeEventTarget {
  readonly loadCalls: string[][] = [];

  constructor(private readonly loaded: Promise<void>) {
    super();
  }

  load(...args: string[]) {
    this.loadCalls.push(args);
    return this.loaded;
  }
}

class FakeResizeObserver {
  disconnected = false;

  constructor(readonly callback: () => void) {}
  observe() {}
  disconnect() { this.disconnected = true; }
}

type Effect = () => void | (() => void);

export interface Hooks {
  effects: Effect[];
  refs: Array<{ current: unknown }>;
  states: unknown[];
  refCursor: number;
  stateCursor: number;
  // Starts a re-render: hooks resolve to the same slots again, by call order.
  beginRender(): void;
  useCallback<T extends (...args: never[]) => unknown>(callback: T): T;
  useEffect(callback: Effect): void;
  useLayoutEffect(): void;
  useMemo<T>(factory: () => T): T;
  useRef<T>(current: T): { current: T };
  useState<T>(initial: T | (() => T)): readonly [T, (next: T | ((previous: T) => T)) => void];
}

export interface Harness {
  clock: FakeClock;
  window: FakeEventTarget & Record<string, unknown>;
  document: FakeEventTarget & Record<string, unknown>;
  sockets: FakeSocket[];
  container: FakeElement;
  localStorage: { getItem(key: string): string | null; setItem(key: string, value: string): void };
  navigator: { clipboard: undefined; onLine: boolean };
  terminalInstances: FakeTerminal[];
  rendererAddons: Array<{ disposed: boolean; contextLossListener?: () => void }>;
  rendererUnavailable: boolean;
  // Text the pane handed to the clipboard module.
  clipboardWrites: string[];
  // Every value passed to a useState setter, in order.
  stateUpdates: unknown[];
  hooks: Hooks;
  openAuthenticatedSocket(path: string): FakeSocket;
  encode(message: unknown): string;
  decode(raw: unknown): Promise<unknown>;
}

export function createHarness(): Harness {
  const clock = new FakeClock();
  const window = new FakeEventTarget() as FakeEventTarget & Record<string, unknown>;
  const document = new FakeEventTarget() as FakeEventTarget & Record<string, unknown>;
  const sockets: FakeSocket[] = [];
  const root = { classList: classList() };
  const container = makeElement();
  const localStorage = new Map<string, string>();
  const terminalInstances: FakeTerminal[] = [];
  const rendererAddons: Array<{ disposed: boolean; contextLossListener?: () => void }> = [];
  const clipboardWrites: string[] = [];
  const stateUpdates: unknown[] = [];

  Object.assign(window, {
    setTimeout: (callback: () => void, delay: number) => clock.setTimeout(callback, delay),
    clearTimeout: (id: number) => clock.clearTimeout(id),
    setInterval: (callback: () => void, delay: number) => clock.setInterval(callback, delay),
    clearInterval: (id: number) => clock.clearInterval(id),
    requestAnimationFrame: (callback: () => void) => clock.setTimeout(callback, FRAME_MS),
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
    setItem: (key: string, value: string) => { localStorage.set(key, value); },
  };
  const navigator = { clipboard: undefined, onLine: true };

  const openAuthenticatedSocket = (path: string) => {
    const socket = new FakeSocket(path);
    sockets.push(socket);
    return socket;
  };

  // Refs and state live in slots keyed by call order, as in React, so a component
  // rendered again after `beginRender()` sees the state its earlier effects set.
  const hooks: Hooks = {
    effects: [],
    refs: [],
    states: [],
    refCursor: 0,
    stateCursor: 0,
    beginRender: () => {
      hooks.refCursor = 0;
      hooks.stateCursor = 0;
      hooks.effects.length = 0;
    },
    useCallback: (callback) => callback,
    useEffect: (callback: () => void | (() => void)) => { hooks.effects.push(callback); },
    useLayoutEffect: () => {},
    useMemo: <T>(factory: () => T) => factory(),
    useRef: <T>(current: T) => {
      const index = hooks.refCursor++;
      if (index === hooks.refs.length) hooks.refs.push({ current });
      return hooks.refs[index] as { current: T };
    },
    useState: <T>(initial: T | (() => T)) => {
      const index = hooks.stateCursor++;
      if (index === hooks.states.length) {
        hooks.states.push(typeof initial === 'function' ? (initial as () => T)() : initial);
      }
      return [hooks.states[index] as T, (next: T | ((previous: T) => T)) => {
        const value = typeof next === 'function' ? (next as (previous: T) => T)(hooks.states[index] as T) : next;
        hooks.states[index] = value;
        stateUpdates.push(value);
      }] as const;
    },
  };

  const encode = (message: unknown) => JSON.stringify(message);
  const decode = async (raw: unknown): Promise<unknown> => {
    if (typeof raw !== 'string') return null;
    let message: { type?: unknown; data?: unknown } | null;
    try { message = JSON.parse(raw); } catch { return null; }
    // The real codec hands terminal output to xterm as UTF-8 bytes.
    if (message?.type === 'output' && typeof message.data === 'string') {
      message.data = new TextEncoder().encode(message.data);
    }
    return message;
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
    clipboardWrites,
    stateUpdates,
    hooks,
    openAuthenticatedSocket,
    encode,
    decode,
  };
}

const transpileOptions = {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
};

type ModuleOptions = {
  // Module specifiers resolved to these values before the built-in fakes.
  overrides?: Record<string, unknown>;
  // Module-local bindings to expose on the returned exports (e.g. a non-exported component).
  expose?: string[];
};

// Compiles a client source file and runs it in a vm context wired to `harness`.
// Relative imports are compiled from source; browser libraries resolve to fakes.
export function loadModule(sourceUrl: URL, harness: Harness, { overrides = {}, expose = [] }: ModuleOptions = {}) {
  const reactRuntime = {
    ...harness.hooks,
    // Components render as plain calls here; memoization changes nothing observable.
    memo: <T>(component: T) => component,
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
  const xtermRuntime = { Terminal: class extends FakeTerminal {
    constructor(options: Record<string, unknown>) {
      super(options, {
        request: (callback) => harness.clock.setTimeout(callback, FRAME_MS),
        cancel: (id) => harness.clock.clearTimeout(id),
      });
      harness.terminalInstances.push(this);
    }
  } };
  const wsCodecRuntime = {
    encodeTabsClientMessage: harness.encode,
    decodeTabsServerMessage: harness.decode,
    encodeTerminalClientMessage: harness.encode,
    decodeTerminalServerMessage: harness.decode,
    decodeAuthServerMessage: harness.decode,
  };
  const moduleCache = new Map<string, Record<string, unknown>>();
  const require = (specifier: string, from: URL): unknown => {
    if (specifier in overrides) return overrides[specifier];
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
      copyToClipboard: async (text: string) => { harness.clipboardWrites.push(text); return true; },
      readClipboardText: async () => '',
    };
    if (specifier.endsWith('/wsCodec')) return wsCodecRuntime;
    if (specifier === '../wsHost' || specifier === './wsHost') {
      return { openAuthenticatedSocket: harness.openAuthenticatedSocket };
    }
    if (specifier === '../uuid') return { createUuidV4: () => '00000000-0000-4000-8000-000000000001' };
    if (specifier === './auth/CollaboratorsDialog') return { default: () => null };
    if (specifier.endsWith('.json')) return { __esModule: true, default: JSON.parse(fs.readFileSync(new URL(specifier, from), 'utf8')) };
    if (specifier.startsWith('.')) {
      const candidates = ['.ts', '.tsx'].map((extension) => new URL(specifier + extension, from));
      const file = candidates.find((candidate) => fs.existsSync(candidate));
      if (file) return run(file, []);
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
    // Shared with the harness so `instanceof Uint8Array` holds for its byte payloads.
    Uint8Array,
    performance: { now: () => harness.clock.now },
    WebSocket: FakeSocket,
    ResizeObserver: FakeResizeObserver,
    window: harness.window,
    document: harness.document,
    localStorage: harness.localStorage,
    navigator: harness.navigator,
  });

  function run(file: URL, locals: string[]) {
    const cached = moduleCache.get(file.href);
    if (cached) return cached;
    const module = { exports: {} as Record<string, unknown> };
    moduleCache.set(file.href, module.exports);
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { ...transpileOptions, fileName: file.pathname }).outputText;
    const exposeLocals = locals.map((name) => `module.exports.${name} = ${name};`).join('\n');
    const wrapper = vm.runInContext(`(function (require, module, exports) {${compiled}\n${exposeLocals}\n})`, context) as (
      require: (specifier: string) => unknown, module: { exports: Record<string, unknown> }, exports: Record<string, unknown>,
    ) => void;
    wrapper((specifier) => require(specifier, file), module, module.exports);
    return module.exports;
  }

  return run(sourceUrl, expose);
}

export type LoopKind = 'tabs' | 'terminal';

export const TEST_TAB_ID = '00000000-0000-4000-8000-000000000001';

// Renders TerminalApp (tabs) or TerminalPane (terminal) once and runs the effect that
// owns its socket lifecycle. `props` overrides the default component props.
export function loadLoop(kind: LoopKind, harness: Harness, props: Record<string, unknown> = {}) {
  const exports = kind === 'tabs'
    ? loadModule(new URL('../../App.tsx', import.meta.url), harness, { expose: ['TerminalApp'] })
    : loadModule(new URL('../TerminalPane.tsx', import.meta.url), harness);
  const component = (kind === 'tabs' ? exports.TerminalApp : exports.default) as (props: Record<string, unknown>) => unknown;
  const defaults = kind === 'tabs'
    ? { authToken: 'test-token', user: { username: 'tester' }, onLogout: async () => {} }
    : {
      tabId: TEST_TAB_ID,
      active: true,
      focusOnMount: false,
      authToken: 'test-token',
      preferences: { fontSize: 14 },
      onStatusChange: () => {},
      onTitleChange: () => {},
    };
  const rendered = component({ ...defaults, ...props });

  if (kind === 'terminal') {
    harness.hooks.refs[0].current = harness.container;
  }

  const cleanup = runEffect(harness, kind === 'tabs' ? 'createTabsSocket' : 'connectTerminal');
  return { cleanup, component, rendered };
}

// Runs the first effect registered in the current render whose source mentions `marker`.
export function runEffect(harness: Harness, marker: string) {
  const effect = harness.hooks.effects.find((candidate) => candidate.toString().includes(marker));
  if (!effect) {
    throw new Error(`Could not locate effect containing ${marker}`);
  }
  return effect() ?? (() => {});
}

export type VNode = { type: unknown; props: Record<string, unknown> };

// Collects JSX elements in a rendered tree (the fake jsx runtime returns {type, props}).
export function findElements(node: unknown, predicate: (element: VNode) => boolean): VNode[] {
  const found: VNode[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object' || !('props' in value)) return;
    const element = value as VNode;
    if (predicate(element)) found.push(element);
    visit(element.props.children);
  };
  visit(node);
  return found;
}

export function emitResume(harness: Harness, event: 'focus' | 'visibilitychange' | 'online') {
  if (event === 'visibilitychange') {
    harness.document.dispatch(event);
  } else {
    harness.window.dispatch(event);
  }
}

export function pingCount(socket: FakeSocket) {
  return socket.sent.filter((message) => typeof message === 'string' && message.includes('"type":"ping"')).length;
}

export function sentMessages(socket: FakeSocket) {
  return socket.sent
    .filter((message): message is string => typeof message === 'string')
    .map((message) => JSON.parse(message) as Record<string, unknown>);
}

export function sentMessagesOfType(socket: FakeSocket, type: string) {
  return sentMessages(socket).filter((message) => message.type === type);
}

export async function flushMicrotasks() {
  for (let index = 0; index < 20; index += 1) {
    await Promise.resolve();
  }
}

export function emitServerMessage(harness: Harness, socket: FakeSocket, message: Record<string, unknown>) {
  socket.emit('message', harness.encode(message));
}

export async function readyInputConnection(harness: Harness, generation: string) {
  await flushMicrotasks();
  const input = harness.sockets.at(-1)!;
  expect(input.url).toBe('/terminal/input');
  input.open();
  emitServerMessage(harness, input, { type: 'ready', sessionGeneration: generation });
  await flushMicrotasks();
  return input;
}

export function makeFailureSequence(harness: Harness) {
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
