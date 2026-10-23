#!/usr/bin/env bash
#
# Build and deploy Cloud Terminal to a remote systemd host.
#
#   ./scripts/deploy.sh              # deploy origin/main
#   ./scripts/deploy.sh 2ad75e3      # deploy (or roll back to) a commit of origin/main
#
# The application is built on the target host from the requested commit: the
# native node-pty and SQLite addons must match the host, and the
# frontend comes from the same checkout so the served HTML always matches the
# deployed server. The systemd units are rendered from this checkout's
# deploy/*.service, so rolling the application back keeps the current units.
#
# The new release is staged in ${BASE}/current.next and renamed into place while
# the web service is stopped. If anything fails after the stop, the previous
# release, unit files and database location are restored and the previous web
# service is started again. The PTY service is never restarted, so open shells
# survive every update and every rollback. RELEASE.txt records the commit.
#
# The defaults describe the existing remote host, which predates the rename to
# Cloud Terminal (service account cloudcli, cloudcli.service). Override them
# with the DEPLOY_* variables below.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source-path=SCRIPTDIR source=../deploy/render-unit.sh
source "${PROJECT_DIR}/deploy/render-unit.sh"

HOST="${DEPLOY_HOST:-root@10.10.0.101}"
BASE="${DEPLOY_BASE:-/opt/cloudcli-terminal-lite}"
REPO="${DEPLOY_REPO:-https://github.com/hyird/claudecodeui.git}"
BRANCH="${DEPLOY_BRANCH:-main}"
SERVICE="${DEPLOY_SERVICE:-cloudcli.service}"
RUN_AS="${DEPLOY_USER:-cloudcli}"
RUN_GROUP="${DEPLOY_GROUP:-${RUN_AS}}"
RUN_HOME="${DEPLOY_HOME:-/home/${RUN_AS}}"
NODE="${DEPLOY_NODE:-/usr/bin/node}"
PORT="${DEPLOY_PORT:-3001}"
FORCE_RESTART="${DEPLOY_FORCE_RESTART:-0}"
REF="${1:-${BRANCH}}"
PTY_SERVICE="${SERVICE%.service}-pty.service"

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
die() { printf 'error: %s\n' "$1" >&2; exit 1; }

cd "${PROJECT_DIR}"

# The host builds from the remote and the units come from this checkout, so
# refuse anything that has not been pushed.
[ -z "$(git status --porcelain)" ] || die 'working tree is dirty. Commit and push before deploying.'
git fetch --quiet origin "${BRANCH}"
git merge-base --is-ancestor HEAD "origin/${BRANCH}" \
  || die "local HEAD $(git rev-parse --short HEAD) is not in origin/${BRANCH}. Push before deploying."
if [ "${REF}" = "${BRANCH}" ]; then
  COMMIT="$(git rev-parse "origin/${BRANCH}^{commit}")"
else
  COMMIT="$(git rev-parse --verify --quiet "${REF}^{commit}")" || die "unknown ref ${REF}"
  git merge-base --is-ancestor "${COMMIT}" "origin/${BRANCH}" || die "${REF} is not in origin/${BRANCH}"
fi

UNIT_VALUES=(
  USER="${RUN_AS}" GROUP="${RUN_GROUP}" HOME="${RUN_HOME}" NODE="${NODE}" NODE_DIR="${NODE%/*}"
  BASE="${BASE}" PORT="${PORT}" PTY_SERVICE="${PTY_SERVICE}"
)
WEB_UNIT="$(render_unit deploy/cloud-terminal.service "${UNIT_VALUES[@]}")"
PTY_UNIT="$(render_unit deploy/cloud-terminal-pty.service "${UNIT_VALUES[@]}")"

say "Deploying ${REF} (${COMMIT:0:12}) to ${HOST}:${BASE}/current"

{
  declare -p COMMIT BASE REPO SERVICE PTY_SERVICE NODE RUN_AS RUN_GROUP RUN_HOME PORT FORCE_RESTART WEB_UNIT PTY_UNIT
  cat <<'REMOTE'
set -euo pipefail

BUILD="${BASE}/build-$$"
CURRENT="${BASE}/current"
NEXT="${BASE}/current.next"
PREV="${BASE}/current.prev"
DATA="${BASE}/data"
DB_PATH="${DATA}/auth.sqlite"
SOCKET=/run/cloud-terminal/pty.sock
UNIT_DIR=/etc/systemd/system
BACKUP="${BUILD}/previous-units"
# Older deployments configured persistent terminals through this drop-in; the
# rendered unit now carries those settings.
LEGACY_DROP_IN="${UNIT_DIR}/${SERVICE}.d/20-persistent-terminals.conf"
export PATH="${NODE%/*}:${PATH}"

WAS_ACTIVE=0
STOPPED=0
SWAPPED=0
UNITS_REPLACED=0
COMMITTED=0
MOVED_DB=()
LEGACY_DB=''

die() { printf 'error: %s\n' "$1" >&2; exit 1; }

check_active_sessions() {
  local payload
  if payload="$(curl -fsS -m 2 "http://127.0.0.1:${PORT}/api/health" 2>/dev/null)"; then
    if [[ ! "${payload}" =~ \"sessions\":([0-9]+) ]]; then
      die 'cannot determine active terminal sessions'
    fi
    if (( BASH_REMATCH[1] > 0 && FORCE_RESTART == 0 )) \
      && [[ ! "${payload}" =~ \"persistentSessions\":[[:space:]]*true ]]; then
      die 'legacy PTYs are still active. Close them once before migrating to persistent terminals.'
    fi
  elif systemctl is-active --quiet "${SERVICE}"; then
    die 'active service health is unavailable; refusing to stop it'
  fi
}

# The database the running web service uses: its CLOUDCLI_DB_PATH, or the
# server's default next to the release directory.
service_db_path() {
  local entries entry
  read -ra entries <<<"$(systemctl show -p Environment --value "${SERVICE}")"
  for entry in "${entries[@]}"; do
    if [[ "${entry}" == CLOUDCLI_DB_PATH=* ]]; then
      printf '%s\n' "${entry#CLOUDCLI_DB_PATH=}"
      return
    fi
  done
  printf '%s\n' "${BASE}/.cloudcli.sqlite"
}

# A first deployment has no web unit yet; stopping an unknown unit fails.
unit_loaded() {
  [ "$(systemctl show -p LoadState --value "$1")" = loaded ]
}

backup_unit() {
  if [ -e "$1" ]; then
    install -D -m 0644 "$1" "${BACKUP}/$2"
  fi
}

# A unit file that did not exist before is removed again, except the PTY unit:
# once started it may already host shells and must stay loadable.
restore_unit() {
  if [ -e "${BACKUP}/$2" ]; then
    install -D -m 0644 "${BACKUP}/$2" "$1"
  elif [ "$2" != pty ]; then
    rm -f "$1"
  fi
}

rollback() {
  set +e
  echo '--- deploy failed; restoring the previous release ---' >&2
  if unit_loaded "${SERVICE}"; then
    systemctl stop "${SERVICE}"
    # The failed release may have hit the start rate limit while crash-looping.
    systemctl reset-failed "${SERVICE}"
  fi
  if (( SWAPPED )); then
    rm -rf "${CURRENT}"
    if [ -d "${PREV}" ]; then mv "${PREV}" "${CURRENT}"; fi
  fi
  local index
  for (( index = ${#MOVED_DB[@]} - 1; index >= 0; index-- )); do
    mv "${DB_PATH}${MOVED_DB[index]}" "${LEGACY_DB}${MOVED_DB[index]}"
  done
  if (( UNITS_REPLACED )); then
    restore_unit "${UNIT_DIR}/${SERVICE}" web
    restore_unit "${UNIT_DIR}/${PTY_SERVICE}" pty
    restore_unit "${LEGACY_DROP_IN}" drop-in
    systemctl daemon-reload
  fi
  if (( WAS_ACTIVE )); then
    systemctl start "${SERVICE}" && echo "restarted the previous ${SERVICE}" >&2
  fi
}

on_exit() {
  local status=$?
  if (( status != 0 && STOPPED && !COMMITTED )); then rollback; fi
  cd /
  rm -rf "${BUILD}" "${NEXT}"
  exit "${status}"
}

main() {
  trap on_exit EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM

  [ "$(getent passwd "${RUN_AS}" | cut -d: -f6)" = "${RUN_HOME}" ] \
    || die "${RUN_AS} does not exist or its home is not ${RUN_HOME} (set DEPLOY_HOME)"
  getent group "${RUN_GROUP}" >/dev/null || die "group ${RUN_GROUP} does not exist (set DEPLOY_GROUP)"
  test -x "${NODE}" || die "${NODE} is not executable (set DEPLOY_NODE)"
  if systemctl is-active --quiet "${SERVICE}"; then WAS_ACTIVE=1; fi
  check_active_sessions

  echo "--- fetching ${COMMIT} ---"
  rm -rf "${BUILD}"
  git clone --quiet "${REPO}" "${BUILD}"
  git -C "${BUILD}" checkout --quiet --detach "${COMMIT}"

  echo '--- building ---'
  cd "${BUILD}"
  npm ci --no-audit --no-fund
  npm run build
  npm run test
  # The server must never come back up without its frontend.
  test -s dist/index.html
  test -s dist-server/server.js
  test -s dist-server/pty-broker.js
  test -s dist-server/package.json
  test -d dist-server/node_modules/node-pty
  test -d dist-server/node_modules/better-sqlite3

  echo "--- staging ${NEXT} ---"
  rm -rf "${NEXT}"
  mkdir -p "${BASE}"
  install -d -m 0755 "${NEXT}"
  cp -R dist-server/. "${NEXT}/"
  cp -R dist "${NEXT}/dist"
  printf '%s\n' "${COMMIT}" >"${NEXT}/RELEASE.txt"
  chown -R root:root "${NEXT}"
  chmod -R u=rwX,go=rX "${NEXT}"
  install -d "${BUILD}/units"
  printf '%s\n' "${WEB_UNIT}" >"${BUILD}/units/web"
  printf '%s\n' "${PTY_UNIT}" >"${BUILD}/units/pty"

  LEGACY_DB="$(service_db_path)"
  if [[ "${LEGACY_DB}" == "${DB_PATH}" || "${LEGACY_DB}" != /* || ! -e "${LEGACY_DB}" ]]; then
    LEGACY_DB=''
  elif [ -e "${DB_PATH}" ]; then
    die "both ${LEGACY_DB} and ${DB_PATH} exist; keep one before deploying"
  fi

  echo '--- swapping in (web service down) ---'
  check_active_sessions
  backup_unit "${UNIT_DIR}/${SERVICE}" web
  backup_unit "${UNIT_DIR}/${PTY_SERVICE}" pty
  backup_unit "${LEGACY_DROP_IN}" drop-in
  STOPPED=1
  if unit_loaded "${SERVICE}"; then systemctl stop "${SERVICE}"; fi

  install -d -o "${RUN_AS}" -g "${RUN_GROUP}" -m 0700 "${DATA}"
  if [ -n "${LEGACY_DB}" ]; then
    local suffix
    for suffix in '' -wal -shm; do
      if [ -e "${LEGACY_DB}${suffix}" ]; then
        mv "${LEGACY_DB}${suffix}" "${DB_PATH}${suffix}"
        MOVED_DB+=("${suffix}")
      fi
    done
    echo "moved ${LEGACY_DB} to ${DB_PATH}"
  fi

  rm -rf "${PREV}"
  if [ -e "${CURRENT}" ]; then mv "${CURRENT}" "${PREV}"; fi
  SWAPPED=1
  mv "${NEXT}" "${CURRENT}"

  UNITS_REPLACED=1
  install -m 0644 "${BUILD}/units/web" "${UNIT_DIR}/${SERVICE}"
  install -m 0644 "${BUILD}/units/pty" "${UNIT_DIR}/${PTY_SERVICE}"
  rm -f "${LEGACY_DROP_IN}"
  systemctl daemon-reload
  # Starting an already active PTY unit is a no-op, so every shell survives.
  # Never restart it here.
  systemctl enable --now "${PTY_SERVICE}"
  for _ in $(seq 1 40); do
    if test -S "${SOCKET}"; then break; fi
    sleep 0.1
  done
  test -S "${SOCKET}"
  systemctl enable "${SERVICE}"
  systemctl start "${SERVICE}"

  echo '--- waiting for health ---'
  local healthy=0
  for _ in $(seq 1 40); do
    if curl -fsS -m 2 "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
      healthy=1
      break
    fi
    sleep 0.5
  done
  if (( !healthy )); then
    systemctl status "${SERVICE}" --no-pager -n 30 >&2 || true
    die 'service did not become healthy'
  fi
  COMMITTED=1
  rm -rf "${PREV}"

  echo '--- deployed ---'
  echo "commit:  $(cat "${CURRENT}/RELEASE.txt")"
  echo "health:  $(curl -fsS -m 5 "http://127.0.0.1:${PORT}/api/health")"
  echo "size:    $(du -sh "${BASE}" | cut -f1)"
}

main
REMOTE
} | ssh -o BatchMode=yes "${HOST}" 'bash -s'

say "Done. Roll back with: $0 <previous-commit>"
