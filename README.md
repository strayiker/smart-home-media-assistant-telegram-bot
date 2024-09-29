# Smart Home Media Assistant Telegram Bot

Hey there! This is the sources of a Telegram bot is designed to help you search for torrents and remotely download them to your PC using the qBittorrent client. It's written in TypeScript and runs in a Docker container on your PC.

## Prerequisites

Before we get started, make sure you have the following:

- Docker installed on your PC
- qBittorrent client installed and configured on your PC
- Telegram account

## Step-by-Step

1. **Create a New Bot on Telegram:**

   - Open the Telegram and search for the "BotFather" bot.
   - Start a chat with BotFather and send the command `/newbot`.
   - Follow the prompts to name your bot and create a unique username for it.
   - Once done, BotFather will provide you with a `BOT_TOKEN`. Keep this token safe as you'll need it later.

2. **Register on Rutracker:**

   - Go to the Rutracker website and create an account if you don't already have one.
   - Note down your Rutracker username and password. These credentials will be used by the bot to log in and perform searches.

3. **Configure qBittorrent Web-UI:**

   - Open the qBittorrent client on your PC.
   - Go to `Options` > `Web UI`.
   - Enable the Web UI and set a username (default is `admin`) and a password.
   - Set the port to `9092` (or any other port you prefer).
   - Make sure the Web UI is accessible from your local network.

4. **Clone the Repository:**

   - Open your terminal and run the following commands:
     ```bash
     git clone https://github.com/strayiker/smart-home-media-assistant-telegram-bot.git
     cd smart-home-media-assistant-telegram-bot
     ```

5. **Set Up Environment Variables:**

   - In the cloned repository, you'll find a file named `.env.template`.
   - Rename this file to `.env` and open it in a text editor.
   - Replace the placeholders with your actual values:
     ```plaintext
     BOT_TOKEN=<your-bot-token>
     RUTRACKER_USERNAME=<username-in-rutracker>
     RUTRACKER_PASSWORD=<password-in-rutracker>
     QBT_WEBUI_HOST=host.docker.internal
     QBT_WEBUI_PORT=9092
     QBT_WEBUI_USERNAME=admin
     QBT_WEBUI_PASSWORD=<qbittorrent-client-web-ui-password>
     QBT_SAVE_PATH=/path/to/downloads
     ```

6. **Build the Docker Container:**

   - Run the following command to build the Docker container:
     ```bash
     make build
     ```

7. **Start the Docker Container:**

   - To start the bot, run:
     ```bash
     make run
     ```

8. **Interact with the Bot:**

   - Open Telegram and start a chat with your bot.
   - Send a message to the bot to search for torrents. For example, you can type "Wall-E 1080p".
   - The bot will respond with search results, each containing a link to download the torrent.
   - Click on the link, and the bot will add the torrent to the qBittorrent client running on your PC.
   - The bot will provide you with the download stats and periodically update them.

9. **Stop and Clean Up:**
   - When you're done, you can stop the Docker container by running:
     ```bash
     make stop
     ```
   - To clean up Docker resources, run:
     ```bash
     make clean
     ```
