import fs from 'node:fs';

function readModules(paths) {
  return paths.map((path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
}

export function readTerminalSource() {
  return readModules([
    '../TerminalPane.tsx', '../renderer.ts', '../use-terminal-layout.ts',
    '../connection.ts', '../input-state.ts',
  ]);
}

export function readAppSource() {
  return readModules(['../../App.tsx', '../use-terminal-tabs.ts', '../TerminalTabs.tsx', '../preferences.ts']);
}
