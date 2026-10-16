// A generic ANSI application, independent of OMP: old-size retirement followed
// by a repaint below the history pulled into the taller screen.
export const resizeFixture = {
  cols: 60, oldRows: 8, newRows: 12,
  initial: '\x1b[?7l' + Array.from({ length: 28 }, (_, i) => `history_${i} 表头和数据`).join('\r\n') + '\r\x1b[8;1H',
  oldPaint: '\x1b[1;1H' + ['retired_title 表格标题', 'retired_header 版本 吞吐 CPU',
    ...Array.from({ length: 8 }, (_, i) => `live_${i}`)].map(row => row + '\x1b[K').join('\r\n') + '\r\x1b[8;1H',
  newPaint: '\x1b[5;1H' + Array.from({ length: 8 }, (_, i) => `live_${i}\x1b[K`).join('\r\n') + '\r',
};

export const bufferRows = terminal => {
  const buffer = terminal.buffer.normal;
  return Array.from({ length: buffer.length }, (_, i) => buffer.getLine(i).translateToString(true).trimEnd());
};
