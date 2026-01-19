#!/usr/bin/env bash
set -euo pipefail

REPO_RAW_URL_DEFAULT="https://raw.githubusercontent.com/strayiker/smart-home-media-assistant-telegram-bot/refs/heads/main"
REPO_RAW_URL="${REPO_RAW_URL:-$REPO_RAW_URL_DEFAULT}"

INSTALL_DIR="${INSTALL_DIR:-$HOME/smart-home-media-assistant-telegram-bot}"
QBT_SAVE_PATH="${QBT_SAVE_PATH:-/srv/torrents}"

# For Linux containers without --network host, we need to use host.docker.internal
BOT_API_ADDRESS_DEFAULT="http://host.docker.internal:8081"
QBT_WEB_UI_ADDRESS_DEFAULT="http://host.docker.internal:8080"

ENV_KEYS=(
  SECRET_KEY
  BOT_TOKEN
  BOT_API_ADDRESS
  BOT_DATA_PATH
  BOT_DATA_TORRENTS_PATH
  RUTRACKER_USERNAME
  RUTRACKER_PASSWORD
  QBT_WEB_UI_ADDRESS
  QBT_WEB_UI_USERNAME
  QBT_WEB_UI_PASSWORD
  QBT_SAVE_PATH
)

ENV_API_KEYS=(
  TELEGRAM_API_ID
  TELEGRAM_API_HASH
  TELEGRAM_LOCAL
)

in_array() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    if [[ "$item" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

strip_quotes() {
  local v="$1"
  if [[ "$v" == \"*\" ]] && [[ "$v" == *\" ]]; then
    echo "${v:1:${#v}-2}"
    return
  fi
  if [[ "$v" == "'"*"'" ]]; then
    echo "${v:1:${#v}-2}"
    return
  fi
  echo "$v"
}

load_env_file() {
  local file="$1"
  shift
  local allowed_keys=("$@")

  if [[ ! -f "$file" ]]; then
    return
  fi

  local line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" ]] && continue
    [[ "$line" == \#* ]] && continue
    [[ "$line" != *=* ]] && continue

    key="${line%%=*}"
    value="${line#*=}"

    if ! in_array "$key" "${allowed_keys[@]}"; then
      continue
    fi

    if [[ -n "${!key:-}" ]]; then
      continue
    fi

    value="$(strip_quotes "$value")"
    printf -v "$key" '%s' "$value"
  done < "$file"
}

load_existing_install_env() {
  load_env_file "$INSTALL_DIR/.env" "${ENV_KEYS[@]}"
  load_env_file "$INSTALL_DIR/.env.api" "${ENV_API_KEYS[@]}"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need_sudo() {
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required" >&2
    exit 1
  fi
}

prompt_secret() {
  local var="$1"
  local prompt="$2"

  if [[ -n "${!var:-}" ]]; then
    return
  fi

  read -rsp "$prompt" "$var"; echo ""
  if [[ -z "${!var}" ]]; then
    echo "Missing value: $var" >&2
    exit 1
  fi
}

prompt_value() {
  local var="$1"
  local prompt="$2"
  local def="${3:-}"

  if [[ -n "${!var:-}" ]]; then
    return
  fi

  if [[ -n "$def" ]]; then
    read -rp "$prompt" tmp
    if [[ -z "$tmp" ]]; then
      tmp="$def"
    fi
  else
    read -rp "$prompt" tmp
  fi

  printf -v "$var" "%s" "$tmp"
  if [[ -z "${!var}" ]]; then
    echo "Missing value: $var" >&2
    exit 1
  fi
}

ensure_root_deps_debian() {
  export DEBIAN_FRONTEND=noninteractive
  export TZ=Etc/UTC

  sudo apt-get -qq update
  sudo apt-get -qq install -y --no-install-recommends \
    ca-certificates \
    curl \
    openssl \
    python3 \
    sqlite3 \
    jq \
    systemd \
    iproute2
}

ensure_docker() {
  if command -v docker >/dev/null 2>&1; then
    sudo systemctl enable --now docker >/dev/null 2>&1 || true
    return
  fi

  echo "Installing Docker (apt: docker.io + compose)..."
  sudo apt-get -qq install -y --no-install-recommends docker.io
  sudo systemctl enable --now docker

  if ! command -v docker-compose >/dev/null 2>&1; then
    # On some Debian/Ubuntu versions compose plugin package name differs; keep it simple.
    sudo apt-get -qq install -y --no-install-recommends docker-compose || true
  fi
}

ensure_user_in_docker_group() {
  if groups "$USER" | grep -q "\bdocker\b"; then
    return
  fi

  echo "Adding $USER to docker group (you may need to re-login)"
  sudo usermod -aG docker "$USER" || true
}

install_qbittorrent_nox() {
  if command -v qbittorrent-nox >/dev/null 2>&1; then
    return
  fi

  echo "Installing qbittorrent-nox..."
  sudo apt-get -qq install -y --no-install-recommends qbittorrent-nox
}

install_qbittorrent_service() {
  # Add host.docker.internal to /etc/hosts on Debian/Ubuntu
  if [[ "$OS" == "Linux" ]] && [[ -f /etc/debian_version ]]; then
    echo "Adding host.docker.internal to /etc/hosts..."
    sudo tee -a /etc/hosts <<< "127.0.0.1 host.docker.internal"
  fi
  local unit_path=/etc/systemd/system/qbittorrent-nox.service
  local user="$USER"

  if [[ -f "$unit_path" ]]; then
    return
  fi

  echo "Installing systemd unit for qbittorrent-nox..."

  sudo tee "$unit_path" >/dev/null <<EOF
[Unit]
Description=qBittorrent-nox (WebUI)
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=$user
Group=$user
ExecStart=/usr/bin/qbittorrent-nox --webui-port=8080
Restart=on-failure
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable --now qbittorrent-nox.service
}

wait_http() {
  local url="$1"
  local tries="${2:-60}"

  for _ in $(seq 1 "$tries"); do
    if curl -fsS -o /dev/null "$url"; then
      return 0
    fi
    sleep 1
  done

  return 1
}

qbt_login_cookie() {
  local username="$1"
  local password="$2"
  local cookie_file="$3"

  local qbt_addr
  qbt_addr="${QBT_WEB_UI_ADDRESS:-$QBT_WEB_UI_ADDRESS_DEFAULT}"

  curl -fsS -c "$cookie_file" -b "$cookie_file" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "username=$username" \
    --data-urlencode "password=$password" \
    "$qbt_addr/api/v2/auth/login" \
    | grep -q "Ok\." \
    || return 1
}

qbt_set_prefs() {
  local cookie_file="$1"
  local json="$2"

  local qbt_addr
  qbt_addr="${QBT_WEB_UI_ADDRESS:-$QBT_WEB_UI_ADDRESS_DEFAULT}"

  curl -fsS -b "$cookie_file" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "json=$json" \
    "$qbt_addr/api/v2/app/setPreferences" \
    >/dev/null
}

configure_qbittorrent_webui_credentials() {
  echo "Configuring qBittorrent WebUI credentials..."

  mkdir -p "$QBT_SAVE_PATH"
  sudo chown -R "$USER":"$USER" "$QBT_SAVE_PATH" || true

  local cookie
  cookie=$(mktemp)

  # Try to login with the desired credentials first (idempotent path)
  if qbt_login_cookie "$QBT_WEB_UI_USERNAME" "$QBT_WEB_UI_PASSWORD" "$cookie"; then
    qbt_set_prefs "$cookie" "{\"save_path\":\"$QBT_SAVE_PATH\"}"
    rm -f "$cookie"
    echo "qBittorrent WebUI already configured."
    return
  fi

  # Otherwise, try temporary password flow (qBittorrent prints it when admin password isn't set)
  local tmp_pass
  tmp_pass=$(sudo journalctl -u qbittorrent-nox.service -b --no-pager | grep -Eo 'temporary password[^:]*: [^ ]+' | tail -n1 | sed -E 's/.*: //')

  if [[ -z "$tmp_pass" ]]; then
    rm -f "$cookie"
    echo "Unable to find temporary qBittorrent password in journal. Open qBittorrent WebUI once and retry." >&2
    exit 1
  fi

  if ! qbt_login_cookie "admin" "$tmp_pass" "$cookie"; then
    rm -f "$cookie"
    echo "Unable to login to qBittorrent WebUI with temporary password." >&2
    exit 1
  fi

  qbt_set_prefs "$cookie" "{\"web_ui_username\":\"$QBT_WEB_UI_USERNAME\",\"web_ui_password\":\"$QBT_WEB_UI_PASSWORD\",\"save_path\":\"$QBT_SAVE_PATH\"}"

  rm -f "$cookie"
  echo "qBittorrent WebUI credentials configured."
}

download_templates() {
  mkdir -p "$INSTALL_DIR"

  curl -fsSL "$REPO_RAW_URL/scripts/start.tmpl" -o "$INSTALL_DIR/start.sh"
  curl -fsSL "$REPO_RAW_URL/scripts/stop.tmpl" -o "$INSTALL_DIR/stop.sh"
  curl -fsSL "$REPO_RAW_URL/scripts/update.tmpl" -o "$INSTALL_DIR/update.sh"
  curl -fsSL "$REPO_RAW_URL/scripts/smart-home-media-assistant-telegram-bot.service.tmpl" -o "$INSTALL_DIR/bot.service.tmpl"
}

detect_version() {
  local version
  version=$(curl -fsSL "$REPO_RAW_URL/package.json" | sed -nE 's/.*"version": "([^"]+)".*/\1/p' | head -n1 || true)
  if [[ -z "$version" ]]; then
    echo "latest"
  else
    echo "$version"
  fi
}

generate_scripts() {
  local version
  version=$(detect_version)

  chmod +x "$INSTALL_DIR/start.sh" "$INSTALL_DIR/stop.sh" "$INSTALL_DIR/update.sh"

  sed -i \
    -e "s|{{VERSION}}|$version|g" \
    -e "s|{{CONTAINER_TOOL}}|docker|g" \
    -e "s|{{SAVE_PATH}}|$QBT_SAVE_PATH|g" \
    "$INSTALL_DIR/start.sh"

  sed -i \
    -e "s|{{CONTAINER_TOOL}}|docker|g" \
    "$INSTALL_DIR/stop.sh"
}

write_env_files() {
  mkdir -p "$INSTALL_DIR/data"

  local secret_key
  secret_key="${SECRET_KEY:-}"
  if [[ -z "$secret_key" ]]; then
    secret_key=$(openssl rand -hex 32)
  fi

  cat > "$INSTALL_DIR/.env" <<EOF
SECRET_KEY=$secret_key
BOT_TOKEN=$BOT_TOKEN
BOT_API_ADDRESS=${BOT_API_ADDRESS:-$BOT_API_ADDRESS_DEFAULT}
BOT_DATA_PATH=/data/bot
BOT_DATA_TORRENTS_PATH=/data/torrents
RUTRACKER_USERNAME=$RUTRACKER_USERNAME
RUTRACKER_PASSWORD=$RUTRACKER_PASSWORD
QBT_WEB_UI_ADDRESS=${QBT_WEB_UI_ADDRESS:-$QBT_WEB_UI_ADDRESS_DEFAULT}
QBT_WEB_UI_USERNAME=$QBT_WEB_UI_USERNAME
QBT_WEB_UI_PASSWORD=$QBT_WEB_UI_PASSWORD
QBT_SAVE_PATH=$QBT_SAVE_PATH
EOF

  cat > "$INSTALL_DIR/.env.api" <<EOF
TELEGRAM_API_ID=$TELEGRAM_API_ID
TELEGRAM_API_HASH=$TELEGRAM_API_HASH
TELEGRAM_LOCAL=1
EOF
}

install_bot_systemd() {
  local unit_name="smart-home-media-assistant-telegram-bot.service"
  local tmp_unit
  tmp_unit=$(mktemp)

  cp "$INSTALL_DIR/bot.service.tmpl" "$tmp_unit"
  sed -i -e "s|{{INSTALL_DIR}}|$INSTALL_DIR|g" "$tmp_unit"

  sudo install -m 0644 "$tmp_unit" "/etc/systemd/system/$unit_name"
  rm -f "$tmp_unit"

  sudo systemctl daemon-reload
  sudo systemctl enable --now "$unit_name"
}

print_summary() {
  echo ""
  echo "Done. Quick checks:"
  echo "- systemctl is-active docker"
  echo "- systemctl is-active qbittorrent-nox.service"
  echo "- systemctl is-active smart-home-media-assistant-telegram-bot.service"
  echo "- qBittorrent WebUI: http://$(hostname -I | awk '{print $1}'):8080"
  echo ""
}

main() {
  if [[ "$(uname)" != "Linux" ]]; then
    echo "This installer currently supports Linux hosts with systemd." >&2
    exit 1
  fi

  require_cmd bash
  require_cmd curl
  need_sudo

  # Make updates idempotent: if env files exist, reuse values and only prompt for missing.
  load_existing_install_env

  # Only minimal interactive: secrets/passwords.
  prompt_secret BOT_TOKEN "BOT_TOKEN: "
  prompt_secret RUTRACKER_USERNAME "RUTRACKER_USERNAME: "
  prompt_secret RUTRACKER_PASSWORD "RUTRACKER_PASSWORD: "
  prompt_secret TELEGRAM_API_ID "TELEGRAM_API_ID: "
  prompt_secret TELEGRAM_API_HASH "TELEGRAM_API_HASH: "
  prompt_value QBT_WEB_UI_USERNAME "QBT_WEB_UI_USERNAME (e.g. strayiker): " "admin"
  prompt_secret QBT_WEB_UI_PASSWORD "QBT_WEB_UI_PASSWORD: "

  echo "Preparing system packages..."
  ensure_root_deps_debian

  ensure_docker
  ensure_user_in_docker_group

  install_qbittorrent_nox
  install_qbittorrent_service

  echo "Waiting for qBittorrent WebUI..."
  wait_http "${QBT_WEB_UI_ADDRESS:-$QBT_WEB_UI_ADDRESS_DEFAULT}" 60 || true

  configure_qbittorrent_webui_credentials

  echo "Installing bot files into: $INSTALL_DIR"
  download_templates
  generate_scripts
  write_env_files

  echo "Starting bot via systemd..."
  install_bot_systemd

  print_summary
}

main "$@"
