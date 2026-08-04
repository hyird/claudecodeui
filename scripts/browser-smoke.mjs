#!/usr/bin/env node
import fs from 'node:fs';

import { WebSocket } from 'ws';

const [, , targetUrl, authToken, desktopOutput, mobileOutput] = process.argv;
const cdpPort = process.env.CDP_PORT || '9223';

if (!targetUrl || !authToken || !desktopOutput || !mobileOutput) {
  console.error(
    'Usage: browser-smoke.mjs <url> <auth-token> <desktop.png> <mobile.png>',
  );
  process.exit(2);
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
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
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function readPageState() {
  const result = await call('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => ({
      title: document.title,
      bodyText: document.body.innerText,
      tabs: [...document.querySelectorAll('.tab-title')].map((node) => node.textContent),
      statuses: [...document.querySelectorAll('.status-dot')].map((node) => node.className),
      tabSemantics: [...document.querySelectorAll('[role="tab"]')].map((node) => ({
        id: node.id,
        selected: node.getAttribute('aria-selected') === 'true',
        controls: node.getAttribute('aria-controls'),
        tabIndex: node.tabIndex,
      })),
      selectedIndex: [...document.querySelectorAll('[role="tab"]')]
        .findIndex((node) => node.getAttribute('aria-selected') === 'true'),
      focusedTabIndex: [...document.querySelectorAll('[role="tab"]')].indexOf(document.activeElement),
      panelLabelledBy: document.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby'),
      hasTerminal: Boolean(document.querySelector('.xterm')),
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
  if (state.panelLabelledBy !== state.tabSemantics[state.selectedIndex]?.id) {
    throw new Error(`${label}: terminal panel is not labelled by the selected tab`);
  }
  if (
    state.terminalScrollbar?.rulerWidth !== 4
    || JSON.stringify(state.terminalScrollbar.rulerBorderPixel)
      !== JSON.stringify(state.terminalScrollbar.viewportBackgroundPixel)
  ) {
    throw new Error(
      `${label}: terminal has a contrasting overview-ruler edge; `
      + `scrollbar=${JSON.stringify(state.terminalScrollbar)}`,
    );
  }
}

async function dispatchKey(key, code, keyCode) {
  await call('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await call('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
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
  source: `try { localStorage.setItem('auth-token', ${JSON.stringify(authToken)}); } catch {}`,
});
await call('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await call('Page.navigate', { url: targetUrl });
await waitForState(
  (state) => state.hasTerminal && state.statuses[state.selectedIndex] === 'status-dot connected',
  'desktop terminal did not connect',
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
  `printf '\\033]0;Refresh Base\\007'; sleep 0.05; printf '\\033]0;Refresh Check\\007'; sleep 10`,
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
await capture(mobileOutput);

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
  (state) => state.statuses[state.selectedIndex] === 'status-dot exited',
  'smoke-test terminal did not exit cleanly',
);

console.log(JSON.stringify({
  desktopState,
  mobileState,
  afterDeleteState,
  scrollbackState,
  exitedState,
}, null, 2));
socket.close();
