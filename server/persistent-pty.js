import { execFile, spawnSync } from 'node:child_process';

const VIEWPORT_FORMAT = '#{history_size}:#{scroll_position}:#{pane_height}:#{alternate_on}:#{pane_in_mode}';
function parseViewport(value) {
  const [historyLines, offset, rows, alternate, inMode] = value.trim().split(':').map((part) => Number(part) || 0);
  return { historyLines: alternate ? 0 : historyLines, offset, rows, inMode: inMode !== 0 };
}

export function createPersistentPtyBackend({
  enabled = process.env.CLOUDCLI_PERSIST_TERMINALS === '1',
  platform = process.platform,
  command = process.env.CLOUDCLI_TMUX_BIN || 'tmux',
  socketName = process.env.CLOUDCLI_TMUX_SOCKET || 'cloud-terminal',
  run = spawnSync,
  runAsync = execFile,
} = {}) {
  const execute = (args) => run(command, ['-L', socketName, ...args], {
    encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (enabled) {
    if (platform === 'win32') throw new Error('Persistent terminals require tmux on Linux or macOS');
    // -N prevents accidentally starting tmux in the web service's cgroup, where
    // systemd would kill the shells during an application update.
    const probe = execute(['-N', 'show-options', '-s', '-v', 'exit-empty']);
    if (probe.status !== 0) {
      throw new Error('Persistent terminal service is unavailable. Start the separate tmux service first.');
    }
  }
  const nameFor = (sessionId) => `cloud-terminal-${sessionId}`;
  const checked = (args) => {
    const result = execute(['-N', ...args]);
    if (result.status !== 0) throw new Error(`tmux failed: ${result.error?.message || result.stderr?.trim() || 'unknown error'}`);
    return result.stdout.trim();
  };
  // Scrolling and viewport polling run frequently. Never block output, input
  // acknowledgements or other sessions while waiting for a tmux subprocess.
  const checkedAsync = (args) => new Promise((resolve, reject) => {
    runAsync(command, ['-L', socketName, '-N', ...args], { encoding: 'utf8', timeout: 5000 }, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout.trim());
    });
  });
  const listSessionIds = () => {
    if (!enabled) return [];
    const result = execute(['-N', 'list-sessions', '-F', '#{session_name}']);
    if (result.status !== 0) return [];
    const prefix = 'cloud-terminal-';
    return result.stdout.split('\n').filter((name) => name.startsWith(prefix)).map((name) => name.slice(prefix.length));
  };
  return {
    enabled,
    prepare(sessionId, { cwd, cols, rows, shell, env }) {
      if (!enabled) return null;
      const name = nameFor(sessionId);
      if (execute(['-N', 'has-session', '-t', `=${name}`]).status !== 0) {
        checked([
          'new-session', '-d', '-s', name, '-c', cwd, '-x', String(cols), '-y', String(rows),
          '-e', 'COLORTERM=truecolor', '-e', 'FORCE_COLOR=3', '-e', `SSH_CLIENT=${env.SSH_CLIENT}`,
          shell.command, ...shell.args,
        ]);
      }
      // display-message targets a pane. A trailing colon makes the exact session
      // name a pane target; without it tmux returns only global format fields.
      const generation = checked(['display-message', '-p', '-t', `=${name}:`, '#{pid}:#{session_id}:#{session_created}']);
      const actualCwd = checked(['display-message', '-p', '-t', `=${name}:`, '#{pane_current_path}']);
      return {
        command, args: ['-L', socketName, '-N', 'attach-session', '-t', `=${name}`],
        generation: `tmux:${generation}`, cwd: actualCwd || cwd,
      };
    },
    close(sessionId) {
      if (enabled) execute(['-N', 'kill-session', '-t', `=${nameFor(sessionId)}`]);
    },
    async viewport(sessionId) {
      if (!enabled) return null;
      return parseViewport(await checkedAsync(['display-message', '-p', '-t', `=${nameFor(sessionId)}:`, VIEWPORT_FORMAT]));
    },
    async scroll(sessionId, requestedOffset) {
      const viewport = await this.viewport(sessionId);
      if (!viewport) return null;
      const offset = Math.min(viewport.historyLines, Math.max(0, Math.floor(requestedOffset)));
      const target = `=${nameFor(sessionId)}:`;
      let args;
      if (offset === 0) {
        if (!viewport.inMode) return viewport;
        args = ['send-keys', '-X', '-t', target, 'cancel'];
      } else {
        // goto-line takes an offset from the bottom and redraws once. Repeated
        // scroll-down walks every intervening line and gets slower with history.
        args = ['copy-mode', '-e', '-t', target,
          ';', 'send-keys', '-X', '-t', target, 'goto-line', String(offset)];
      }
      // Read the resulting position in the same tmux command batch.
      return parseViewport(await checkedAsync([...args,
        ';', 'display-message', '-p', '-t', target, VIEWPORT_FORMAT]));
    },
    count() {
      return listSessionIds().length;
    },
    listSessionIds,
  };
}
