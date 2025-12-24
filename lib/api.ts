import type { GameData } from "../types";
import log from "@essence-discord-bot/lib/log";

const moduleName = "Free Games Notifier";

// Fetch free games from GamerPower API
export async function fetchFreeGames(): Promise<GameData[]> {
  try {
    const response = await fetch("https://www.gamerpower.com/api/giveaways");
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    const data = await response.json();
    return data as GameData[];
  } catch (error) {
    log(moduleName, `Error fetching free games: ${error}`, "error");
    return [];
  }
}
