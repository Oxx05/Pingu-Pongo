export type GameMode = "pong" | "rally" | "solo";

export type GameConfig = {
  goalsToWin: number;   // 0 = infinite (pong only)
  spawnDelay: number;   // ms between spawns (pong + rally only)
  spinEnabled: boolean;
  mode: GameMode;
  initialSpeed: number;    // px/s — starting ball speed
  speedProgression: number; // speed multiplier added per paddle hit (0 = none)
};

export const DEFAULT_CONFIG: GameConfig = {
  goalsToWin: 10,
  spawnDelay: 3000,
  spinEnabled: true,
  mode: "pong",
  initialSpeed: 500,
  speedProgression: 0,
};
