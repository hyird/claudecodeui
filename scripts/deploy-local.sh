#!/usr/bin/env bash
# Build, verify and install this checkout as the local systemd service.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
INSTALL_DIR="/opt/cloud-terminal"
SERVICE_NAME="cloud-terminal.service"
PTY_LIB="${PROJECT_DIR}/node_modules/bun-pty/rust-pty/target/release/librust_pty.so"
HEALTH_URL="http://127.0.0.1:3001/api/health"
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
    if (( active_sessions > 0 && FORCE_RESTART == 0 )); then
      printf 'error: refusing to restart %s with %s active terminal session(s).\n' \
        "${SERVICE_NAME}" "${active_sessions}" >&2
      printf 'Close the sessions first, or explicitly use --force.\n' >&2
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
test -s "${PTY_LIB}"

# Recheck after build/test so a session opened during verification is not killed.
check_active_sessions

sudo -n install -d -o root -g root -m 0755 "${INSTALL_DIR}"
sudo -n install -d -o root -g root -m 0755 "${INSTALL_DIR}/current"
sudo -n install -d -o user -g user -m 0700 "${INSTALL_DIR}/data"
sudo -n install -d -o root -g root -m 0755 "${INSTALL_DIR}/current/dist"
sudo -n install -o root -g root -m 0644 dist-server/server.js "${INSTALL_DIR}/current/server.js"
sudo -n install -o root -g root -m 0644 "${PTY_LIB}" "${INSTALL_DIR}/current/librust_pty.so"
sudo -n install -o root -g root -m 0644 dist/index.html "${INSTALL_DIR}/current/dist/index.html"
sudo -n install -o root -g root -m 0644 dist/logo.svg "${INSTALL_DIR}/current/dist/logo.svg"
sudo -n install -o root -g root -m 0644 deploy/cloud-terminal.service /etc/systemd/system/cloud-terminal.service

sudo -n systemctl daemon-reload
sudo -n systemctl enable "${SERVICE_NAME}" >/dev/null
sudo -n systemctl restart "${SERVICE_NAME}"

for attempt in {1..40}; do
  if curl -fsS --max-time 2 "${HEALTH_URL}" >/dev/null 2>&1; then
    printf '%s\n' "${SERVICE_NAME} is running at http://localhost:3001"
    curl -fsS "${HEALTH_URL}"
    printf '\n'
    exit 0
  fi
  sleep 0.25
done

sudo -n systemctl status "${SERVICE_NAME}" --no-pager -n 30 >&2
exit 1
