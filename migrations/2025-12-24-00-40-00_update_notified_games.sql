-- Update notified_games table to track per guild/platform/type combination
-- Drop the unique constraint on game_id
ALTER TABLE notified_games DROP CONSTRAINT IF EXISTS notified_games_game_id_unique;

-- Add guild_id, platform, and type columns
ALTER TABLE notified_games ADD COLUMN IF NOT EXISTS guild_id VARCHAR(255);
ALTER TABLE notified_games ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
ALTER TABLE notified_games ADD COLUMN IF NOT EXISTS type VARCHAR(50);

-- For existing records, we'll need to delete them since we can't reliably backfill
-- guild/platform/type data
DELETE FROM notified_games WHERE guild_id IS NULL;

-- Make the new columns NOT NULL
ALTER TABLE notified_games ALTER COLUMN guild_id SET NOT NULL;
ALTER TABLE notified_games ALTER COLUMN platform SET NOT NULL;
ALTER TABLE notified_games ALTER COLUMN type SET NOT NULL;

-- Create composite index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notified_games_guild_platform_type 
ON notified_games(guild_id, platform, type, game_id);

-- Drop old index if it exists
DROP INDEX IF EXISTS idx_notified_games_game_id;
