#!/bin/bash

# Check if the script is running in a non-interactive shell
if [[ $- != *i* ]]; then
    bash -i "$0" "$@"
    exit
fi

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

QBT_WEB_UI_DEFAULT_USERNAME=admin
QBT_WEB_UI_DEFAULT_PASSWORD=adminadmin
QBT_WEB_UI_DEFAULT_PASSWORD_PBKDF2="\"@ByteArray(RJtnunecy+/FjxRHFhqo3w==:TYkjECu4PhU/47hJyZkx6AajoyDbAgiw40f8tE3ygkMpuM0coG+KcRnt/6oE4ZepzpzYnd4ltWNB5ytnVqUBHA==)\""
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

    print_green "Podman installed successfully."
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
        apt-add-repository ppa:qbittorrent-team/qbittorrent-unstable
        apt-get -y -qq update
        apt-get -y -qq install qbittorrent-nox
    elif $MACOS; then
        brew install --cask -q qbittorrent
    elif $WINDOWS; then
        winget install -e --id qBittorrent.qBittorrent
    fi

    print_green "qBittorrent installed successfully."
    echo ""
}

install_winget() {
    if ! $WINDOWS || command -v winget &> /dev/null; then
        return
    fi

    echo "Installing WinGet..."

    curl -L -o Microsoft.VCLibs.x64.14.00.Desktop.appx https://aka.ms/Microsoft.VCLibs.x64.14.00.Desktop.appx
    curl -L -o Microsoft.UI.Xaml.2.8.x64.appx https://github.com/microsoft/microsoft-ui-xaml/releases/download/v2.8.6/Microsoft.UI.Xaml.2.8.x64.appx
    curl -L -o Microsoft.WinGet.msixbundle https://aka.ms/getwinget
    Add-AppxPackage Microsoft.VCLibs.x64.14.00.Desktop.appx
    Add-AppxPackage Microsoft.UI.Xaml.2.8.x64.appx
    Add-AppxPackage Microsoft.WinGet.msixbundle

    print_green "WinGet installed successfully."
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

    if $LINUX || $MACOS; then
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

    # Check if WebUI is already enabled
    if grep -q "^WebUI\\\\Enabled=true" $CONFIG_FILE; then
        echo "qBittorrent WebUI is already enabled."
        echo ""
        print_blue "Answer the questions to access the qBittorrent WebUI."
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
        print_yellow "Skipping qBittorrent configuration."
        return
    fi

    echo "Configuring qBittorrent..."

    # Ensure [Preferences] section exists
    if ! grep -q "^\[Preferences\]" $CONFIG_FILE; then
        echo "" >> $CONFIG_FILE
        echo "[Preferences]" >> $CONFIG_FILE
    fi

    set_setting() {
        if grep -q "$1=" $CONFIG_FILE; then
            sed -i '' "s|$1=.*|$1=$2|" $CONFIG_FILE
        else
            sed -i '' "/^\[Preferences\]/a\\
$1=$2\\
" $CONFIG_FILE
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

    print_green "qBittorrent configured successfully."
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

# Collect user inputs for environment variables
if [ "$QBT_WEB_UI_USERNAME" == "" ]; then
    read -p "Enter qBittorrent WebUI username (default: $QBT_WEB_UI_DEFAULT_USERNAME): " QBT_WEB_UI_USERNAME
elif ! $QBT_CONFIGURED; then
    echo "Enter qBittorrent WebUI username (auto populated): $QBT_WEB_UI_USERNAME"
fi
if [ "$QBT_WEB_UI_PASSWORD" == "" ]; then
    read -sp "Enter qBittorrent WebUI password (default: $QBT_WEB_UI_DEFAULT_PASSWORD): " QBT_WEB_UI_PASSWORD
    echo ""
elif ! $QBT_CONFIGURED; then
    echo "Enter qBittorrent WebUI password (auto populated): $QBT_WEB_UI_PASSWORD"
fi
if [ "$QBT_WEB_UI_PORT" == "" ]; then
    read -p "Enter qBittorrent WebUI port (default: $QBT_WEB_UI_DEFAULT_PORT): " QBT_WEB_UI_PORT
elif ! $QBT_CONFIGURED; then
    echo "Enter qBittorrent WebUI port (auto populated): $QBT_WEB_UI_PORT"
fi

QBT_WEB_UI_USERNAME=${QBT_WEB_UI_USERNAME:-$QBT_WEB_UI_DEFAULT_USERNAME}
QBT_WEB_UI_PASSWORD=${QBT_WEB_UI_PASSWORD:-$QBT_WEB_UI_DEFAULT_PASSWORD}
QBT_WEB_UI_PORT=${QBITTORRENT_PORT:-$QBT_WEB_UI_DEFAULT_PORT}

read -p "Enter your Telegram Bot token: " BOT_TOKEN
read -p "Enter your Rutracker username: " RUTRACKER_USERNAME
read -sp "Enter your Rutracker password: " RUTRACKER_PASSWORD
echo ""

mkdir -p ./smart-home-media-assistant-telegram-bot/data
cd ./smart-home-media-assistant-telegram-bot

# Create .env file with user inputs
cat <<EOF > .env
BOT_TOKEN=$BOT_TOKEN
RUTRACKER_USERNAME=$RUTRACKER_USERNAME
RUTRACKER_PASSWORD=$RUTRACKER_PASSWORD
QBT_WEB_UI_USERNAME=$QBT_WEB_UI_USERNAME
QBT_WEB_UI_PASSWORD=$QBT_WEB_UI_PASSWORD
QBT_WEB_UI_HOST=host.docker.internal
QBT_WEB_UI_PORT=$QBT_WEB_UI_PORT
# Uncomment to customize the path where downloaded files will be saved
# QBT_SAVE_PATH=<downloads-save-path>
EOF

print_green "Environment variables set up!"
echo ""

echo "Downloading scripts..."
curl -s "$REPO_RAW_URL/scripts/start.tmpl" -o start.sh
curl -s "$REPO_RAW_URL/scripts/stop.tmpl" -o stop.sh
curl -s "$REPO_RAW_URL/scripts/update.tmpl" -o update.sh
print_green "Downloading complete!"
echo ""

if $LINUX || $MACOS; then
    chmod +x start.sh
    chmod +x stop.sh
    chmod +x update.sh
fi

sed -i '' -e "s/{{VERSION}}/$VERSION/g" -e "s/{{CONTAINER_TOOL}}/$CONTAINER_TOOL/g" start.sh
sed -i '' -e "s/{{CONTAINER_TOOL}}/$CONTAINER_TOOL/g" stop.sh

SETUP_COMPLETE=$( [ ${#SKIPPED_INSTALLATIONS[@]} -eq 0 ] && echo true || echo false )
BOT_RUNNING=false

if $SETUP_COMPLETE; then
    print_green "Setup complete!"
    echo ""

    read -p "Do you want to start the bot now? (y/n): " CHOICE
    if [[ "$CHOICE" == [Yy]* ]]; then
        run_qbittorrent &
        ./start.sh &

        BOT_RUNNING=true
        echo "Bot is running!"
    fi
    echo ""
fi

if ! $SETUP_COMPLETE || ! $BOT_RUNNING; then
    echo "To finish, follow these steps:"
    echo ""

    N=1

    if [ ${#SKIPPED_INSTALLATIONS[@]} -gt 0 ]; then
        print_blue "$N. Install the following software:"
        for SOFTWARE in "${SKIPPED_INSTALLATIONS[@]}"; do
            echo " - $SOFTWARE"
        done
        N=$((N+1))
    fi

    if $QBT_CONFIGURED; then
        print_blue "${N}. Launch qBittorrent."
    else
        print_blue "${N}. Launch qBittorrent and make sure it is configured correctly:"
        echo " - Go to the Options menu and select the Web UI tab"
        if ! $QBT_WEB_UI_ENABLED; then
            echo " - Enable Web User Interface (Remote control)"
        fi
        echo " - Ensure the username, password and port match your answers above"
    fi

    print_blue "${N+1}. Start the bot:"
    echo -e " - Execute the \033[1;32mstart.sh\033[0m script"
    print_blue "${N+2}. Chat with your bot!"

    if ! $SETUP_COMPLETE; then
        echo ""
        print_green "Setup complete!"
    fi
fi

echo ""
print_blue "Bot management instructions:"
echo -e " - To start the bot, execute the \033[1;32mstart.sh\033[0m script"
echo -e " - To stop the bot, execute the \033[1;32mstop.sh\033[0m script"
echo -e " - To update the bot, execute the \033[1;32mupdate.sh\033[0m script"
