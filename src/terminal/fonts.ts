export const TERMINAL_FONT_FAMILY = '"Maple Mono NF CN", "CaskaydiaMono Nerd Font", "JetBrainsMono Nerd Font", "Symbols Nerd Font Mono", Consolas, monospace';

// Load the measuring glyphs before opening a terminal so the first PTY grid
// uses the final font metrics. Other unicode-range chunks remain lazy-loaded.
export async function loadTerminalFonts(fonts: FontFaceSet | undefined) {
  if (!fonts) return;
  await Promise.allSettled([
    fonts.load('14px "Maple Mono NF CN"', 'W'),
    fonts.load('bold 14px "Maple Mono NF CN"', 'W'),
  ]);
}
