#!/usr/bin/env bash
#
# Build and deploy Cloud Terminal.
#
#   ./scripts/deploy.sh              # deploy origin/main
#   ./scripts/deploy.sh 2ad75e3      # deploy (or roll back to) a specific ref
#
# The deploy target is a plain directory — no symlinked releases, no on-host
# backups. Rolling back means re-running this script with an older ref, which is
# why the ref is echoed into RELEASE.txt.
#
# Everything is built on the target host: the bundle embeds bun-pty, whose
# librust_pty.so must match the host, and the frontend is built from the same
# checkout so the served HTML always matches the deployed server.
set -euo pipefail

HOST="${DEPLOY_HOST:-root@10.10.0.101}"
BASE="${DEPLOY_BASE:-/opt/cloudcli-terminal-lite}"
REPO="${DEPLOY_REPO:-https://github.com/hyird/claudecodeui.git}"
SERVICE="${DEPLOY_SERVICE:-cloudcli.service}"
BUN="${DEPLOY_BUN:-/home/cloudcli/.bun/bin/bun}"
RUN_AS="${DEPLOY_USER:-cloudcli}"
PORT="${DEPLOY_PORT:-3001}"
REF="${1:-main}"
FORCE_RESTART="${DEPLOY_FORCE_RESTART:-0}"

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

say "Deploying ${REF} to ${HOST}:${BASE}/current"

# Refuse to deploy something that is not pushed: the host builds from the remote,
# so uncommitted work would silently not ship.
if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is dirty. Commit and push before deploying." >&2
  exit 1
fi

ssh -o BatchMode=yes "${HOST}" REF="${REF}" BASE="${BASE}" REPO="${REPO}" \
  SERVICE="${SERVICE}" BUN="${BUN}" RUN_AS="${RUN_AS}" PORT="${PORT}" FORCE_RESTART="${FORCE_RESTART}" 'bash -euo pipefail -s' <<'REMOTE'
BUILD="${BASE}/build-$$"
PTY_SERVICE="${SERVICE%.service}-pty.service"
cleanup() { rm -rf "${BUILD}"; }
trap cleanup EXIT

export PATH="$(dirname "${BUN}"):${PATH}"

check_active_sessions() {
  local payload
  if payload="$(curl -fsS -m 2 "http://127.0.0.1:${PORT}/api/health" 2>/dev/null)"; then
    if [[ ! "${payload}" =~ \"sessions\":([0-9]+) ]]; then
      echo 'error: cannot determine active terminal sessions' >&2
      return 1
    fi
    if (( BASH_REMATCH[1] > 0 && FORCE_RESTART == 0 )) \
      && [[ ! "${payload}" =~ \"persistentBackend\":[[:space:]]*\"bun-pty\" ]]; then
      echo 'error: legacy PTYs are still active. Close them once before migrating to persistent terminals.' >&2
      return 1
    fi
  elif systemctl is-active --quiet "${SERVICE}"; then
    echo 'error: active service health is unavailable; refusing to stop it' >&2
    return 1
  fi
}
check_active_sessions

echo "--- fetching ${REF} ---"
rm -rf "${BUILD}"
git clone --quiet "${REPO}" "${BUILD}"
git -C "${BUILD}" checkout --quiet "${REF}"
COMMIT="$(git -C "${BUILD}" rev-parse HEAD)"
echo "commit ${COMMIT}"

echo "--- building ---"
cd "${BUILD}"
bun install --frozen-lockfile --silent
bun run build
bun run test

# The frontend must exist before the swap, otherwise the server would come back
# up with no dist/ and silently serve nothing.
test -s "${BUILD}/dist/index.html"
test -s "${BUILD}/dist-server/server.js"
test -s "${BUILD}/dist-server/pty-broker.js"
PTY_LIB="$(find "${BUILD}/node_modules/bun-pty" -name librust_pty.so | head -1)"
test -n "${PTY_LIB}"

echo "--- swapping in (service down) ---"
check_active_sessions
systemctl stop "${SERVICE}"
install -D -m 644 "${BUILD}/dist-server/server.js" "${BASE}/current/server.js"
install -D -m 644 "${BUILD}/dist-server/pty-broker.js" "${BASE}/current/pty-broker.js"
# Leave the running broker's mapped library inode intact during web updates.
install -D -m 755 "${PTY_LIB}" "${BASE}/current/librust_pty.so.next"
mv -f "${BASE}/current/librust_pty.so.next" "${BASE}/current/librust_pty.so"
rm -rf "${BASE}/current/dist"
mkdir -p "${BASE}/current/dist"
cp -r "${BUILD}/dist/." "${BASE}/current/dist/"
echo "${COMMIT}" > "${BASE}/current/RELEASE.txt"
chown -R "${RUN_AS}:${RUN_AS}" "${BASE}/current"

RUN_HOME="$(getent passwd "${RUN_AS}" | cut -d: -f6)"
test -n "${RUN_HOME}"
cat > "/etc/systemd/system/${PTY_SERVICE}" <<UNIT
[Unit]
Description=Cloud Terminal persistent bun-pty service
After=network.target
[Service]
Type=simple
User=${RUN_AS}
RuntimeDirectory=cloud-terminal
RuntimeDirectoryMode=0700
Environment=HOME=${RUN_HOME}
Environment=SHELL=/bin/bash
Environment=PATH=$(dirname "${BUN}"):/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=BUN_PTY_LIB=${BASE}/current/librust_pty.so
Environment=CLOUDCLI_PTY_SOCKET=/run/cloud-terminal/pty.sock
ExecStart=${BUN} ${BASE}/current/pty-broker.js
Restart=on-failure
RestartSec=2s
KillMode=control-group
[Install]
WantedBy=multi-user.target
UNIT
mkdir -p "/etc/systemd/system/${SERVICE}.d"
cat > "/etc/systemd/system/${SERVICE}.d/20-persistent-terminals.conf" <<UNIT
[Unit]
After=${PTY_SERVICE}
Wants=${PTY_SERVICE}
[Service]
Environment=CLOUDCLI_PERSIST_TERMINALS=1
Environment=CLOUDCLI_PTY_SOCKET=/run/cloud-terminal/pty.sock
UNIT
systemctl daemon-reload
systemctl enable --now "${PTY_SERVICE}"
for _ in $(seq 1 40); do
  if test -S /run/cloud-terminal/pty.sock; then break; fi
  sleep 0.1
done
test -S /run/cloud-terminal/pty.sock
systemctl start "${SERVICE}"

echo "--- waiting for health ---"
for _ in $(seq 1 40); do
  if curl -fsS -m 2 "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

if ! curl -fsS -m 5 "http://localhost:${PORT}/api/health" >/dev/null; then
  echo "error: service did not become healthy" >&2
  systemctl status "${SERVICE}" --no-pager -n 30 >&2 || true
  exit 1
fi

echo "--- deployed ---"
echo "commit:  $(cat "${BASE}/current/RELEASE.txt")"
echo "health:  $(curl -fsS -m 5 "http://localhost:${PORT}/api/health")"
echo "size:    $(du -sh "${BASE}" | cut -f1)"
REMOTE

say "Done. Roll back with: $0 <previous-commit>"
