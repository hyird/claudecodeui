# shellcheck shell=bash
# Sourced by scripts/deploy.sh and scripts/deploy-local.sh.
#
#   render_unit TEMPLATE NAME=value...
#
# Prints TEMPLATE with every @NAME@ replaced. Values are limited to plain path
# characters so they cannot inject systemd specifiers (%), quoting or extra
# words, and the result must not contain an unrendered placeholder.
render_unit() {
  local template="$1" text pair name value
  shift
  text="$(<"${template}")" || return
  for pair in "$@"; do
    name="${pair%%=*}"
    value="${pair#*=}"
    if [[ ! "${value}" =~ ^[A-Za-z0-9._/+-]+$ ]]; then
      printf 'error: unsafe systemd unit value %s=%q\n' "${name}" "${value}" >&2
      return 1
    fi
    text="${text//"@${name}@"/"${value}"}"
  done
  if [[ "${text}" =~ @[A-Z_]+@ ]]; then
    printf 'error: %s has no value for %s\n' "${template}" "${BASH_REMATCH[0]}" >&2
    return 1
  fi
  printf '%s\n' "${text}"
}
