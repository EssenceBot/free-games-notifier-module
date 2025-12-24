import { EmbedBuilder } from "discord.js";
import type { GameData } from "../types";

// Create embed for game notification
export function createGameEmbed(game: GameData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(game.title)
    .setDescription(game.description || "No description available")
    .setImage(game.image)
    .addFields(
      { name: "Platform", value: game.platforms, inline: true },
      { name: "Type", value: game.type, inline: true }
    )
    .setURL(game.open_giveaway)
    .setColor(0x00ff00)
    .setTimestamp();

  if (game.end_date && game.end_date !== "N/A") {
    embed.addFields({ name: "Ends", value: game.end_date, inline: false });
  }

  return embed;
}
