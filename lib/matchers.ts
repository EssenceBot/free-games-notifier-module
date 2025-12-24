// Check if game platform matches notifier platform
export function platformMatches(gamePlatforms: string, notifierPlatform: string): boolean {
  const lowerPlatforms = gamePlatforms.toLowerCase();
  
  if (notifierPlatform === "steam" && lowerPlatforms.includes("steam")) {
    return true;
  }
  if (notifierPlatform === "epic-games-store" && lowerPlatforms.includes("epic games store")) {
    return true;
  }
  
  return false;
}

// Check if game type matches notifier type
export function typeMatches(gameType: string, notifierType: string): boolean {
  const lowerGameType = gameType.toLowerCase();
  
  if (notifierType === "game" && lowerGameType === "game") {
    return true;
  }
  // API uses "loot" for DLCs
  if (notifierType === "dlc" && lowerGameType === "loot") {
    return true;
  }
  
  return false;
}
