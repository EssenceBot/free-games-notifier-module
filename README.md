# Free Games Notifier Module

A Discord bot module that monitors and notifies about free games and DLC from various platforms.

## Project Structure

```
free-games-notifier-module/
├── commands/                    # Slash command handlers
│   ├── game-notify.ts          # /game-notify command
│   ├── game-notify-list.ts     # /game-notify-list command
│   └── game-notify-remove.ts   # /game-notify-remove command
├── lib/                         # Utility libraries
│   ├── api.ts                  # GamerPower API client
│   ├── embed.ts                # Discord embed builder
│   └── matchers.ts             # Platform and type matching logic
├── workers/                     # Bun workers for async processing
│   └── game-checker.ts         # Worker for checking new games
├── index.ts                     # Main module entry point
├── schema.ts                    # Database schema definitions
├── types.ts                     # TypeScript type definitions
├── manifest.toml               # Module manifest
└── package.json                # Package configuration
```

## Features

- **Multiple Platform Support**: Steam and Epic Games Store
- **Flexible Notifications**: Separate configurations for games and DLC
- **Automatic Checking**: Checks for new free games every minute
- **Smart Deduplication**: Tracks notified games to prevent spam
- **Auto Cleanup**: Removes expired games from the database
- **Guild-Specific**: Each server can have multiple notifier configurations

## Commands

### `/game-notify`
Configure a new free game notifier for your server.

**Parameters:**
- `platform` (required): Platform to monitor (Steam, Epic Games Store)
- `type` (required): Type of content (Game, DLC)
- `channel` (required): Text channel to send notifications to
- `role` (required): Role to ping when a new free game is available

**Example:**
```
/game-notify platform:Steam type:Game channel:#free-games role:@FreeGames
```

### `/game-notify-list`
List all configured game notifiers for the current server.

Shows:
- Notifier ID
- Platform
- Type
- Channel
- Role

### `/game-notify-remove`
Remove a game notifier configuration.

**Parameters:**
- `id` (required): ID of the notifier to remove (get this from `/game-notify-list`)

**Example:**
```
/game-notify-remove id:3
```

## How It Works

1. **Configuration**: Server admins configure notifiers using `/game-notify`
2. **Monitoring**: The module checks the GamerPower API every minute using a Bun worker
3. **Worker Processing**: The worker fetches games, filters new ones, and matches them with notifiers
4. **Notification**: Sends an embed message to the configured channel and pings the specified role
5. **Tracking**: Stores notified games in the database to prevent duplicate notifications
6. **Cleanup**: Automatically removes games that are no longer free from the tracking database

## Architecture

### Worker Pattern
The module uses Bun workers for asynchronous game checking:
- **Main Thread**: Handles Discord commands and sends notifications
- **Worker Thread**: Fetches API data and processes game matching
- **Benefits**: Non-blocking API calls, isolated error handling, better performance

### Modular Design
- **Commands**: Each slash command is in its own file for maintainability
- **Library Functions**: Reusable logic separated into focused modules
- **Type Safety**: Shared types ensure consistency across the module

## Database Schema

### `game_notifiers`
Stores notifier configurations for each guild.

- `id`: Primary key
- `guildId`: Discord guild/server ID
- `platform`: Platform to monitor (steam, epic-games-store)
- `type`: Content type (game, dlc)
- `channelId`: Discord channel ID for notifications
- `roleId`: Discord role ID to ping
- `createdAt`: Timestamp

### `notified_games`
Tracks games that have already been notified to prevent duplicates.

- `id`: Primary key
- `gameId`: Unique ID from GamerPower API
- `title`: Game title
- `platforms`: Comma-separated platform list
- `endDate`: When the giveaway ends
- `createdAt`: Timestamp

## Notification Format

Each notification includes an embed with:
- **Title**: Game/DLC title (clickable link)
- **Description**: Game description
- **Image**: Cover image
- **Platform**: Available platforms
- **Type**: Game or DLC
- **Ends**: Giveaway end date (if available)
- **Role Mention**: Configured role is pinged

## API

This module uses the [GamerPower API](https://www.gamerpower.com/api-read) to fetch free games information.

## Requirements

- Database must be enabled
- Bot needs permissions to:
  - Send messages in configured channels
  - Embed links
  - Mention roles
  - Read message history

## Example Use Cases

1. **Single Channel Setup**: One channel for all free games from all platforms
   ```
   /game-notify platform:Steam type:Game channel:#free-stuff role:@Everyone
   /game-notify platform:Epic type:Game channel:#free-stuff role:@Everyone
   ```

2. **Platform-Specific Channels**: Separate channels for each platform
   ```
   /game-notify platform:Steam type:Game channel:#steam-free role:@SteamLovers
   /game-notify platform:Epic type:Game channel:#epic-free role:@EpicFans
   ```

3. **Type-Specific Notifications**: Separate DLC from full games
   ```
   /game-notify platform:Steam type:Game channel:#free-games role:@Games
   /game-notify platform:Steam type:DLC channel:#free-dlc role:@DLC
   ```

## Notes

- The checker runs every 60 seconds (1 minute)
- Games are considered "no longer free" when they disappear from the API
- Each guild can have unlimited notifier configurations
- Platform matching is case-insensitive
