export type GameConfig = {
  goalsToWin: number;   // 0 = infinite
  spawnDelay: number;   // ms between spawns
  spinEnabled: boolean;
};

export const DEFAULT_CONFIG: GameConfig = {
  goalsToWin: 10,
  spawnDelay: 3000,
  spinEnabled: true,
};
