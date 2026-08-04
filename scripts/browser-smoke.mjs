#!/usr/bin/env node
import fs from 'node:fs';

import { WebSocket } from 'ws';

const [, , targetUrl, authToken, desktopOutput, mobileOutput] = process.argv;
const cdpPort = process.env.CDP_PORT || '9223';
const authFailureMode = process.env.BROWSER_SMOKE_AUTH_FAILURE_MODE
  ?? (process.env.BROWSER_SMOKE_TRANSIENT_AUTH_FAILURE === '1' ? 'once' : '');

if (!targetUrl || !authToken || !desktopOutput || !mobileOutput) {
  console.error(
    'Usage: browser-smoke.mjs <url> <auth-token> <desktop.png> <mobile.png>',
  );
  process.exit(2);
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const CDP_CALL_TIMEOUT_MS = 10000;
const targets = await fetch(`http://127.0.0.1:${cdpPort}/json/list`).then((response) => response.json());
const pageTarget = targets.find((target) => target.type === 'page');
if (!pageTarget?.webSocketDebuggerUrl) {
  throw new Error('No Chromium page target is available');
}

const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.once('open', resolve);
  socket.once('error', reject);
});

let nextId = 1;
const pending = new Map();
socket.on('message', (raw) => {
  const message = JSON.parse(raw.toString());
  if (!message.id) {
    return;
  }
  const request = pending.get(message.id);
  if (!request) {
    return;
  }
  pending.delete(message.id);
  clearTimeout(request.timeout);
  if (message.error) {
    request.reject(new Error(message.error.message));
  } else {
    request.resolve(message.result);
  }
});

function call(method, params = {}) {
  const id = nextId;
  nextId += 1;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Chromium did not respond to ${method} within ${CDP_CALL_TIMEOUT_MS}ms`));
    }, CDP_CALL_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

socket.on('close', () => {
  for (const request of pending.values()) {
    clearTimeout(request.timeout);
    request.reject(new Error('Chromium debugging connection closed'));
  }
  pending.clear();
});

async function readPageState() {
  const result = await call('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({
      title: document.title,
      bodyText: document.body.innerText,
      hasStoredAuthToken: Boolean(localStorage.getItem('auth-token')),
      transientAuthFailureCount: Number(
        sessionStorage.getItem('qa-auth-failure-count') ?? 0,
      ),
      tabs: [...document.querySelectorAll('.tab-title')].map((node) => node.textContent),
      statuses: [...document.querySelectorAll('.status-dot')].map((node) => node.className),
      tabSemantics: [...document.querySelectorAll('[role="tab"]')].map((node) => ({
        id: node.id,
        label: node.getAttribute('aria-label'),
        selected: node.getAttribute('aria-selected') === 'true',
        controls: node.getAttribute('aria-controls'),
        tabIndex: node.tabIndex,
      })),
      selectedIndex: [...document.querySelectorAll('[role="tab"]')]
        .findIndex((node) => node.getAttribute('aria-selected') === 'true'),
      focusedTabIndex: [...document.querySelectorAll('[role="tab"]')].indexOf(document.activeElement),
      tabStrip: (() => {
        const strip = document.querySelector('[role="tablist"]');
        const selectedTab = document.querySelector('[role="tab"][aria-selected="true"]')
          ?.closest('.tab');
        const stripRect = strip?.getBoundingClientRect();
        const selectedRect = selectedTab?.getBoundingClientRect();
        return strip && stripRect && selectedRect ? {
          clientWidth: strip.clientWidth,
          scrollWidth: strip.scrollWidth,
          scrollLeft: strip.scrollLeft,
          left: stripRect.left,
          right: stripRect.right,
          selectedFullyVisible: (
            selectedRect.left >= stripRect.left - 0.5
            && selectedRect.right <= stripRect.right + 0.5
          ),
        } : null;
      })(),
      settings: (() => {
        const button = document.querySelector('button[aria-label="终端设置"]');
        const dialog = document.querySelector('[role="dialog"][aria-label="终端设置"]');
        return {
          open: Boolean(dialog),
          expanded: button?.getAttribute('aria-expanded') === 'true',
          controls: button?.getAttribute('aria-controls') ?? null,
          dialogId: dialog?.id ?? null,
          dialogContainsFocus: Boolean(dialog?.contains(document.activeElement)),
          buttonHasFocus: document.activeElement === button,
          focusedControlLabel: document.activeElement?.getAttribute('aria-label') ?? null,
          fontSize: dialog?.querySelector('.font-stepper strong')?.textContent ?? null,
        };
      })(),
      panelLabelledBy: document.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby'),
      hasTerminal: Boolean(document.querySelector('.xterm')),
      terminalFrameRect: (() => {
        const rect = document.querySelector('.terminal-frame')?.getBoundingClientRect();
        return rect ? { width: rect.width, height: rect.height } : null;
      })(),
      controlSizes: (() => {
        const measure = (selector) => [...document.querySelectorAll(selector)].map((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const hitTarget = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          );
          return {
            label: node.getAttribute('aria-label'),
            width: rect.width,
            height: rect.height,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2,
            opacity: Number(style.opacity),
            pointerEvents: style.pointerEvents,
            activeTab: node.closest('.tab')?.classList.contains('active') ?? false,
            hitTargetLabel: hitTarget?.closest('button')?.getAttribute('aria-label') ?? null,
          };
        });
        return {
          toolbar: measure('.toolbar .icon-button'),
          tabClose: measure('.tab-close'),
          fontStepper: measure('.step-button'),
        };
      })(),
      terminalScrollbar: (() => {
        const viewport = document.querySelector('.xterm-viewport');
        const track = document.querySelector('.xterm-scrollable-element > .scrollbar.vertical');
        const slider = track?.querySelector('.slider');
        const ruler = document.querySelector('.xterm-decoration-overview-ruler');
        const trackRect = track?.getBoundingClientRect();
        const sliderRect = slider?.getBoundingClientRect();
        const rulerRect = ruler?.getBoundingClientRect();
        const rulerContext = ruler?.getContext('2d');
        const rulerPixel = rulerContext && ruler.width > 0 && ruler.height > 0
          ? [...rulerContext.getImageData(0, Math.floor(ruler.height / 2), 1, 1).data]
          : null;
        const viewportBackground = viewport
          ? (getComputedStyle(viewport).backgroundColor.match(/[\\d.]+/g) ?? [])
            .slice(0, 3)
            .map(Number)
          : null;
        return viewport ? {
          hasScrollback: viewport.classList.contains('has-scrollback'),
          nativeWidth: getComputedStyle(viewport, '::-webkit-scrollbar').width,
          trackWidth: trackRect?.width ?? 0,
          trackHeight: trackRect?.height ?? 0,
          sliderWidth: sliderRect?.width ?? 0,
          sliderHeight: sliderRect?.height ?? 0,
          sliderTop: sliderRect && trackRect ? sliderRect.top - trackRect.top : 0,
          rulerWidth: rulerRect?.width ?? 0,
          rulerBorderPixel: rulerPixel,
          viewportBackgroundPixel: viewportBackground ? [...viewportBackground, 255] : null,
        } : null;
      })(),
      viewport: { width: innerWidth, height: innerHeight },
      inputCapabilities: {
        hoverFine: matchMedia('(hover: hover) and (pointer: fine)').matches,
        touchCoarse: matchMedia('(hover: none) and (pointer: coarse)').matches,
      },
      documentSize: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      },
      scrollElements: [...document.querySelectorAll('.xterm *')]
        .filter((node) => /scroll|viewport/i.test(node.className || ''))
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return {
            className: node.className,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            background: style.backgroundColor,
          };
        }),
    }))()`,
  });
  return result.result.value;
}

async function capture(outputPath) {
  const result = await call('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(outputPath, Buffer.from(result.data, 'base64'));
}

async function waitForState(predicate, description, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  let state;
  while (Date.now() < deadline) {
    state = await readPageState();
    if (state && predicate(state)) {
      return state;
    }
    await delay(50);
  }
  throw new Error(`${description}; last state: ${JSON.stringify(state)}`);
}

function assertHealthyTerminal(label, state) {
  if (!state.hasTerminal || state.statuses[state.selectedIndex] !== 'status-dot connected') {
    throw new Error(`${label}: terminal did not reach the connected state`);
  }
  if (state.documentSize.width > state.viewport.width) {
    throw new Error(`${label}: document has horizontal overflow`);
  }
  if (/Session [0-9a-f-]{36}/i.test(state.bodyText)) {
    throw new Error(`${label}: internal session UUID is visible in the terminal`);
  }
  if (
    state.tabSemantics.filter((tab) => tab.selected).length !== 1
    || state.tabSemantics.filter((tab) => tab.tabIndex === 0).length !== 1
    || state.tabSemantics.some((tab) => tab.controls !== 'active-terminal-panel')
  ) {
    throw new Error(`${label}: terminal tab semantics are invalid`);
  }
  const statusNames = {
    'status-dot connected': '已连接',
    'status-dot connecting': '连接中',
    'status-dot background': '后台运行',
    'status-dot disconnected': '已断开',
    'status-dot exited': '已退出',
    'status-dot error': '错误',
  };
  if (state.tabSemantics.some((tab, index) => (
    tab.label !== `${state.tabs[index]}，${statusNames[state.statuses[index]]}`
  ))) {
    throw new Error(`${label}: terminal tab accessible names omit session status`);
  }
  if (state.panelLabelledBy !== state.tabSemantics[state.selectedIndex]?.id) {
    throw new Error(`${label}: terminal panel is not labelled by the selected tab`);
  }
  if (
    state.terminalScrollbar?.trackHeight > 0
    && (
      state.terminalScrollbar.rulerWidth !== 4
      || JSON.stringify(state.terminalScrollbar.rulerBorderPixel)
        !== JSON.stringify(state.terminalScrollbar.viewportBackgroundPixel)
    )
  ) {
    throw new Error(
      `${label}: terminal has a contrasting overview-ruler edge; `
      + `scrollbar=${JSON.stringify(state.terminalScrollbar)}`,
    );
  }
}

async function dispatchKey(key, code, keyCode, modifiers = 0) {
  await call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key,
    code,
    modifiers,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await call('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key,
    code,
    modifiers,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
}

async function dispatchTap(x, y) {
  await call('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  await call('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
}

async function dispatchMouseMove(x, y) {
  await call('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
  });
}

async function enterTerminalCommand(command) {
  await call('Runtime.evaluate', {
    expression: `document.querySelector('.xterm-helper-textarea')?.focus()`,
  });
  await call('Input.insertText', { text: command });
  await dispatchKey('Enter', 'Enter', 13);
}

await call('Page.enable');
await call('Runtime.enable');
await call('Page.addScriptToEvaluateOnNewDocument', {
  source: `
    try { localStorage.setItem('auth-token', ${JSON.stringify(authToken)}); } catch {}
    ${authFailureMode ? `(() => {
      const nativeFetch = window.fetch.bind(window);
      const failureMode = ${JSON.stringify(authFailureMode)};
      window.fetch = async (...args) => {
        const input = args[0];
        const rawUrl = typeof input === 'string'
          ? input
          : input instanceof Request
            ? input.url
            : String(input);
        const url = new URL(rawUrl, location.href);
        const marker = 'qa-auth-failure-count';
        const failureCount = Number(sessionStorage.getItem(marker) ?? 0);
        if (
          url.pathname === '/api/auth/user'
          && (failureMode === 'persistent' || failureCount === 0)
        ) {
          sessionStorage.setItem(marker, String(failureCount + 1));
          return new Response(JSON.stringify({ error: 'Temporary auth failure' }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          });
        }
        return nativeFetch(...args);
      };
    })();` : ''}
  `,
});
await call('Emulation.setTouchEmulationEnabled', { enabled: false });
await call('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await call('Page.navigate', { url: targetUrl });
if (authFailureMode === 'persistent') {
  const persistentAuthFailureState = await waitForState(
    (state) => (
      !state.hasTerminal
      && state.hasStoredAuthToken
      && state.transientAuthFailureCount >= 4
      && state.bodyText.includes('欢迎回来')
    ),
    'persistent authentication failure deleted the stored token or did not settle',
  );
  console.log(JSON.stringify({ persistentAuthFailureState }, null, 2));
  socket.close();
  process.exit(0);
}
const initialDesktopState = await waitForState(
  (state) => (
    state.hasTerminal
    && state.statuses[state.selectedIndex] === 'status-dot connected'
    && state.terminalFrameRect?.height > 0
    && state.terminalScrollbar?.trackHeight > 0
    && state.terminalScrollbar?.rulerBorderPixel
  ),
  'desktop terminal did not connect',
);
assertHealthyTerminal('initial desktop', initialDesktopState);
if (!initialDesktopState.hasStoredAuthToken) {
  throw new Error('initial authentication discarded the stored token');
}
if (authFailureMode === 'once' && initialDesktopState.transientAuthFailureCount !== 1) {
  throw new Error('transient authentication failure was not injected exactly once');
}

await call('Runtime.evaluate', {
  expression: `(() => {
    const button = document.querySelector('button[aria-label="终端设置"]');
    button?.focus();
    button?.click();
  })()`,
});
const openSettingsState = await waitForState(
  (state) => (
    state.settings.open
    && state.settings.expanded
    && state.settings.controls === state.settings.dialogId
    && state.settings.dialogContainsFocus
  ),
  'terminal settings dialog did not receive keyboard focus',
);
if (
  openSettingsState.terminalFrameRect?.width !== initialDesktopState.terminalFrameRect?.width
  || openSettingsState.terminalFrameRect?.height !== initialDesktopState.terminalFrameRect?.height
) {
  throw new Error('opening terminal settings changed the terminal frame size');
}
await call('Runtime.evaluate', {
  expression: `(() => {
    const button = document.querySelector('button[aria-label="增大字号"]');
    button?.focus();
    button?.click();
  })()`,
});
const adjustedSettingsState = await waitForState(
  (state) => (
    state.settings.fontSize === '15px'
    && state.settings.dialogContainsFocus
    && state.settings.focusedControlLabel === '增大字号'
  ),
  'changing terminal font size stole focus from settings',
);
await dispatchKey('Escape', 'Escape', 27);
await waitForState(
  (state) => !state.settings.open && !state.settings.expanded && state.settings.buttonHasFocus,
  'Escape did not close terminal settings and restore trigger focus',
);

await call('Runtime.evaluate', {
  expression: `document.querySelector('button[aria-label="新增终端"]')?.click()`,
});
const addedTabState = await waitForState(
  (state) => (
    state.tabs.length === 2
    && state.selectedIndex === 1
    && state.statuses[0] === 'status-dot background'
    && state.statuses[1] === 'status-dot connected'
  ),
  'new terminal tab did not become active',
);
assertHealthyTerminal('desktop after adding a tab', addedTabState);
let desktopHoverState = addedTabState;
if (addedTabState.inputCapabilities.hoverFine) {
  const inactiveDesktopClose = addedTabState.controlSizes.tabClose
    .find((target) => !target.activeTab);
  if (!inactiveDesktopClose) {
    throw new Error('desktop inactive close control is missing');
  }
  await dispatchMouseMove(inactiveDesktopClose.centerX, inactiveDesktopClose.centerY);
  desktopHoverState = await waitForState(
    (state) => {
      const target = state.controlSizes.tabClose.find((control) => !control.activeTab);
      return Boolean(
        target
        && target.pointerEvents === 'auto'
        && target.hitTargetLabel === target.label
      );
    },
    'desktop mouse hover did not reveal the inactive close control',
  );
  await dispatchMouseMove(720, 450);
}

await call('Runtime.evaluate', {
  expression: `document.querySelector('[role="tab"][aria-selected="true"]')?.focus()`,
});
await dispatchKey('ArrowLeft', 'ArrowLeft', 37);

const navigatedDesktopState = await waitForState(
  (state) => (
    state.tabs.length === 2
    && state.selectedIndex === 0
    && state.focusedTabIndex === 0
    && state.statuses[0] === 'status-dot connected'
    && state.statuses[1] === 'status-dot background'
  ),
  'ArrowLeft did not select and focus the previous terminal tab',
);
assertHealthyTerminal('desktop after keyboard navigation', navigatedDesktopState);

// Emit two OSC titles inside the 500ms sync window, then refresh immediately.
// The second value exercises the trailing pagehide flush rather than only the
// leading send. Keep the shell busy so its next prompt cannot replace the title.
await enterTerminalCommand(
  `printf '\\033]0;Refresh Base\\007'; sleep 0.05; printf '\\033]0;Refresh Check\\007'; sleep 30`,
);
const desktopState = await waitForState(
  (state) => (
    state.tabs[0] === 'Refresh Check'
    && state.selectedIndex === 0
    && state.statuses[0] === 'status-dot connected'
    && state.statuses[1] === 'status-dot background'
  ),
  'terminal title did not reach the trailing value',
);
assertHealthyTerminal('desktop after terminal title update', desktopState);
await capture(desktopOutput);

if (process.env.BROWSER_SMOKE_DESKTOP_ONLY === '1') {
  console.log(JSON.stringify({
    initialDesktopState,
    desktopHoverState,
    navigatedDesktopState,
    desktopState,
  }, null, 2));
  socket.close();
  process.exit(0);
}

await call('Emulation.setTouchEmulationEnabled', {
  enabled: true,
  maxTouchPoints: 1,
});
await call('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await call('Page.reload', { ignoreCache: true });
await delay(2000);

const mobileState = await waitForState(
  (state) => (
    state.tabs.length === 2
    && state.tabs[0] === 'Refresh Check'
    && state.selectedIndex === 0
    && state.statuses[0] === 'status-dot connected'
    && state.statuses[1] === 'status-dot background'
  ),
  'mobile terminal statuses did not settle',
);
assertHealthyTerminal('mobile', mobileState);
if (
  mobileState.controlSizes.toolbar.some((target) => target.width < 40 || target.height < 40)
  || mobileState.controlSizes.tabClose.some((target) => target.width < 32 || target.height < 32)
  || !mobileState.inputCapabilities.touchCoarse
) {
  throw new Error(`mobile terminal controls are too small: ${JSON.stringify(mobileState.controlSizes)}`);
}
await call('Runtime.evaluate', {
  expression: `(() => {
    const strip = document.querySelector('[role="tablist"]');
    if (strip) strip.scrollLeft = strip.scrollWidth;
  })()`,
});
const touchTargetState = await waitForState(
  (state) => {
    const target = state.controlSizes.tabClose.find((control) => !control.activeTab);
    return Boolean(
      target
      && state.tabStrip
      && target.centerX >= state.tabStrip.left
      && target.centerX <= state.tabStrip.right
    );
  },
  'inactive terminal close area could not be revealed for touch testing',
);
const inactiveCloseIndex = touchTargetState.controlSizes.tabClose
  .findIndex((target) => !target.activeTab);
const inactiveCloseTarget = touchTargetState.controlSizes.tabClose[inactiveCloseIndex];
if (
  !inactiveCloseTarget
  || inactiveCloseTarget.opacity !== 0
  || inactiveCloseTarget.pointerEvents !== 'none'
  || inactiveCloseTarget.hitTargetLabel !== touchTargetState.tabSemantics[inactiveCloseIndex].label
) {
  throw new Error(
    `inactive mobile close control still intercepts taps: ${JSON.stringify(inactiveCloseTarget)}`,
  );
}
await dispatchTap(inactiveCloseTarget.centerX, inactiveCloseTarget.centerY);
const touchSelectedState = await waitForState(
  (state) => (
    state.tabs.length === 2
    && state.selectedIndex === 1
    && state.statuses[0] === 'status-dot background'
    && state.statuses[1] === 'status-dot connected'
  ),
  'tapping an inactive hidden close area did not select the terminal tab safely',
);
assertHealthyTerminal('mobile after tapping an inactive close area', touchSelectedState);
await capture(mobileOutput);

await call('Runtime.evaluate', {
  expression: `document.querySelector('button[aria-label="终端设置"]')?.click()`,
});
const mobileSettingsState = await waitForState(
  (state) => (
    state.settings.open
    && state.settings.dialogContainsFocus
    && state.controlSizes.fontStepper.length === 2
    && state.controlSizes.fontStepper.every((target) => target.width >= 40 && target.height >= 40)
  ),
  'mobile font controls did not expose practical touch targets',
);
await dispatchKey('Escape', 'Escape', 27);
await waitForState(
  (state) => !state.settings.open && state.settings.buttonHasFocus,
  'mobile settings did not close cleanly',
);

await call('Runtime.evaluate', {
  expression: `document.querySelector('[role="tab"][aria-selected="true"]')?.focus()`,
});
await dispatchKey('Delete', 'Delete', 46);
const afterDeleteState = await waitForState(
  (state) => (
    state.tabs.length === 1
    && state.selectedIndex === 0
    && state.focusedTabIndex === 0
    && state.statuses[0] === 'status-dot connected'
  ),
  'Delete did not close the active terminal tab and restore focus',
);
assertHealthyTerminal('mobile after deleting a tab', afterDeleteState);

// Fill the compact tab strip past its visible width. Newly activated tabs must
// follow the user into view instead of becoming selected off-screen.
const overflowTabCount = 6;
for (let expectedCount = 2; expectedCount <= overflowTabCount; expectedCount += 1) {
  await call('Runtime.evaluate', {
    expression: `document.querySelector('button[aria-label="新增终端"]')?.click()`,
  });
  await waitForState(
    (state) => (
      state.tabs.length === expectedCount
      && state.selectedIndex === expectedCount - 1
      && state.statuses[state.selectedIndex] === 'status-dot connected'
    ),
    `terminal tab ${expectedCount} did not become active`,
  );
}

const overflowTabsState = await waitForState(
  (state) => (
    state.tabs.length === overflowTabCount
    && state.tabStrip?.scrollWidth > state.tabStrip?.clientWidth
    && state.tabStrip?.selectedFullyVisible
  ),
  'active terminal tab stayed outside the overflowing mobile tab strip',
);
assertHealthyTerminal('mobile with overflowing tabs', overflowTabsState);

for (let expectedCount = overflowTabCount - 1; expectedCount >= 1; expectedCount -= 1) {
  await call('Runtime.evaluate', {
    expression: `document.querySelector('.tab.active .tab-close')?.click()`,
  });
  await waitForState(
    (state) => (
      state.tabs.length === expectedCount
      && state.selectedIndex === expectedCount - 1
      && state.statuses[state.selectedIndex] === 'status-dot connected'
    ),
    `terminal tabs did not cleanly return to ${expectedCount}`,
  );
}

await call('Runtime.evaluate', {
  expression: `document.querySelector('.xterm-helper-textarea')?.focus()`,
});
await dispatchKey('c', 'KeyC', 67, 2);
await delay(100);
await enterTerminalCommand(`i=0; while [ $i -lt 120 ]; do echo scroll-$i; i=$((i+1)); done`);
const scrollbackState = await waitForState(
  (state) => (
    state.terminalScrollbar?.hasScrollback
    && state.terminalScrollbar.nativeWidth === '0px'
    && state.terminalScrollbar.trackWidth === 4
    && state.terminalScrollbar.sliderWidth === 4
  ),
  'terminal scrollbar did not settle at the compact width',
);
assertHealthyTerminal('mobile with terminal scrollback', scrollbackState);
await capture(mobileOutput);

await enterTerminalCommand('exit');
const exitedState = await waitForState(
  (state) => (
    state.statuses[state.selectedIndex] === 'status-dot exited'
    && state.tabSemantics[state.selectedIndex]?.label === `${state.tabs[state.selectedIndex]}，已退出`
  ),
  'smoke-test terminal did not exit cleanly',
);

console.log(JSON.stringify({
  initialDesktopState,
  desktopHoverState,
  openSettingsState,
  adjustedSettingsState,
  navigatedDesktopState,
  desktopState,
  mobileState,
  touchTargetState,
  touchSelectedState,
  mobileSettingsState,
  afterDeleteState,
  overflowTabsState,
  scrollbackState,
  exitedState,
}, null, 2));
socket.close();
