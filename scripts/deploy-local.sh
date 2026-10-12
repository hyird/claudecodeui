#!/usr/bin/env bash
# Build, verify and install this checkout as the local systemd service.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source-path=SCRIPTDIR source=../deploy/render-unit.sh
source "${PROJECT_DIR}/deploy/render-unit.sh"
INSTALL_DIR="/opt/cloud-terminal"
SERVICE_NAME="cloud-terminal.service"
PTY_SERVICE="cloud-terminal-pty.service"
SERVICE_USER="user"
SERVICE_HOME="/home/${SERVICE_USER}"
SERVICE_BUN="${SERVICE_HOME}/.bun/bin/bun"
PORT=3001
PTY_LIB="${PROJECT_DIR}/node_modules/bun-pty/rust-pty/target/release/librust_pty.so"
HEALTH_URL="http://127.0.0.1:${PORT}/api/health"
FORCE_RESTART=0

case "${1:-}" in
  '') ;;
  --force) FORCE_RESTART=1 ;;
  *)
    printf 'Usage: %s [--force]\n' "$0" >&2
    exit 2
    ;;
esac

check_active_sessions() {
  local health_payload
  local active_sessions

  if health_payload="$(curl -fsS --max-time 2 "${HEALTH_URL}" 2>/dev/null)"; then
    if [[ ! "${health_payload}" =~ \"sessions\":([0-9]+) ]]; then
      printf 'error: cannot read the active session count from %s\n' "${HEALTH_URL}" >&2
      return 1
    fi

    active_sessions="${BASH_REMATCH[1]}"
    if (( active_sessions > 0 && FORCE_RESTART == 0 )) \
      && [[ ! "${health_payload}" =~ \"persistentBackend\":[[:space:]]*\"bun-pty\" ]]; then
      printf 'error: refusing to restart %s with %s active terminal session(s).\n' \
        "${SERVICE_NAME}" "${active_sessions}" >&2
      printf 'These are legacy PTYs. Close them once to migrate, or explicitly use --force.\n' >&2
      return 1
    fi
    return 0
  fi

  if systemctl is-active --quiet "${SERVICE_NAME}"; then
    printf 'error: %s is active but its health endpoint is unavailable; refusing to restart.\n' \
      "${SERVICE_NAME}" >&2
    return 1
  fi
}

cd "${PROJECT_DIR}"

check_active_sessions
sudo -n true
bun run build
bun run test
test -s dist/index.html
test -s dist/logo.svg
test -s dist-server/server.js
test -s dist-server/pty-broker.js
test -s "${PTY_LIB}"

UNIT_STAGING="$(mktemp -d)"
trap 'rm -rf "${UNIT_STAGING}"' EXIT
UNIT_VALUES=(
  USER="${SERVICE_USER}" GROUP="${SERVICE_USER}" HOME="${SERVICE_HOME}" BUN="${SERVICE_BUN}"
  BUN_DIR="${SERVICE_BUN%/*}" BASE="${INSTALL_DIR}" PORT="${PORT}" PTY_SERVICE="${PTY_SERVICE}"
)
render_unit deploy/cloud-terminal.service "${UNIT_VALUES[@]}" >"${UNIT_STAGING}/${SERVICE_NAME}"
render_unit deploy/cloud-terminal-pty.service "${UNIT_VALUES[@]}" >"${UNIT_STAGING}/${PTY_SERVICE}"

# Recheck after build/test so a session opened during verification is not killed.
check_active_sessions

sudo -n install -d -o root -g root -m 0755 "${INSTALL_DIR}"
sudo -n install -d -o root -g root -m 0755 "${INSTALL_DIR}/current"
sudo -n install -d -o "${SERVICE_USER}" -g "${SERVICE_USER}" -m 0700 "${INSTALL_DIR}/data"
sudo -n install -o root -g root -m 0644 dist-server/server.js "${INSTALL_DIR}/current/server.js"
sudo -n install -o root -g root -m 0644 dist-server/pty-broker.js "${INSTALL_DIR}/current/pty-broker.js"
# Replace the inode so the running PTY service retains its mapped native library.
sudo -n install -o root -g root -m 0644 "${PTY_LIB}" "${INSTALL_DIR}/current/librust_pty.so.next"
sudo -n mv -f "${INSTALL_DIR}/current/librust_pty.so.next" "${INSTALL_DIR}/current/librust_pty.so"
# Replace dist/ as a whole: the server serves every file in it, and versioned
# font names change between releases.
sudo -n rm -rf "${INSTALL_DIR}/current/dist.next" "${INSTALL_DIR}/current/dist.prev"
sudo -n cp -R dist "${INSTALL_DIR}/current/dist.next"
sudo -n chown -R root:root "${INSTALL_DIR}/current/dist.next"
sudo -n chmod -R u=rwX,go=rX "${INSTALL_DIR}/current/dist.next"
if [ -e "${INSTALL_DIR}/current/dist" ]; then
  sudo -n mv "${INSTALL_DIR}/current/dist" "${INSTALL_DIR}/current/dist.prev"
fi
sudo -n mv "${INSTALL_DIR}/current/dist.next" "${INSTALL_DIR}/current/dist"
sudo -n rm -rf "${INSTALL_DIR}/current/dist.prev"
sudo -n install -o root -g root -m 0644 "${UNIT_STAGING}/${SERVICE_NAME}" "/etc/systemd/system/${SERVICE_NAME}"
sudo -n install -o root -g root -m 0644 "${UNIT_STAGING}/${PTY_SERVICE}" "/etc/systemd/system/${PTY_SERVICE}"

sudo -n systemctl daemon-reload
sudo -n systemctl enable --now "${PTY_SERVICE}" >/dev/null
# Starting an already active PTY unit preserves every shell. Never restart it
# as part of a web application deployment.
for _ in {1..40}; do
  if test -S /run/cloud-terminal/pty.sock; then
    break
  fi
  sleep 0.1
done
test -S /run/cloud-terminal/pty.sock
sudo -n systemctl enable "${SERVICE_NAME}" >/dev/null
sudo -n systemctl restart "${SERVICE_NAME}"

for _ in {1..40}; do
  if curl -fsS --max-time 2 "${HEALTH_URL}" >/dev/null 2>&1; then
    printf '%s\n' "${SERVICE_NAME} is running at http://localhost:${PORT}"
    curl -fsS "${HEALTH_URL}"
    printf '\n'
    exit 0
  fi
  sleep 0.25
done

sudo -n systemctl status "${SERVICE_NAME}" --no-pager -n 30 >&2
exit 1
