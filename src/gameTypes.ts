export type GameConfig = {
  goalsToWin: number;   // 0 = infinite
  spawnDelay: number;   // ms between spawns
  spinEnabled: boolean;
};

export const DEFAULT_CONFIG: GameConfig = {
  goalsToWin: 5,
  spawnDelay: 8000,
  spinEnabled: true,
};
