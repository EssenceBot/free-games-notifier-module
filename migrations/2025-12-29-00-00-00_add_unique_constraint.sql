-- Add unique constraint to prevent duplicate game notifications per guild/platform/type
CREATE UNIQUE INDEX IF NOT EXISTS idx_notified_games_unique 
ON notified_games(guild_id, platform, type, game_id);
