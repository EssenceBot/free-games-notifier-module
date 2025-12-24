import { createSlashCommand, getDatabaseClient } from "@essence-discord-bot/api/botExtension";
import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageFlags, ChannelType, PermissionFlagsBits } from "discord.js";
import { eq } from "drizzle-orm";
import * as schema from "../schema";
import { PLATFORM_MAP, TYPE_MAP } from "../types";
import log from "@essence-discord-bot/lib/log";

const moduleName = "Free Games Notifier";

export async function registerGameNotifyCommand() {
  await createSlashCommand(
    (slashCommand: SlashCommandBuilder) => {
      slashCommand
        .setName("game-notify")
        .setDescription("Configure free game notifications for this server")
        .setDefaultMemberPermissions(
          PermissionFlagsBits.Administrator | 
          PermissionFlagsBits.ManageGuild | 
          PermissionFlagsBits.ModerateMembers
        )
        .addStringOption((option) =>
          option
            .setName("platform")
            .setDescription("Platform to monitor")
            .setRequired(true)
            .addChoices(
              { name: "Steam", value: "steam" },
              { name: "Epic Games Store", value: "epic-games-store" }
            )
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Type of content to notify about")
            .setRequired(true)
            .addChoices(
              { name: "Game", value: "game" },
              { name: "DLC", value: "dlc" }
            )
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to send notifications to")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Role to ping for notifications")
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
            content: "❌ You don't have permission to use this command. Only server owner, administrators, and moderators can configure game notifications.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const platform = interaction.options.getString("platform", true);
        const type = interaction.options.getString("type", true);
        const channel = interaction.options.getChannel("channel", true);
        const role = interaction.options.getRole("role", true);

        const db = getDatabaseClient();

        // Get all existing notifiers for this guild to find the next available local ID
        const existingNotifiers = await db
          .select()
          .from(schema.gameNotifiers)
          .where(eq(schema.gameNotifiers.guildId, interaction.guild.id));

        // Find the lowest available ID
        const usedIds = new Set(existingNotifiers.map((n: typeof schema.gameNotifiers.$inferSelect) => n.guildLocalId));
        let nextLocalId = 1;
        while (usedIds.has(nextLocalId)) {
          nextLocalId++;
        }

        // Insert the notifier configuration
        await db.insert(schema.gameNotifiers).values({
          guildId: interaction.guild.id,
          guildLocalId: nextLocalId,
          platform: platform,
          type: type,
          channelId: channel.id,
          roleId: role.id,
        });

        await interaction.reply({
          content: `✅ Game notifier configured!\n**Platform:** ${PLATFORM_MAP[platform]}\n**Type:** ${TYPE_MAP[type]}\n**Channel:** <#${channel.id}>\n**Role:** <@&${role.id}>`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (error) {
        log(moduleName, `Error in game-notify command: ${error}`, "error");
        await interaction.reply({
          content: "An error occurred while configuring the notifier.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  );
}
