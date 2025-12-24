declare var self: Worker;
import { fetchFreeGames } from "../lib/api";
import { platformMatches, typeMatches } from "../lib/matchers";
import type { GameData } from "../types";

export interface GameCheckerInput {
  notifiers: Array<{
    id: number;
    guildId: string;
    platform: string;
    type: string;
    channelId: string;
    roleId: string;
  }>;
  notifiedGameIds: string[];
}

export interface GameCheckerResult {
  status: "success" | "error";
  newGames?: Array<{
    game: GameData;
    matchingNotifiers: Array<{
      id: number;
      guildId: string;
      platform: string;
      type: string;
      channelId: string;
      roleId: string;
    }>;
  }>;
  currentGameIds?: string[];
  error?: string;
}

self.onmessage = async (event: MessageEvent<GameCheckerInput>) => {
  try {
    const { notifiers, notifiedGameIds } = event.data;

    // Fetch all free games
    const games = await fetchFreeGames();
    
    if (games.length === 0) {
      postMessage({ 
        status: "success", 
        newGames: [], 
        currentGameIds: [] 
      } as GameCheckerResult);
      process.exit(0);
      return;
    }

    const notifiedSet = new Set(notifiedGameIds);
    const currentGameIds = games.map((g: GameData) => String(g.id));

    // Find new games
    const newGames = games.filter((game: GameData) => !notifiedSet.has(String(game.id)));

    // Match new games with notifiers
    const results = newGames.map((game: GameData) => {
      const matchingNotifiers = notifiers.filter(
        (notifier) =>
          platformMatches(game.platforms, notifier.platform) &&
          typeMatches(game.type, notifier.type)
      );

      return {
        game,
        matchingNotifiers,
      };
    });

    // Filter out games with no matching notifiers
    const gamesWithMatches = results.filter((r) => r.matchingNotifiers.length > 0);

    postMessage({ 
      status: "success", 
      newGames: gamesWithMatches,
      currentGameIds 
    } as GameCheckerResult);
  } catch (error) {
    postMessage({ 
      status: "error", 
      error: error instanceof Error ? error.message : "Unknown error" 
    } as GameCheckerResult);
  }
  
  process.exit(0);
};
