-- Create game notifiers table to store notification configurations
CREATE TABLE IF NOT EXISTS game_notifiers (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    role_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_game_notifiers_guild_id ON game_notifiers(guild_id);
CREATE INDEX IF NOT EXISTS idx_game_notifiers_platform ON game_notifiers(platform);
CREATE INDEX IF NOT EXISTS idx_game_notifiers_type ON game_notifiers(type);

-- Create notified games table to track already notified games
CREATE TABLE IF NOT EXISTS notified_games (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    platforms VARCHAR(500) NOT NULL,
    end_date VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster game_id lookups
CREATE INDEX IF NOT EXISTS idx_notified_games_game_id ON notified_games(game_id);
