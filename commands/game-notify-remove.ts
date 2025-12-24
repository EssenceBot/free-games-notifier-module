import { createSlashCommand, getDatabaseClient } from "@essence-discord-bot/api/botExtension";
import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { eq, and } from "drizzle-orm";
import * as schema from "../schema";
import log from "@essence-discord-bot/lib/log";

const moduleName = "Free Games Notifier";

export async function registerGameNotifyRemoveCommand() {
  await createSlashCommand(
    (slashCommand: SlashCommandBuilder) => {
      slashCommand
        .setName("game-notify-remove")
        .setDescription("Remove a game notifier configuration")
        .setDefaultMemberPermissions(
          PermissionFlagsBits.Administrator | 
          PermissionFlagsBits.ManageGuild | 
          PermissionFlagsBits.ModerateMembers
        )
        .addIntegerOption((option) =>
          option
            .setName("id")
            .setDescription("ID of the notifier to remove (from /game-notify-list)")
            .setRequired(true)
        );
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

        // Check permissions
        const member = interaction.guild.members.cache.get(interaction.user.id);
        const isOwner = interaction.guild.ownerId === interaction.user.id;
        const hasAdminPerms = member?.permissions.has(PermissionFlagsBits.Administrator);
        const hasModPerms = member?.permissions.has(PermissionFlagsBits.ManageGuild) || 
                           member?.permissions.has(PermissionFlagsBits.ModerateMembers);

        if (!isOwner && !hasAdminPerms && !hasModPerms) {
          await interaction.reply({
            content: "❌ You don't have permission to use this command. Only server owner, administrators, and moderators can remove game notifications.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const notifierId = interaction.options.getInteger("id", true);
        const db = getDatabaseClient();

        // Check if the notifier exists and belongs to this guild
        const notifier = await db
          .select()
          .from(schema.gameNotifiers)
          .where(
            and(
              eq(schema.gameNotifiers.guildLocalId, notifierId),
              eq(schema.gameNotifiers.guildId, interaction.guild.id)
            )
          )
          .limit(1);

        if (notifier.length === 0) {
          await interaction.reply({
            content: "Notifier not found or doesn't belong to this server.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // Delete the notifier
        await db
          .delete(schema.gameNotifiers)
          .where(
            and(
              eq(schema.gameNotifiers.guildLocalId, notifierId),
              eq(schema.gameNotifiers.guildId, interaction.guild.id)
            )
          );

        // Clean up notified games for this specific guild/platform/type combination
        // This allows re-notification if the same configuration is added again
        await db
          .delete(schema.notifiedGames)
          .where(
            and(
              eq(schema.notifiedGames.guildId, interaction.guild.id),
              eq(schema.notifiedGames.platform, notifier[0].platform),
              eq(schema.notifiedGames.type, notifier[0].type)
            )
          );

        await interaction.reply({
          content: `✅ Notifier #${notifierId} has been removed.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (error) {
        log(moduleName, `Error in game-notify-remove command: ${error}`, "error");
        await interaction.reply({
          content: "An error occurred while removing the notifier.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  );
}
