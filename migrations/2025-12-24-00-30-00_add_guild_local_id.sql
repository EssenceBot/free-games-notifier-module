-- Add guild_local_id column to game_notifiers table
ALTER TABLE game_notifiers ADD COLUMN IF NOT EXISTS guild_local_id INTEGER;

-- Set default values for existing rows (sequential per guild)
DO $$
DECLARE
    current_guild VARCHAR(255);
    local_id INTEGER;
BEGIN
    FOR current_guild IN SELECT DISTINCT guild_id FROM game_notifiers WHERE guild_local_id IS NULL
    LOOP
        local_id := 1;
        UPDATE game_notifiers 
        SET guild_local_id = local_id + (
            SELECT COUNT(*) FROM game_notifiers g2 
            WHERE g2.guild_id = game_notifiers.guild_id 
            AND g2.id < game_notifiers.id
        )
        WHERE guild_id = current_guild AND guild_local_id IS NULL;
    END LOOP;
END $$;

-- Make the column NOT NULL after setting values
ALTER TABLE game_notifiers ALTER COLUMN guild_local_id SET NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_notifiers_guild_local_id ON game_notifiers(guild_id, guild_local_id);
