import { readlink } from 'node:fs/promises';

function oscDirectory(data, platform) {
  try {
    const url = new URL(data);
    if (url.protocol !== 'file:') return null;
    const directory = decodeURIComponent(url.pathname);
    if (!directory.startsWith('/') || /[\u0000-\u001f\u007f]/u.test(directory)) return null;
    if (platform !== 'win32') return directory;
    if (/^\/[a-z]:\//i.test(directory)) return directory.slice(1).replace(/\//g, '\\');
    if (url.hostname && url.hostname !== 'localhost') return `\\\\${url.hostname}${directory.replace(/\//g, '\\')}`;
    return null;
  } catch {
    return null;
  }
}

// Linux exposes the shell's actual cwd even when its prompt never reports one,
// or a foreground program replaces the terminal title. OSC 7 supplies cwd on
// platforms without /proc. Neither path needs to send commands into the shell.
export function watchTerminalCwd({
  terminal, pid, initialCwd, onChange,
  platform = process.platform, readProcessLink = readlink, intervalMs = 1000,
}) {
  let disposed = false;
  let timer;
  let currentCwd;
  let processCwdAvailable = false;
  const publish = (cwd) => {
    if (disposed || !cwd || cwd === currentCwd) return;
    currentCwd = cwd;
    onChange(cwd);
  };
  publish(initialCwd);
  const osc = terminal.parser.registerOscHandler(7, (data) => {
    if (!processCwdAvailable) publish(oscDirectory(data, platform));
    return true;
  });
  const windowsOsc = terminal.parser.registerOscHandler(9, (data) => {
    if (!data.startsWith('9;')) return false;
    const directory = data.slice(2);
    if (platform === 'win32' && /^(?:[a-z]:[\\/]|\\\\)/i.test(directory)
      && !/[\u0000-\u001f\u007f]/u.test(directory)) publish(directory);
    return true;
  });
  const poll = async () => {
    try {
      const cwd = await readProcessLink(`/proc/${pid}/cwd`);
      if (!disposed) {
        processCwdAvailable = true;
        publish(cwd);
      }
    } catch {
      // The process may have exited, or /proc may be inaccessible. Keep the
      // last directory and continue accepting explicit shell cwd reports.
      processCwdAvailable = false;
    }
    if (!disposed) {
      timer = setTimeout(poll, intervalMs);
      timer.unref?.();
    }
  };
  if (platform === 'linux' && Number.isSafeInteger(pid) && pid > 0) void poll();
  return () => {
    disposed = true;
    clearTimeout(timer);
    osc.dispose();
    windowsOsc.dispose();
  };
}
