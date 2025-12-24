import { createSlashCommand, getDatabaseClient } from "@essence-discord-bot/api/botExtension";
import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageFlags } from "discord.js";
import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { PLATFORM_MAP, TYPE_MAP } from "../types";
import log from "@essence-discord-bot/lib/log";

const moduleName = "Free Games Notifier";

export async function registerGameNotifyListCommand() {
  await createSlashCommand(
    (slashCommand: SlashCommandBuilder) => {
      slashCommand
        .setName("game-notify-list")
        .setDescription("List all configured game notifiers for this server");
    },
    async (interaction) => {
      try {
        if (!interaction.guild) {
          await interaction.reply({
            content: "This command can only be used in a server.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const db = getDatabaseClient();

        const notifiers = await db
          .select()
          .from(schema.gameNotifiers)
          .where(eq(schema.gameNotifiers.guildId, interaction.guild.id));

        if (notifiers.length === 0) {
          await interaction.reply({
            content: "No game notifiers configured for this server.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        let response = "**Configured Game Notifiers:**\n\n";
        for (const notifier of notifiers) {
          response += `**ID:** ${notifier.guildLocalId}\n`;
          response += `**Platform:** ${PLATFORM_MAP[notifier.platform]}\n`;
          response += `**Type:** ${TYPE_MAP[notifier.type]}\n`;
          response += `**Channel:** <#${notifier.channelId}>\n`;
          response += `**Role:** ${notifier.roleId}\n`;
          response += `─────────────────\n`;
        }

        await interaction.reply({
          content: response,
          flags: MessageFlags.Ephemeral,
        });
      } catch (error) {
        log(moduleName, `Error in game-notify-list command: ${error}`, "error");
        await interaction.reply({
          content: "An error occurred while fetching notifiers.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  );
}
