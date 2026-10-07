import { spawnSync } from 'node:child_process';

export function createPersistentPtyBackend({
  enabled = process.env.CLOUDCLI_PERSIST_TERMINALS === '1',
  platform = process.platform,
  command = process.env.CLOUDCLI_TMUX_BIN || 'tmux',
  socketName = process.env.CLOUDCLI_TMUX_SOCKET || 'cloud-terminal',
  run = spawnSync,
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
    count() {
      return listSessionIds().length;
    },
    listSessionIds,
  };
}
