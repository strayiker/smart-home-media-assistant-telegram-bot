<h1 align="center">Media Assistant Bot</h1>

<p align="center">
<img alt="example" src="./static/logo.webp" width="768" />
</p>

## About

This is the sources of a Telegram bot is designed to help you search for torrents and remotely download them to your PC using the qBittorrent client. Once the torrent is downloaded, you can ask the bot to send you any file from the torrent and download it from any other device.

## Disclaimer

This bot is created for a personal usage, so it might have some bugs or not work perfectly. However, I hope you find it useful. If you have any improvements or want to add support for other torrent trackers, feel free to submit a pull request.

If you find this bot helpful, a star would be greatly appreciated!

---

## Before You Get Started

1. **Create a New Bot on Telegram:**

   - Open the Telegram and search for the "BotFather" bot.
   - Start a chat with BotFather and send the command `/newbot`.
   - Follow the prompts to name your bot and create a unique username for it.
   - Once done, BotFather will provide you with a `token`. Keep this token safe as you'll need it later.

2. **Obtain `API_ID` and `API_HASH`**

   - Obtain `API_ID` and `API_HASH` as described in https://core.telegram.org/api/obtaining_api_id. It will be used to run a local API server to allow the bot to send large files.

3. **Register on Rutracker:**

   - Go to the Rutracker website and create an account if you don't already have one.
   - Note down your Rutracker `username` and `password`. These credentials will be used by the bot to login and perform searches.

## Installation

Open your terminal and run the following command:

```bash
tmpfile=$(mktemp) && curl -sSL https://raw.githubusercontent.com/strayiker/smart-home-media-assistant-telegram-bot/refs/heads/main/scripts/setup.sh -o $tmpfile && chmod +x $tmpfile && bash -i $tmpfile && rm $tmpfile
```

**This script will perform the following tasks:**

1.  Check for a container tools, if none is found install `Podman` (fast and light open source container tool).
2.  Install `qBittorrent` if it's not already installed.
3.  Configure qBittorrent `WebUI`.
4.  Configure bot and bot API server.
5.  Create scripts to **start**, **stop**, and **update** the bot.
6.  Run the `qBittorrent`, local bot API server and bot itself.

It will ask you for the necessary information to configure all the necessary software.

## Updating

Run the following command in the folder where your bot is installed:

```bash
./update.sh
```
