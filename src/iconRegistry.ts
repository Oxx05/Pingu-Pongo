import {
  Shuffle, Gauge, TimerReset, Expand, Rabbit, Turtle, Shield, Trophy,
  Snowflake, Zap, Flame, Maximize2, Minimize2, MoveVertical, Scissors,
  Undo2, EyeOff, ArrowUpDown, Ghost, AlertCircle, Activity, ArrowLeftRight,
  Bomb, Magnet, TrendingUp, type LucideIcon,
} from "lucide-react";

const REGISTRY: Record<string, LucideIcon> = {
  Shuffle, Gauge, TimerReset, Expand, Rabbit, Turtle, Shield, Trophy,
  Snowflake, Zap, Flame, Maximize2, Minimize2, MoveVertical, Scissors,
  Undo2, EyeOff, ArrowUpDown, Ghost, AlertCircle, Activity, ArrowLeftRight,
  Bomb, Magnet, TrendingUp,
};

export function iconToId(icon: LucideIcon): string {
  for (const [k, v] of Object.entries(REGISTRY)) {
    if (v === icon) return k;
  }
  return "Shuffle";
}

export function idToIcon(id: string): LucideIcon {
  return REGISTRY[id] ?? Shuffle;
}
