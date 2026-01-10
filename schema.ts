import {
  pgTable,
  serial,
  varchar,
  timestamp,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Table to store notifier configurations for each guild
export const gameNotifiers = pgTable("game_notifiers", {
  id: serial("id").primaryKey(),
  guildId: varchar("guild_id", { length: 255 }).notNull(),
  guildLocalId: integer("guild_local_id").notNull(), // Guild-specific sequential ID
  platform: varchar("platform", { length: 50 }).notNull(), // steam, epic-games-store
  type: varchar("type", { length: 50 }).notNull(), // game, dlc
  channelId: varchar("channel_id", { length: 255 }).notNull(),
  roleId: varchar("role_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Table to track already notified games to prevent duplicate notifications
// Now tracks per guild and platform/type combination instead of globally
export const notifiedGames = pgTable("notified_games", {
  id: serial("id").primaryKey(),
  guildId: varchar("guild_id", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  gameId: varchar("game_id", { length: 255 }).notNull(), // ID from GamerPower API
  title: varchar("title", { length: 500 }).notNull(),
  platforms: varchar("platforms", { length: 500 }).notNull(), // Comma-separated list
  endDate: varchar("end_date", { length: 255 }), // When the giveaway ends
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_notified_games_unique").on(
    table.guildId,
    table.platform,
    table.type,
    table.gameId
  ),
]);
