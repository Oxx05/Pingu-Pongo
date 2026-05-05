export type GameMode = "pong" | "rally" | "solo";

export type GameConfig = {
  goalsToWin: number;   // 0 = infinite (pong only)
  spawnDelay: number;   // ms between spawns (pong + rally only)
  spinEnabled: boolean;
  mode: GameMode;
  initialSpeed: number;    // px/s — starting ball speed (scaled by screen size at runtime)
  speedProgression: number; // speed multiplier per paddle hit (0 = none)
  selectedItemIds: string[] | null; // null = all items enabled
  soloLayout: number;  // brick layout index (0-3)
};

export const DEFAULT_CONFIG: GameConfig = {
  goalsToWin: 10,
  spawnDelay: 3000,
  spinEnabled: true,
  mode: "pong",
  initialSpeed: 500,
  speedProgression: 0,
  selectedItemIds: null,
  soloLayout: 0,
};
