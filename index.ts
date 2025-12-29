import {
  getDatabaseClient,
  isDatabaseAvailable,
  getClient,
} from "@essence-discord-bot/api/botExtension";
import { 
  ChannelType, 
  type TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { notInArray } from "drizzle-orm";
import * as schema from "./schema";
import type { ModuleDatabaseExports } from "@essence-discord-bot/types/types";
import log from "@essence-discord-bot/lib/log";
import { registerGameNotifyCommand } from "./commands/game-notify";
import { registerGameNotifyListCommand } from "./commands/game-notify-list";
import { registerGameNotifyRemoveCommand } from "./commands/game-notify-remove";
import { createGameEmbed } from "./lib/embed";
import { TYPE_MAP } from "./types";
import type { GameCheckerInput, GameCheckerResult } from "./workers/game-checker";

const moduleName = "Free Games Notifier";

// Export database schema for the core system to register
export const database: ModuleDatabaseExports = {
  schema: schema,
};

let checkInterval: Timer | null = null;
const workerURL = new URL("workers/game-checker.ts", import.meta.url).href;

export async function discordBotInit() {
  log(moduleName, "Initializing...");

  if (!isDatabaseAvailable()) {
    log(moduleName, "Database not available, module cannot function");
    return;
  }

  // Register slash commands
  await registerGameNotifyCommand();
  await registerGameNotifyListCommand();
  await registerGameNotifyRemoveCommand();

  // Start the interval checker
  startGameChecker();

  log(moduleName, "Successfully initialized");
}

// Main game checker function
async function checkForNewGames() {
  try {
    const db = getDatabaseClient();
    const client = getClient();

    // Get all notifiers
    const notifiers = await db.select().from(schema.gameNotifiers);
    
    // Group notifiers by guild/platform/type to check what we've already notified
    const notifierGroups = new Map<string, typeof schema.gameNotifiers.$inferSelect[]>();
    for (const notifier of notifiers) {
      const key = `${notifier.guildId}:${notifier.platform}:${notifier.type}`;
      if (!notifierGroups.has(key)) {
        notifierGroups.set(key, []);
      }
      notifierGroups.get(key)!.push(notifier);
    }

    // Get notified games for each group
    const allNotifiedGames = await db.select().from(schema.notifiedGames);

    // Create and run worker
    const worker = new Worker(workerURL);
    worker.postMessage({ 
      notifiers: Array.from(notifierGroups.values()).flat(),
      notifiedGameIds: allNotifiedGames.map((ng: typeof schema.notifiedGames.$inferSelect) => ng.gameId)
    } as GameCheckerInput);

    worker.addEventListener("message", async (event: MessageEvent<GameCheckerResult>) => {
      const result = event.data;

      if (result.status === "error") {
        log(moduleName, `Worker error: ${result.error}`, "error");
        return;
      }

      const { newGames, currentGameIds } = result;

      if (!newGames || !currentGameIds) {
        return;
      }

      if (newGames.length > 0) {
        log(moduleName, `Found ${newGames.length} new free game(s)`);

        // Send notifications for each new game
        for (const { game, matchingNotifiers } of newGames) {
          // Group matching notifiers by guild/platform/type
          const notificationGroups = new Map<string, typeof matchingNotifiers>();
          
          for (const notifier of matchingNotifiers) {
            const key = `${notifier.guildId}:${notifier.platform}:${notifier.type}`;
            
            // Check if this guild/platform/type combination has already been notified
            const alreadyNotified = allNotifiedGames.some(
              (ng: typeof schema.notifiedGames.$inferSelect) =>
                ng.guildId === notifier.guildId &&
                ng.platform === notifier.platform &&
                ng.type === notifier.type &&
                ng.gameId === String(game.id)
            );

            if (alreadyNotified) {
              continue;
            }

            if (!notificationGroups.has(key)) {
              notificationGroups.set(key, []);
            }
            notificationGroups.get(key)!.push(notifier);
          }

          // Send notifications for each group
          for (const [key, groupNotifiers] of notificationGroups) {
            const [guildId, platform, type] = key.split(':');
            
            // Use the first notifier in the group (they all have the same guild/platform/type)
            const notifier = groupNotifiers[0];
            
            try {
              const channel = await client.channels.fetch(notifier.channelId);
              if (channel && channel.type === ChannelType.GuildText) {
                const textChannel = channel as TextChannel;
                const embed = createGameEmbed(game);
                
                // Create CLAIM button
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                  new ButtonBuilder()
                    .setLabel("CLAIM")
                    .setStyle(ButtonStyle.Link)
                    .setURL(game.open_giveaway)
                );
                
                await textChannel.send({
                  content: `<@&${notifier.roleId}> New free ${TYPE_MAP[notifier.type]} available!`,
                  embeds: [embed],
                  components: [row],
                  allowedMentions: { roles: [notifier.roleId] },
                });
              }
            } catch (error) {
              log(moduleName, `Error sending notification to channel ${notifier.channelId}: ${error}`, "error");
            }

            // Mark game as notified for this guild/platform/type combination
            try {
              const insertResult = await db.insert(schema.notifiedGames).values({
                guildId,
                platform,
                type,
                gameId: String(game.id),
                title: game.title,
                platforms: game.platforms,
                endDate: game.end_date || null,
              }).onConflictDoNothing().returning();
              
              // Add to in-memory list if successfully inserted
              if (insertResult.length > 0) {
                allNotifiedGames.push(insertResult[0]);
              }
            } catch (dbError) {
              log(moduleName, `Error inserting notified game record: ${dbError}`, "error");
            }
          }
        }
      }

      // Cleanup: Remove games that are no longer in the API response
      if (currentGameIds.length > 0 && allNotifiedGames.length > 0) {
        const gamesToRemove = allNotifiedGames.filter(
          (g: typeof schema.notifiedGames.$inferSelect) => !currentGameIds.includes(g.gameId)
        );

        if (gamesToRemove.length > 0) {
          await db
            .delete(schema.notifiedGames)
            .where(notInArray(schema.notifiedGames.gameId, currentGameIds));
          
          log(moduleName, `Cleaned up ${gamesToRemove.length} expired game(s)`);
        }
      }
    });

    worker.addEventListener("error", (error) => {
      log(moduleName, `Worker error: ${error}`, "error");
    });
  } catch (error) {
    log(moduleName, `Error in game checker: ${error}`, "error");
  }
}

// Start the interval checker
function startGameChecker() {
  // Run immediately on startup
  checkForNewGames();

  // Then run every 1 minute (60000 ms)
  checkInterval = setInterval(() => {
    checkForNewGames();
  }, 60000);

  log(moduleName, "Game checker started (running every 1 minute)");
}

// Optional: Export cleanup function if needed
export function cleanup() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    log(moduleName, "Game checker stopped");
  }
}
