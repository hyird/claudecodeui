import type { ITheme } from '@xterm/xterm';

// background must stay in sync with --bg-terminal in styles.css
export const terminalTheme: ITheme = {
  background: '#0a0c11',
  foreground: '#d6dae1',
  cursor: '#6ea1ff',
  cursorAccent: '#0a0c11',
  selectionBackground: '#2a3550',
  selectionForeground: '#eef2f8',
  scrollbarSliderBackground: '#ffffff24',
  scrollbarSliderHoverBackground: '#ffffff47',
  scrollbarSliderActiveBackground: '#ffffff66',
  // xterm paints a 1px overview-ruler divider whenever its compact overlay
  // scrollbar is enabled. Blend that divider into the terminal instead of
  // leaving xterm's default white line along the right edge.
  overviewRulerBorder: '#0a0c11',
  black: '#1c1f24',
  red: '#f4747f',
  green: '#55d187',
  yellow: '#e8c06a',
  blue: '#6ea1ff',
  magenta: '#b48ef7',
  cyan: '#5ad4e6',
  white: '#d6dae1',
  brightBlack: '#6a7382',
  brightRed: '#ff959e',
  brightGreen: '#7fe3ab',
  brightYellow: '#f5d685',
  brightBlue: '#93bbff',
  brightMagenta: '#cfaaff',
  brightCyan: '#8ae6f2',
  brightWhite: '#f2f5f9',
};
