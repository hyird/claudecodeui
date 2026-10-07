
export const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SPINNER_TITLE_PREFIX = /^[\u2800-\u28ff]+[\s:·.-]*/u;

export function readString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function readNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function cleanTerminalTitle(title) {
  return readString(title)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .replace(SPINNER_TITLE_PREFIX, '')
    .trim()
    .slice(0, 80);
}
