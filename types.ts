// GamerPower API types
export interface GameData {
  id: number;
  title: string;
  description: string;
  image: string;
  platforms: string;
  type: string;
  end_date: string;
  open_giveaway: string;
}

// Platform and type mappings
export const PLATFORM_MAP: Record<string, string> = {
  steam: "Steam",
  "epic-games-store": "Epic Games Store",
};

export const TYPE_MAP: Record<string, string> = {
  game: "Game",
  dlc: "DLC",
};
