import { EmbedBuilder } from "discord.js";
import type { GameData } from "../types";

// Convert date string to Discord timestamp format
function toDiscordTimestamp(dateStr: string): string | null {
  try {
    // Parse the date string (format: "2026-01-15 23:59:00")
    // The API returns times in UTC
    const date = new Date(dateStr.replace(" ", "T") + "Z");
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    const unixTimestamp = Math.floor(date.getTime() / 1000);
    // Use 'f' format for short date/time, and 'R' for relative time
    return `<t:${unixTimestamp}:f> (<t:${unixTimestamp}:R>)`;
  } catch {
    return null;
  }
}

// Create embed for game notification
export function createGameEmbed(game: GameData): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(game.title || "Free Game")
    .setColor(0x00ff00)
    .setTimestamp();

  // Only set description if it exists and is not empty
  if (game.description && game.description.trim() !== "") {
    // Discord embeds have a 4096 character limit for description
    const description = game.description.length > 4000 
      ? game.description.substring(0, 4000) + "..." 
      : game.description;
    embed.setDescription(description);
  }

  // Only set image if it's a valid URL
  if (game.image && game.image.startsWith("http")) {
    embed.setImage(game.image);
  }

  // Only set URL if it's valid
  if (game.open_giveaway && game.open_giveaway.startsWith("http")) {
    embed.setURL(game.open_giveaway);
  }

  // Add fields only if they have valid values
  const fields: { name: string; value: string; inline: boolean }[] = [];
  
  if (game.platforms && game.platforms.trim() !== "") {
    fields.push({ name: "Platform", value: game.platforms, inline: true });
  }
  
  if (game.type && game.type.trim() !== "") {
    fields.push({ name: "Type", value: game.type, inline: true });
  }

  if (game.end_date && game.end_date !== "N/A" && game.end_date.trim() !== "") {
    const discordTimestamp = toDiscordTimestamp(game.end_date);
    fields.push({ 
      name: "Ends", 
      value: discordTimestamp || game.end_date, 
      inline: false 
    });
  }

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  return embed;
}
