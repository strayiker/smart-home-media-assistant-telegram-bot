#!/bin/bash

print_blue() {
    echo -e "\033[1;34m$1\033[0m"
}

print_green() {
    echo -e "\033[1;32m$1\033[0m"
}

print_yellow() {
    echo -e "\033[1;33m$1\033[0m"
}

print_red() {
    echo -e "\033[1;31m$1\033[0m"
}

OS=$(uname)
LINUX=$( [ "$OS" == "Linux" ] && echo true || echo false )
MACOS=$( [ "$OS" == "Darwin" ] && echo true || echo false )
WINDOWS=$( [[ "$OS" =~ ^(CYGWIN|MINGW|MSYS) ]] && echo true || echo false )

if ! $LINUX && ! $MACOS && ! $WINDOWS; then
    print_red "Unknown operating system."
    exit 1
fi

REPO_RAW_URL="https://raw.githubusercontent.com/strayiker/smart-home-media-assistant-telegram-bot/refs/heads/main"
VERSION=$(curl -s "$REPO_RAW_URL/package.json" | grep '"version"' | sed -E 's/.*"version": "(.*)".*/\1/')

SKIPPED_INSTALLATIONS=()

CONTAINER_TOOL=podman

BOT_API_DEFAULT_ADDRESS=http://localhost:8081
QBT_WEB_UI_DEFAULT_USERNAME=admin
QBT_WEB_UI_DEFAULT_PASSWORD=adminadmin
QBT_WEB_UI_DEFAULT_PASSWORD_PBKDF2="\"@ByteArray(RJtnunecy+/FjxRHFhqo3w==:TYkjECu4PhU/47hJyZkx6AajoyDbAgiw40f8tE3ygkMpuM0coG+KcRnt/6oE4ZepzpzYnd4ltWNB5ytnVqUBHA==)\""
if $WINDOWS; then
    QBT_WEB_UI_DEFAULT_HOST=$(ipconfig | grep -A 5 "vEthernet (WSL)" | grep "IPv4 Address" | awk -F: '{gsub(/\s/, "", $2); print $2}')
fi
QBT_WEB_UI_DEFAULT_HOST=${QBT_WEB_UI_DEFAULT_HOST:-"host.docker.internal"}
QBT_WEB_UI_DEFAULT_PORT=8080

QBT_WEB_UI_ENABLED=false
QBT_CONFIGURED=false
QBT_RUNNING=false

install_container_engine() {
    if command -v docker &> /dev/null; then
        CONTAINER_TOOL=docker
        return
    fi

    if command -v podman &> /dev/null; then
        CONTAINER_TOOL=podman
        return
    fi

    read -p "Do you want to install Podman? (y/n): " CHOICE

    if [[ "$CHOICE" != [Yy]* ]]; then
        SKIPPED_INSTALLATIONS+=("Container Tool (e.g. Docker or Podman)")
        print_yellow "Skipping Podman installation."
        echo ""
        return
    fi

    echo "Installing Podman..."

    if $LINUX; then
        export DEBIAN_FRONTEND=noninteractive
        export TZ=Etc/UTC
        apt-get -y -qq update
        apt-get -y -qq install podman
    elif $MACOS; then
        brew install -q podman
        podman machine init
        podman machine start
    elif $WINDOWS; then
        wsl --install --no-distribution
        winget install -e --id RedHat.Podman
        podman machine init
        podman machine start
    fi

    CONTAINER_TOOL=podman

    print_green "Podman installed successfully!"
    echo ""
}

install_qbittorrent() {
    if $LINUX; then
        if command -v qbittorrent-nox &> /dev/null; then
            return
        fi
    elif $MACOS; then
        if [ -d "/Applications/qbittorrent.app" ]; then
            return
        fi
    elif $WINDOWS; then
        if [ -d "C:/Program Files/qBittorrent" ] || [ -d "C:/Program Files (x86)/qBittorrent" ]; then
            return
        fi
    fi

    read -p "Do you want to install qBittorrent? (y/n): " CHOICE

    if [[ "$CHOICE" != [Yy]* ]]; then
        SKIPPED_INSTALLATIONS+=("qBittorrent")
        print_yellow "Skipping qBittorrent installation."
        echo ""
        return
    fi

    echo "Installing the qBittorrent..."

    if $LINUX; then
        export DEBIAN_FRONTEND=noninteractive
        export TZ=Etc/UTC
        apt-get update -y -qq
        apt-get install -y -qq software-properties-common
        apt-add-repository ppa:qbittorrent-team/qbittorrent-unstable
        apt-get update -y -qq
        apt-get install -y -qq qbittorrent-nox
    elif $MACOS; then
        brew install --cask -q qbittorrent
    elif $WINDOWS; then
        winget install -e --id qBittorrent.qBittorrent
    fi

    print_green "qBittorrent installed successfully!"
    echo ""
}

install_winget() {
    if ! $WINDOWS || command -v winget &> /dev/null; then
        return
    fi

    echo "Installing WinGet..."

    curl -sL -o Microsoft.VCLibs.x64.14.00.Desktop.appx https://aka.ms/Microsoft.VCLibs.x64.14.00.Desktop.appx
    curl -sL -o Microsoft.UI.Xaml.2.8.x64.appx https://github.com/microsoft/microsoft-ui-xaml/releases/download/v2.8.6/Microsoft.UI.Xaml.2.8.x64.appx
    curl -sL -o Microsoft.WinGet.msixbundle https://aka.ms/getwinget
    Add-AppxPackage Microsoft.VCLibs.x64.14.00.Desktop.appx
    Add-AppxPackage Microsoft.UI.Xaml.2.8.x64.appx
    Add-AppxPackage Microsoft.WinGet.msixbundle

    print_green "WinGet installed successfully!"
    echo ""
}

stop_qbittorrent() {
    if $LINUX; then
        if pgrep -x "qbittorrent-nox" > /dev/null; then
            QBT_RUNNING=true
        fi
    elif $MACOS; then
        if pgrep -x "qbittorrent" > /dev/null; then
            QBT_RUNNING=true
        fi
    elif $WINDOWS; then
        if powershell.exe -Command "Get-Process -Name 'qbittorrent' -ErrorAction SilentlyContinue" > /dev/null; then
            QBT_RUNNING=true
        fi
    fi

    if ! $QBT_RUNNING; then
        return
    fi

    print_blue "qBittorrent should be stopped before continue."
    read -p "Do you want to stop qBittorrent? (y/n): " CHOICE

    if [[ "$CHOICE" != [Yy]* ]]; then
        return
    fi

    if $LINUX; then
        pkill -15 -x "qbittorrent-nox"
    elif $MACOS; then
        pkill -15 -x "qbittorrent"
    elif $WINDOWS; then
        powershell.exe -Command "Stop-Process -Name 'qbittorrent' -Force"
    fi

    QBT_RUNNING=false

    echo "qBittorrent has been stopped."
}

configure_qbittorrent() {
    if [[ " ${SKIPPED_INSTALLATIONS[@]} " =~ " qBittorrent " ]]; then
        return
    fi

    if $LINUX; then
        CONFIG_FILE="$HOME/.config/qBittorrent/qBittorrent.conf"
    elif $MACOS; then
        CONFIG_FILE="$HOME/.config/qBittorrent/qBittorrent.ini"
    elif $WINDOWS; then
        CONFIG_FILE="$APPDATA/qBittorrent/qBittorrent.ini"
    fi

    # Backup existing or create a new config file
    if [ -f $CONFIG_FILE ]; then
        cp $CONFIG_FILE $CONFIG_FILE.bak
    else
        mkdir -p $(dirname $CONFIG_FILE)
        touch $CONFIG_FILE
    fi

    echo "Configuring qBittorrent..."

    # Check if WebUI is already enabled
    if grep -q "^WebUI\\\\Enabled=true" $CONFIG_FILE; then
        print_blue "qBittorrent WebUI is already configured, reading config..."
        echo ""
        QBT_WEB_UI_ENABLED=true
        QBT_WEB_UI_USERNAME=$(grep 'WebUI\\Username' $CONFIG_FILE | cut -d'=' -f2-)
        QBT_WEB_UI_PASSWORD_PBKDF2=$(grep 'WebUI\\Password_PBKDF2' $CONFIG_FILE | cut -d'=' -f2-)
        QBT_WEB_UI_PORT=$(grep 'WebUI\\Port' $CONFIG_FILE | cut -d'=' -f2-)

        if [ "$QBT_WEB_UI_PASSWORD_PBKDF2" == "$QBT_WEB_UI_DEFAULT_PASSWORD_PBKDF2" ]; then
            QBT_WEB_UI_PASSWORD=$QBT_WEB_UI_DEFAULT_PASSWORD
        fi

        return
    fi

    stop_qbittorrent

    if $QBT_RUNNING; then
        print_yellow "Skip qBittorrent configuration."
        return
    fi

    # Ensure [Preferences] section exists
    if ! grep -q "^\[Preferences\]" $CONFIG_FILE; then
        echo "" >> $CONFIG_FILE
        echo "[Preferences]" >> $CONFIG_FILE
    fi

    set_setting() {
        if grep -q "$1=" $CONFIG_FILE; then
            if $MACOS; then
                sed -i '' "s|$1=.*|$1=$2|" $CONFIG_FILE
            else
                sed -i "s|$1=.*|$1=$2|" $CONFIG_FILE
            fi
        elif $MACOS; then
            sed -i '' "/^\[Preferences\]/a\\
$1=$2" $CONFIG_FILE
        else
            sed -i "/^\[Preferences\]/a\\
$1=$2" $CONFIG_FILE
        fi
    }

    # Set WebUI settings
    set_setting "WebUI\\\\Port" $QBT_WEB_UI_DEFAULT_PORT
    set_setting "WebUI\\\\Password_PBKDF2" $QBT_WEB_UI_DEFAULT_PASSWORD_PBKDF2
    set_setting "WebUI\\\\Username" $QBT_WEB_UI_DEFAULT_USERNAME
    set_setting "WebUI\\\\Enabled" true

    QBT_WEB_UI_USERNAME=$QBT_WEB_UI_DEFAULT_USERNAME
    QBT_WEB_UI_PASSWORD=$QBT_WEB_UI_DEFAULT_PASSWORD
    QBT_WEB_UI_PORT=$QBT_WEB_UI_DEFAULT_PORT
    QBT_WEB_UI_ENABLED=true
    QBT_CONFIGURED=true

    print_green "qBittorrent configured successfully!"
    echo ""
}

run_qbittorrent() {
    if $LINUX; then
        if pgrep -x "qbittorrent-nox" > /dev/null; then
            return
        fi
    elif $MACOS; then
        if pgrep -x "qbittorrent" > /dev/null; then
            return
        fi
    elif $WINDOWS; then
        if powershell.exe -Command "Get-Process -Name 'qbittorrent' -ErrorAction SilentlyContinue" > /dev/null; then
            return
        fi
    fi

    if $LINUX; then
        qbittorrent-nox
    elif $MACOS; then
        if [ -d "/Applications/qBittorrent.app" ]; then
            open /Applications/qBittorrent.app
        else
            print_red "qBittorrent is not installed!"
        fi
    elif $WINDOWS; then
        if [ -f "C:\\Program Files\\qBittorrent\\qbittorrent.exe" ]; then
            powershell.exe -Command "Start-Process 'C:\\Program Files\\qBittorrent\\qbittorrent.exe'"
        elif [ -f "C:\\Program Files (x86)\\qBittorrent\\qbittorrent.exe" ]; then
            powershell.exe -Command "Start-Process 'C:\\Program Files (x86)\\qBittorrent\\qbittorrent.exe'"
        else
            print_red "qBittorrent is not installed!"
        fi
    fi
}

install_winget # Windows only

install_container_engine

install_qbittorrent

configure_qbittorrent

CURRENT_DIR_NAME=${PWD##*/}

if [ "$CURRENT_DIR_NAME" != "smart-home-media-assistant-telegram-bot" ]; then
    mkdir -p ./smart-home-media-assistant-telegram-bot/data
    cd ./smart-home-media-assistant-telegram-bot
fi

echo "Setup environment variables..."

if [ -f ".env" ]; then
    SECRET_KEY=$(grep 'SECRET_KEY' ".env" | cut -d'=' -f2-)
    BOT_TOKEN=$(grep 'BOT_TOKEN' ".env" | cut -d'=' -f2-)
    BOT_API_ADDRESS=$(grep 'BOT_API_ADDRESS' ".env" | cut -d'=' -f2-)
    RUTRACKER_USERNAME=$(grep 'RUTRACKER_USERNAME' ".env" | cut -d'=' -f2-)
    RUTRACKER_PASSWORD=$(grep 'RUTRACKER_PASSWORD' ".env" | cut -d'=' -f2-)

    if [ "$QBT_WEB_UI_USERNAME" == "" ]; then
        QBT_WEB_UI_USERNAME=$(grep 'QBT_WEB_UI_USERNAME' ".env" | cut -d'=' -f2-)
    fi

    if [ "$QBT_WEB_UI_PASSWORD" == "" ]; then
        QBT_WEB_UI_PASSWORD=$(grep 'QBT_WEB_UI_PASSWORD' ".env" | cut -d'=' -f2-)
    fi

    if [ "$QBT_WEB_UI_PORT" == "" ]; then
        QBT_WEB_UI_PORT=$(grep 'QBT_WEB_UI_PORT' ".env" | cut -d'=' -f2-)
    fi

    QBT_WEB_UI_HOST=$(grep 'QBT_WEB_UI_HOST' ".env" | cut -d'=' -f2-)
    QBT_WEB_UI_ADDRESS=$(grep 'QBT_WEB_UI_ADDRESS' ".env" | cut -d'=' -f2-)
    QBT_SAVE_PATH=$(grep 'QBT_SAVE_PATH' ".env" | cut -d'=' -f2-)
fi

if [ -f ".env.api" ]; then
    TELEGRAM_API_ID=$(grep 'TELEGRAM_API_ID' ".env.api" | cut -d'=' -f2-)
    TELEGRAM_API_HASH=$(grep 'TELEGRAM_API_HASH' ".env.api" | cut -d'=' -f2-)
fi

if [ "$QBT_WEB_UI_USERNAME" == "" ]; then
    read -p "Enter qBittorrent WebUI username (default: $QBT_WEB_UI_DEFAULT_USERNAME): " QBT_WEB_UI_USERNAME
fi

if [ "$QBT_WEB_UI_PASSWORD" == "" ]; then
    read -sp "Enter qBittorrent WebUI password (default: $QBT_WEB_UI_DEFAULT_PASSWORD): " QBT_WEB_UI_PASSWORD
    echo ""
fi

if [ "$QBT_WEB_UI_PORT" == "" ]; then
    read -p "Enter qBittorrent WebUI port (default: $QBT_WEB_UI_DEFAULT_PORT): " QBT_WEB_UI_PORT
fi

if [ "$BOT_TOKEN" == "" ]; then
    read -p "Enter your Telegram Bot token: " BOT_TOKEN
fi

if [ "$TELEGRAM_API_ID" == "" ]; then
    read -p "Enter your Telegram Api Id: " TELEGRAM_API_ID
fi

if [ "$TELEGRAM_API_HASH" == "" ]; then
    read -p "Enter your Telegram Api Hash: " TELEGRAM_API_HASH
fi

if [ "$RUTRACKER_USERNAME" == "" ]; then
    read -p "Enter your Rutracker username: " RUTRACKER_USERNAME
fi

if [ "$RUTRACKER_PASSWORD" == "" ]; then
    read -sp "Enter your Rutracker password: " RUTRACKER_PASSWORD
    echo ""
fi

if [ "$QBT_SAVE_PATH" == "" ]; then
    read -p "Enter the folder where torrents will be saved: " QBT_SAVE_PATH
fi

SECRET_KEY=${SECRET_KEY:-$(openssl rand -hex 32)}
BOT_API_ADDRESS=${BOT_API_ADDRESS:-$BOT_API_DEFAULT_ADDRESS}
QBT_WEB_UI_USERNAME=${QBT_WEB_UI_USERNAME:-$QBT_WEB_UI_DEFAULT_USERNAME}
QBT_WEB_UI_PASSWORD=${QBT_WEB_UI_PASSWORD:-$QBT_WEB_UI_DEFAULT_PASSWORD}
QBT_WEB_UI_HOST=${QBT_WEB_UI_HOST:-$QBT_WEB_UI_DEFAULT_HOST}
QBT_WEB_UI_PORT=${QBT_WEB_UI_PORT:-$QBT_WEB_UI_DEFAULT_PORT}
QBT_WEB_UI_ADDRESS=${QBT_WEB_UI_ADDRESS:-"http://$QBT_WEB_UI_HOST:$QBT_WEB_UI_PORT"}

# Create .env file
cat <<EOF > .env
SECRET_KEY=$SECRET_KEY
BOT_TOKEN=$BOT_TOKEN
BOT_API_ADDRESS=$BOT_API_ADDRESS
RUTRACKER_USERNAME=$RUTRACKER_USERNAME
RUTRACKER_PASSWORD=$RUTRACKER_PASSWORD
QBT_WEB_UI_USERNAME=$QBT_WEB_UI_USERNAME
QBT_WEB_UI_PASSWORD=$QBT_WEB_UI_PASSWORD
QBT_WEB_UI_ADDRESS=$QBT_WEB_UI_ADDRESS
QBT_SAVE_PATH=$QBT_SAVE_PATH
EOF

# Create .env.api file
cat <<EOF > .env.api
TELEGRAM_API_ID=$TELEGRAM_API_ID
TELEGRAM_API_HASH=$TELEGRAM_API_HASH
TELEGRAM_LOCAL=1
EOF

print_green "Environment variables setup completed!"
echo ""

echo "Downloading scripts..."
curl -s "$REPO_RAW_URL/scripts/start.tmpl" -o start.sh
curl -s "$REPO_RAW_URL/scripts/stop.tmpl" -o stop.sh
curl -s "$REPO_RAW_URL/scripts/update.tmpl" -o update.sh
print_green "Downloading completed!"
echo ""

echo "Logging out of the hosted bot api server..."
curl -s https://api.telegram.org/bot$BOT_TOKEN/logOut > /dev/null
print_green "Logged out successfully!"
echo ""

if $LINUX || $MACOS; then
    chmod +x ./start.sh
    chmod +x ./stop.sh
    chmod +x ./update.sh
fi

if $MACOS; then
    sed -i '' \
        -e "s|{{VERSION}}|$VERSION|g" \
        -e "s|{{CONTAINER_TOOL}}|$CONTAINER_TOOL|g" \
        -e "s|{{SAVE_PATH}}|$QBT_SAVE_PATH|g" \
        ./start.sh
    sed -i '' \
        -e "s|{{CONTAINER_TOOL}}|$CONTAINER_TOOL|g" \
        ./stop.sh
else
    sed -i \
        -e "s|{{VERSION}}|$VERSION|g" \
        -e "s|{{CONTAINER_TOOL}}|$CONTAINER_TOOL|g" \
        -e "s|{{SAVE_PATH}}|$QBT_SAVE_PATH|g" \
        ./start.sh
    sed -i \
        -e "s|{{CONTAINER_TOOL}}|$CONTAINER_TOOL|g" \
        ./stop.sh
fi

if [ ${#SKIPPED_INSTALLATIONS[@]} -gt 0 ]; then
    echo "To finish, follow these steps:"
    echo ""

    print_blue "1. Install the following software:"

    for SOFTWARE in "${SKIPPED_INSTALLATIONS[@]}"; do
        echo " - $SOFTWARE"
    done

    if $QBT_CONFIGURED; then
        print_blue "2. Launch qBittorrent."
    else
        print_blue "2. Launch qBittorrent and make sure it is configured correctly:"
        echo " - Go to the Options menu and select the Web UI tab"
        if ! $QBT_WEB_UI_ENABLED; then
            echo " - Enable Web User Interface (Remote control)"
        fi
        echo " - Ensure the username, password and port match your answers above"
    fi

    print_blue "3. Start the bot:"
    echo -e " - Execute the \033[1;32mstart.sh\033[0m script"
    print_blue "4. Chat with your bot!"
    echo ""
fi

print_blue "Bot management instructions:"
echo -e " - To start the bot, execute the \033[1;32mstart.sh\033[0m script"
echo -e " - To stop the bot, execute the \033[1;32mstop.sh\033[0m script"
echo -e " - To update the bot, execute the \033[1;32mupdate.sh\033[0m script"
echo ""

print_green "Setup completed!"
echo ""

if [ ${#SKIPPED_INSTALLATIONS[@]} -eq 0 ]; then
    read -p "Do you want to start the bot now? (y/n): " CHOICE
    if [[ "$CHOICE" == [Yy]* ]]; then
        run_qbittorrent &
        ./stop.sh
        ./start.sh

        BOT_RUNNING=true
        echo "Bot is running!"
    fi
fi
