"use client";

import { useEffect, useRef, useState } from "react";
import Bola from "./Bola.tsx";
import AutoMover from "./AutoMover.tsx";
import ManualMover from "./ManualMover.tsx";
import Barra from "./Barra.tsx";
import Pontuacao from "./Pontuacao.tsx";
import StoredItems from "./StoredItems.tsx";
import type { LucideIcon } from "lucide-react";
import Item from "./Item.tsx";
import Menu from "./Menu.tsx";
import Shot from "./Shot.tsx";
import type { GameConfig } from "./gameTypes.ts";
import { DEFAULT_CONFIG } from "./gameTypes.ts";
import {
  Shuffle,
  Gauge,
  TimerReset,
  Expand,
  Rabbit,
  Turtle,
  Shield,
  Trophy,
  Snowflake,
  Zap,
  Flame,
  Maximize2,
  Minimize2,
  MoveVertical,
  Scissors,
  Undo2,
  EyeOff,
  Ghost,
  AlertCircle,
  Activity,
  ArrowLeftRight,
  Bomb,
  Magnet,
  TrendingUp,
  ArrowUpDown,
} from "lucide-react";

const isTouchDevice = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

type PlayerId = "player1" | "player2";

type PlayerMapNumber = Record<PlayerId, number>;
type PlayerMapBool = Record<PlayerId, boolean>;

type ItemEntry = {
  id: string;
  icon: LucideIcon;
  color: string;
  onCatch: (player: PlayerId) => void;
  canUse?: (player: PlayerId) => boolean;
  onBallCollide?: () => void; // mines: activated on ball contact, not stored in slot
};

type Decoy = { id: string; x: number; y: number; radius: number };

type SpawnedItem = ItemEntry & {
  instanceId: string;
  x: number;
  y: number;
  radius: number;
};

type StoredSlot = Pick<ItemEntry, "icon" | "color" | "onCatch" | "canUse">;

type ActiveBuff = {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  player: PlayerId;
  startedAt: number;
  duration: number;
};

type Notification = {
  id: string;
  text: string;
  color: string;
  player: PlayerId;
};

export default function Game() {
  const [gameStarted, setGameStarted] = useState(false);
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);
  const [winner, setWinner] = useState<PlayerId | null>(null);

  const barra1Ref = useRef<HTMLDivElement>(null);
  const barra2Ref = useRef<HTMLDivElement>(null);
  const shield1Ref = useRef<HTMLDivElement>(null);
  const shield2Ref = useRef<HTMLDivElement>(null);
  const bolaRef = useRef<HTMLDivElement>(null);
  const barra1VyRef = useRef(0);
  const barra2VyRef = useRef(0);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const BALL_RADIUS = Math.round(Math.min(20, vh * 0.028));
  const BALL_RADIUS_BIG = Math.round(BALL_RADIUS * 2.2);
  const BALL_RADIUS_MINI = Math.round(BALL_RADIUS * 0.45);
  const START_BALL_SPEED = 500;
  const BASE_PADDLE_HEIGHT = Math.round(Math.min(200, vh * 0.32));
  const BASE_PADDLE_WIDTH = Math.round(Math.min(20, vh * 0.04));
  const ITEM_RADIUS = Math.round(Math.min(18, vh * 0.04));
  const PADDLE_OFFSET = Math.round(Math.min(100, Math.max(36, vw * 0.08)));

  const [score, setScore] = useState([0, 0]);
  const scoreRef = useRef([0, 0]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  const [ballRadius, setBallRadius] = useState(BALL_RADIUS);
  const [goalMultiplier, setGoalMultiplier] = useState<PlayerMapNumber>({ player1: 1, player2: 1 });
  const [playerSpeedMultiplier, setPlayerSpeedMultiplier] = useState<PlayerMapNumber>({ player1: 1, player2: 1 });
  const [playerSizeMultiplier, setPlayerSizeMultiplier] = useState<PlayerMapNumber>({ player1: 1, player2: 1 });
  const [next1, setNext1] = useState<StoredSlot | null>(null);
  const [next2, setNext2] = useState<StoredSlot | null>(null);
  const [current1, setCurrent1] = useState<StoredSlot | null>(null);
  const [current2, setCurrent2] = useState<StoredSlot | null>(null);
  const [shieldActive, setShieldActive] = useState<PlayerMapBool>({ player1: false, player2: false });
  const [frozen, setFrozen] = useState<PlayerMapBool>({ player1: false, player2: false });
  const [inverted, setInverted] = useState<PlayerMapBool>({ player1: false, player2: false });
  const [drift, setDrift] = useState<PlayerMapNumber>({ player1: 0, player2: 0 });
  const [decoys, setDecoys] = useState<Decoy[]>([]);
  const [teleportY, setTeleportY] = useState<number | null>(null);
  const [ballGhost, setBallGhost] = useState(false);

  // Mirrors for swap — needed because item functions capture stale closures
  useEffect(() => { current1Ref.current = current1; }, [current1]);
  useEffect(() => { current2Ref.current = current2; }, [current2]);
  useEffect(() => { next1Ref.current = next1; }, [next1]);
  useEffect(() => { next2Ref.current = next2; }, [next2]);
  const [activeItems, setActiveItems] = useState<SpawnedItem[]>([]);
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPortrait, setIsPortrait] = useState(() => window.innerWidth < window.innerHeight && window.innerWidth <= 900);

  type ShotData = { id: string; startX: number; startY: number; direction: 1 | -1; shooter: PlayerId };
  const [shots, setShots] = useState<ShotData[]>([]);

  const timeoutByKeyRef = useRef<Record<string, number | null>>({});
  const buffCleanupRef = useRef<Record<string, number | null>>({});
  const isPausedRef = useRef(false);
  const slowCountRef = useRef(0);
  const slowSavedSpeedRef = useRef(0);
  const bigBallCountRef = useRef(0);
  const miniBallCountRef = useRef(0);
  const ghostCountRef = useRef(0);
  const fireActiveRef = useRef(false);
  const magnetRef = useRef(false);
  const distortionIntervalRef = useRef<number | null>(null);
  const distortionSavedSpeedRef = useRef(0);
  const current1Ref = useRef<typeof current1>(null);
  const current2Ref = useRef<typeof current2>(null);
  const next1Ref = useRef<typeof next1>(null);
  const next2Ref = useRef<typeof next2>(null);
  const turbineCountRef = useRef(0);
  const turbineSavedSpeedRef = useRef(0);
  const vyAccelRef = useRef(0);
  const itemSpawnTimeoutRef = useRef<number | null>(null);
  const itemPickupRafRef = useRef<number | null>(null);
  const activeItemsRef = useRef<SpawnedItem[]>([]);

  const VxRef = useRef(0);
  const VyRef = useRef(0);

  const collisionRafRef = useRef<number | null>(null);
  const cooldownRef = useRef(0);
  const lastTouchRef = useRef<PlayerId>("player1");

  function opposite(player: PlayerId): PlayerId {
    return player === "player1" ? "player2" : "player1";
  }

  function isBallInMyHalf(player: PlayerId): boolean {
    if (!bolaRef.current) return true;
    const rect = bolaRef.current.getBoundingClientRect();
    const ballX = rect.left + rect.width / 2;
    const halfW = window.innerWidth / 2;
    return player === "player1" ? ballX <= halfW : ballX >= halfW;
  }

  function setTimedEffect(
    key: string,
    durationMs: number,
    apply: () => void,
    revert: () => void,
    buff?: { label: string; icon: LucideIcon; color: string; player: PlayerId }
  ) {
    const previous = timeoutByKeyRef.current[key];
    if (previous !== null && previous !== undefined) clearTimeout(previous);

    apply();

    if (buff) {
      const prevCleanup = buffCleanupRef.current[key];
      if (prevCleanup) clearTimeout(prevCleanup);
      setActiveBuffs(prev => [
        ...prev.filter(b => b.key !== key),
        { key, ...buff, startedAt: Date.now(), duration: durationMs },
      ]);
      buffCleanupRef.current[key] = window.setTimeout(() => {
        setActiveBuffs(prev => prev.filter(b => b.key !== key));
        buffCleanupRef.current[key] = null;
      }, durationMs);
    }

    timeoutByKeyRef.current[key] = window.setTimeout(() => {
      revert();
      timeoutByKeyRef.current[key] = null;
    }, durationMs);
  }

  // Para efeitos que não usam setTimedEffect mas querem mostrar barra
  function addBuff(key: string, label: string, icon: LucideIcon, color: string, player: PlayerId, durationMs: number) {
    const prev = buffCleanupRef.current[key];
    if (prev) clearTimeout(prev);
    setActiveBuffs(p => [
      ...p.filter(b => b.key !== key),
      { key, label, icon, color, player, startedAt: Date.now(), duration: durationMs },
    ]);
    buffCleanupRef.current[key] = window.setTimeout(() => {
      setActiveBuffs(p => p.filter(b => b.key !== key));
      buffCleanupRef.current[key] = null;
    }, durationMs);
  }

  function notify(text: string, color: string, player: PlayerId) {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications(prev => [...prev, { id, text, color, player }]);
    window.setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 1800);
  }

  function resetGame() {
    // Clear all effect timeouts
    Object.keys(timeoutByKeyRef.current).forEach(k => {
      const id = timeoutByKeyRef.current[k];
      if (id !== null && id !== undefined) clearTimeout(id);
      timeoutByKeyRef.current[k] = null;
    });
    Object.keys(buffCleanupRef.current).forEach(k => {
      const id = buffCleanupRef.current[k];
      if (id !== null && id !== undefined) clearTimeout(id);
      buffCleanupRef.current[k] = null;
    });
    // Reset stacking counters and physics refs
    slowCountRef.current = 0;
    slowSavedSpeedRef.current = 0;
    bigBallCountRef.current = 0;
    miniBallCountRef.current = 0;
    ghostCountRef.current = 0;
    turbineCountRef.current = 0;
    turbineSavedSpeedRef.current = 0;
    fireActiveRef.current = false;
    magnetRef.current = false;
    if (distortionIntervalRef.current !== null) {
      clearInterval(distortionIntervalRef.current);
      distortionIntervalRef.current = null;
    }
    vyAccelRef.current = 0;
    cooldownRef.current = 0;
    lastTouchRef.current = "player1";
    prevBallCxRef.current = null;
    prevBallCyRef.current = null;
    activeItemsRef.current = [];
    scoreRef.current = [0, 0];
    // Reset ball velocity
    setBallDirectionWithSpeed(START_BALL_SPEED);
    // Reset all state
    setScore([0, 0]);
    setBallRadius(BALL_RADIUS);
    setGoalMultiplier({ player1: 1, player2: 1 });
    setPlayerSpeedMultiplier({ player1: 1, player2: 1 });
    setPlayerSizeMultiplier({ player1: 1, player2: 1 });
    setCurrent1(null);
    setCurrent2(null);
    setNext1(null);
    setNext2(null);
    setShieldActive({ player1: false, player2: false });
    setFrozen({ player1: false, player2: false });
    setInverted({ player1: false, player2: false });
    setDrift({ player1: 0, player2: 0 });
    setDecoys([]);
    setTeleportY(null);
    setActiveItems([]);
    setActiveBuffs([]);
    setNotifications([]);
    setShots([]);
    setBallGhost(false);
    setWinner(null);
  }

  function onGoal(scored: PlayerId) {
    const amount = goalMultiplier[scored];
    const newScore: [number, number] = scored === "player1"
      ? [scoreRef.current[0] + amount, scoreRef.current[1]]
      : [scoreRef.current[0], scoreRef.current[1] + amount];
    scoreRef.current = newScore;
    setScore(newScore);
    setGoalMultiplier(prev => ({ ...prev, [scored]: 1 }));
    setBallDirectionWithSpeed(START_BALL_SPEED);
    vyAccelRef.current = 0;
    prevBallCxRef.current = null;
    prevBallCyRef.current = null;
    cooldownRef.current = 30;

    if (configRef.current.goalsToWin > 0) {
      const pts = scored === "player1" ? newScore[0] : newScore[1];
      if (pts >= configRef.current.goalsToWin) setWinner(scored);
    }
  }

  function setBallDirectionWithSpeed(speed: number) {
    const minAbsCos = 0.3; // evita quase vertical
    let angle = 0;
    let cosAbs = 0;

    for (let i = 0; i < 20; i++) {
      angle = Math.random() * Math.PI * 2;
      cosAbs = Math.abs(Math.cos(angle));
      if (cosAbs >= minAbsCos) break;
    }

    if (cosAbs < minAbsCos) {
      angle = Math.random() < 0.5 ? Math.PI / 4 : (3 * Math.PI) / 4;
    }

    VxRef.current = Math.cos(angle) * speed;
    VyRef.current = Math.sin(angle) * speed;
  }

  function randomDirection() {
    const speed = Math.hypot(VxRef.current, VyRef.current);
    setBallDirectionWithSpeed(speed);
  }

  function randomVelocity() {
    const angle = Math.atan2(VyRef.current, VxRef.current);
    // 50% chance: very slow | 50% chance: very fast
    const newSpeed = Math.random() < 0.5
      ? 150 + Math.random() * 100   // lento: 150-250 px/s
      : 750 + Math.random() * 300;  // rápido: 750-1050 px/s
    let vx = Math.cos(angle) * newSpeed;
    let vy = Math.sin(angle) * newSpeed;
    // Clamp near-vertical (mesmo critério do applyFrontCollision)
    const minVx = newSpeed * 0.28;
    if (Math.abs(vx) < minVx) {
      vx = Math.sign(vx || (VxRef.current >= 0 ? 1 : -1)) * minVx;
      vy = Math.sign(vy || 1) * Math.sqrt(Math.max(0, newSpeed ** 2 - minVx ** 2));
    }
    VxRef.current = vx;
    VyRef.current = vy;
  }

  function timerChange(player: PlayerId) {
    const key = `timer:${player}`;
    if (timeoutByKeyRef.current[key]) return;

    if (slowCountRef.current === 0) {
      slowSavedSpeedRef.current = Math.max(Math.hypot(VxRef.current, VyRef.current), START_BALL_SPEED);
      VxRef.current *= 0.4;
      VyRef.current *= 0.4;
    }
    slowCountRef.current++;

    addBuff(key, "CÂMARA", TimerReset, "#91a7ff", player, 4000);
    notify("⏱ CÂMARA LENTA", "#91a7ff", player);
    notify("⏱ CÂMARA LENTA", "#91a7ff", opposite(player));
    timeoutByKeyRef.current[key] = window.setTimeout(() => {
      slowCountRef.current--;
      if (slowCountRef.current === 0) {
        const cur = Math.hypot(VxRef.current, VyRef.current);
        if (cur > 0) {
          VxRef.current = VxRef.current / cur * slowSavedSpeedRef.current;
          VyRef.current = VyRef.current / cur * slowSavedSpeedRef.current;
        }
      }
      timeoutByKeyRef.current[key] = null;
    }, 4000);
  }

  function speedBlue(player: PlayerId) {
    const key = `speedup:${player}`;
    setTimedEffect(
      key, 7000,
      () => setPlayerSpeedMultiplier(prev => ({ ...prev, [player]: 1.55 })),
      () => setPlayerSpeedMultiplier(prev => ({ ...prev, [player]: 1 })),
      { label: "VELOZ", icon: Rabbit, color: "#51cf66", player }
    );
  }

  function speedRed(player: PlayerId) {
    const enemy = opposite(player);
    const key = `speeddown:${enemy}`;
    setTimedEffect(
      key, 8000,
      () => setPlayerSpeedMultiplier(prev => ({ ...prev, [enemy]: 0.5 })),
      () => setPlayerSpeedMultiplier(prev => ({ ...prev, [enemy]: 1 })),
      { label: "LENTO", icon: Turtle, color: "#ff6b6b", player: enemy }
    );
    notify("▼ VELOCIDADE", "#ff6b6b", enemy);
  }

  function sizeBlue(player: PlayerId) {
    const key = `size:${player}`;
    setTimedEffect(
      key, 9000,
      () => setPlayerSizeMultiplier(prev => ({ ...prev, [player]: 1.6 })),
      () => setPlayerSizeMultiplier(prev => ({ ...prev, [player]: 1 })),
      { label: "BARRA+", icon: Expand, color: "#4dabf7", player }
    );
  }

  function sizeRed(player: PlayerId) {
    const enemy = opposite(player);
    const key = `size:${enemy}`;
    setTimedEffect(
      key, 9000,
      () => setPlayerSizeMultiplier(prev => ({ ...prev, [enemy]: 0.7 })),
      () => setPlayerSizeMultiplier(prev => ({ ...prev, [enemy]: 1 })),
      { label: "BARRA-", icon: Expand, color: "#ff6b6b", player: enemy }
    );
    notify("▼ BARRA MENOR", "#ff6b6b", enemy);
  }

  function shield(player: PlayerId) {
    const key = `shield:${player}`;
    setTimedEffect(
      key, 8000,
      () => setShieldActive(prev => ({ ...prev, [player]: true })),
      () => setShieldActive(prev => ({ ...prev, [player]: false })),
      { label: "ESCUDO", icon: Shield, color: "#63e6be", player }
    );
  }

  function goalMultiplierSkill(player: PlayerId) {
    const key = `goal:${player}`;
    setTimedEffect(
      key, 10000,
      () => setGoalMultiplier(prev => ({ ...prev, [player]: 2 })),
      () => setGoalMultiplier(prev => ({ ...prev, [player]: 1 })),
      { label: "GOLO×2", icon: Trophy, color: "#fab005", player }
    );
  }

  function ghostBall(player: PlayerId) {
    const key = `ghost:${player}`;
    setTimedEffect(
      key, 5000,
      () => { ghostCountRef.current++; setBallGhost(true); },
      () => { ghostCountRef.current--; if (ghostCountRef.current === 0) setBallGhost(false); },
      { label: "FANTASMA", icon: EyeOff, color: "#c0eb75", player }
    );
    notify("👁 BOLA FANTASMA", "#c0eb75", opposite(player));
  }

  function panicItem(player: PlayerId) {
    const enemy = opposite(player);
    const key = `panic:${enemy}`;
    setTimedEffect(
      key, 5000,
      () => setDrift(prev => ({ ...prev, [enemy]: 200 })),
      () => setDrift(prev => ({ ...prev, [enemy]: 0 })),
      { label: "PÂNICO", icon: AlertCircle, color: "#ff6348", player: enemy }
    );
    notify("↓ PÂNICO", "#ff6348", enemy);
  }

  function swapItems(player: PlayerId) {
    const c1 = current1Ref.current;
    const c2 = current2Ref.current;
    const n1 = next1Ref.current;
    const n2 = next2Ref.current;
    setCurrent1(c2);
    setCurrent2(c1);
    setNext1(n2);
    setNext2(n1);
    notify("⇄ TROCA", "#74c0fc", player);
    notify("⇄ TROCA", "#74c0fc", opposite(player));
  }

  function distortion(player: PlayerId) {
    const key = `distort:${player}`;
    if (timeoutByKeyRef.current[key]) return;
    if (distortionIntervalRef.current !== null) {
      clearInterval(distortionIntervalRef.current);
      distortionIntervalRef.current = null;
    }
    distortionSavedSpeedRef.current = Math.max(Math.hypot(VxRef.current, VyRef.current), 100);
    let toggle = false;
    distortionIntervalRef.current = window.setInterval(() => {
      toggle = !toggle;
      const cur = Math.hypot(VxRef.current, VyRef.current);
      if (cur > 0) {
        const target = distortionSavedSpeedRef.current * (toggle ? 2.4 : 0.28);
        VxRef.current = VxRef.current / cur * target;
        VyRef.current = VyRef.current / cur * target;
      }
    }, 480);
    addBuff(key, "DISTORÇÃO", Activity, "#74c0fc", player, 6000);
    timeoutByKeyRef.current[key] = window.setTimeout(() => {
      if (distortionIntervalRef.current !== null) {
        clearInterval(distortionIntervalRef.current);
        distortionIntervalRef.current = null;
      }
      const cur = Math.hypot(VxRef.current, VyRef.current);
      if (cur > 0) {
        VxRef.current = VxRef.current / cur * distortionSavedSpeedRef.current;
        VyRef.current = VyRef.current / cur * distortionSavedSpeedRef.current;
      }
      timeoutByKeyRef.current[key] = null;
    }, 6000);
  }

  function triggerMine() {
    const curSpeed = Math.hypot(VxRef.current, VyRef.current);
    const newSpeed = Math.max(curSpeed * 1.7, START_BALL_SPEED * 1.6);
    let vx = 0, vy = 0;
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      vx = Math.cos(angle) * newSpeed;
      vy = Math.sin(angle) * newSpeed;
      if (Math.abs(vx) >= newSpeed * 0.32) break;
    }
    VxRef.current = vx;
    VyRef.current = vy;
  }

  function echoItem(player: PlayerId) {
    const key = `echo:${player}`;
    if (timeoutByKeyRef.current[key]) return;
    const newDecoys: Decoy[] = Array.from({ length: 3 }, (_, i) => ({
      id: `decoy-${Date.now()}-${i}`,
      x: 120 + Math.random() * Math.max(1, window.innerWidth - 240),
      y: 80 + Math.random() * Math.max(1, window.innerHeight - 160),
      radius: BALL_RADIUS,
    }));
    ghostCountRef.current++;
    setBallGhost(true);
    setDecoys(newDecoys);
    addBuff(key, "ECO", Ghost, "#ffd43b", player, 4500);
    notify("👁 ECO — qual é a real?", "#ffd43b", opposite(player));
    timeoutByKeyRef.current[key] = window.setTimeout(() => {
      setDecoys([]);
      ghostCountRef.current--;
      if (ghostCountRef.current === 0) setBallGhost(false);
      timeoutByKeyRef.current[key] = null;
    }, 4500);
  }

  function magnetItem(player: PlayerId) {
    const key = `magnet:${player}`;
    setTimedEffect(
      key, 5000,
      () => { magnetRef.current = true; },
      () => { magnetRef.current = false; },
      { label: "ÍMAN", icon: Magnet, color: "#51cf66", player }
    );
  }

  function fireBallItem(player: PlayerId) {
    const key = `fire:${player}`;
    setTimedEffect(
      key, 6000,
      () => { fireActiveRef.current = true; },
      () => { fireActiveRef.current = false; },
      { label: "FOGO", icon: TrendingUp, color: "#ff7b54", player }
    );
  }

  function megaBarra(player: PlayerId) {
    const key = `megasize:${player}`;
    setTimedEffect(
      key, 4000,
      () => setPlayerSizeMultiplier(prev => ({ ...prev, [player]: 2.4 })),
      () => setPlayerSizeMultiplier(prev => ({ ...prev, [player]: 1 })),
      { label: "MEGA BARRA", icon: MoveVertical, color: "#4dabf7", player }
    );
  }

  function miniBall(player: PlayerId) {
    const key = `miniball:${player}`;
    if (timeoutByKeyRef.current[key]) return;
    miniBallCountRef.current++;
    setTimedEffect(
      key, 5000,
      () => { if (bigBallCountRef.current === 0) setBallRadius(BALL_RADIUS_MINI); },
      () => {
        miniBallCountRef.current--;
        if (miniBallCountRef.current === 0 && bigBallCountRef.current === 0) setBallRadius(BALL_RADIUS);
      },
      { label: "MINI BOLA", icon: Minimize2, color: "#51cf66", player }
    );
  }

  function robItem(player: PlayerId) {
    const enemy = opposite(player);
    if (enemy === "player1") {
      setCurrent1(null);
      setNext1(null);
    } else {
      setCurrent2(null);
      setNext2(null);
    }
    notify("✂ ITEM PERDIDO", "#ff6b6b", enemy);
  }

  function reverseX() {
    VxRef.current = -VxRef.current;
  }


  // ── 5 novos efeitos ────────────────────────────────────────────────

  function bigBall(player: PlayerId) {
    const key = `bigball:${player}`;
    if (timeoutByKeyRef.current[key]) return;
    bigBallCountRef.current++;
    setTimedEffect(
      key, 6000,
      () => setBallRadius(BALL_RADIUS_BIG),
      () => {
        bigBallCountRef.current--;
        if (bigBallCountRef.current === 0) {
          setBallRadius(miniBallCountRef.current > 0 ? BALL_RADIUS_MINI : BALL_RADIUS);
        }
      },
      { label: "BOLA+", icon: Maximize2, color: "#4dabf7", player }
    );
  }

  function applyFreeze(enemy: PlayerId) {
    const key = `freeze:${enemy}`;
    setTimedEffect(
      key, 2800,
      () => setFrozen(prev => ({ ...prev, [enemy]: true })),
      () => setFrozen(prev => ({ ...prev, [enemy]: false })),
      { label: "GELO", icon: Snowflake, color: "#a8d8f0", player: enemy }
    );
    notify("❄ GELO", "#a8d8f0", enemy);
  }

  function freeze(player: PlayerId) {
    const barraRef = player === "player1" ? barra1Ref : barra2Ref;
    if (!barraRef.current) return;
    const rect = barraRef.current.getBoundingClientRect();
    const direction = player === "player1" ? 1 : -1 as 1 | -1;
    // start from the front face of the paddle, vertically centered
    const startX = player === "player1" ? rect.right : rect.left - 48;
    const startY = rect.top + rect.height / 2;
    const id = `shot-${Date.now()}-${Math.random()}`;
    setShots(prev => [...prev, { id, startX, startY, direction, shooter: player }]);
  }

  function invertControls(player: PlayerId) {
    const enemy = opposite(player);
    const key = `invert:${enemy}`;
    setTimedEffect(
      key, 5000,
      () => setInverted(prev => ({ ...prev, [enemy]: true })),
      () => setInverted(prev => ({ ...prev, [enemy]: false })),
      { label: "INVERSÃO", icon: ArrowUpDown, color: "#f472b6", player: enemy }
    );
    notify("↕ INVERSÃO", "#f472b6", enemy);
  }

  function teleport(player: PlayerId) {
    const key = `teleport:${player}`;
    if (timeoutByKeyRef.current[key]) return;
    const margin = 80;
    const newY = Math.round(margin + Math.random() * (window.innerHeight - margin * 2 - BALL_RADIUS * 2));
    setTeleportY(newY);
    addBuff(key, "TELEP.", Zap, "#c0eb75", player, 1500);
    timeoutByKeyRef.current[key] = window.setTimeout(() => { timeoutByKeyRef.current[key] = null; }, 4000);
  }

  function turbine(player: PlayerId) {
    const key = `turbine:${player}`;
    if (timeoutByKeyRef.current[key]) return;

    if (turbineCountRef.current === 0) {
      turbineSavedSpeedRef.current = Math.max(Math.hypot(VxRef.current, VyRef.current), START_BALL_SPEED);
    }
    turbineCountRef.current++;

    const currentSpeed = Math.hypot(VxRef.current, VyRef.current);
    if (currentSpeed > 0) {
      VxRef.current = VxRef.current / currentSpeed * 1050;
      VyRef.current = VyRef.current / currentSpeed * 1050;
    }

    addBuff(key, "TURBINE", Flame, "#ff7b54", player, 3000);
    timeoutByKeyRef.current[key] = window.setTimeout(() => {
      turbineCountRef.current--;
      if (turbineCountRef.current === 0) {
        const speedNow = Math.hypot(VxRef.current, VyRef.current);
        if (speedNow > 0) {
          VxRef.current = VxRef.current / speedNow * turbineSavedSpeedRef.current;
          VyRef.current = VyRef.current / speedNow * turbineSavedSpeedRef.current;
        }
      }
      timeoutByKeyRef.current[key] = null;
    }, 3000);
  }

  const itemPool: ItemEntry[] = [
    // Neutral
    { id: "random-direction", icon: Shuffle,      color: "#ffd43b", onCatch: ()  => randomDirection() },
    { id: "random-velocity",  icon: Gauge,        color: "#74c0fc", onCatch: ()  => randomVelocity() },
    { id: "timer-change",     icon: TimerReset,   color: "#91a7ff", onCatch: (p) => timerChange(p) },
    { id: "reverse-x",        icon: Undo2,        color: "#ffd43b", onCatch: ()  => reverseX() },
    { id: "distortion",       icon: Activity,     color: "#74c0fc", onCatch: (p) => distortion(p) },
    // Positive (blue/green — help self)
    { id: "size-blue",        icon: Expand,       color: "#4dabf7", onCatch: (p) => sizeBlue(p) },
    { id: "mega-barra",       icon: MoveVertical, color: "#4dabf7", onCatch: (p) => megaBarra(p) },
    { id: "speed-blue",       icon: Rabbit,       color: "#51cf66", onCatch: (p) => speedBlue(p) },
    { id: "shield",           icon: Shield,       color: "#63e6be", onCatch: (p) => shield(p) },
    { id: "goal-multiplier",  icon: Trophy,       color: "#fab005", onCatch: (p) => goalMultiplierSkill(p) },
    { id: "big-ball",         icon: Maximize2,    color: "#4dabf7", onCatch: (p) => bigBall(p) },
    { id: "mini-ball",        icon: Minimize2,    color: "#51cf66", onCatch: (p) => miniBall(p) },
    { id: "teleport",         icon: Zap,          color: "#c0eb75", onCatch: (p) => teleport(p), canUse: (p) => isBallInMyHalf(p) },
    { id: "turbine",          icon: Flame,        color: "#ff9f43", onCatch: (p) => turbine(p) },
    { id: "ghost-ball",       icon: EyeOff,       color: "#c0eb75", onCatch: (p) => ghostBall(p) },
    { id: "echo",             icon: Ghost,        color: "#ffd43b", onCatch: (p) => echoItem(p) },
    { id: "magnet",           icon: Magnet,       color: "#51cf66", onCatch: (p) => magnetItem(p) },
    { id: "fire-ball",        icon: TrendingUp,   color: "#ff7b54", onCatch: (p) => fireBallItem(p) },
    { id: "swap-items",       icon: ArrowLeftRight,color: "#74c0fc",onCatch: (p) => swapItems(p) },
    // Negative (red — hurt enemy)
    { id: "size-red",         icon: Expand,       color: "#ff6b6b", onCatch: (p) => sizeRed(p) },
    { id: "speed-red",        icon: Turtle,       color: "#ff6b6b", onCatch: (p) => speedRed(p) },
    { id: "freeze",           icon: Snowflake,    color: "#ff4757", onCatch: (p) => freeze(p) },
    { id: "invert",           icon: ArrowUpDown,  color: "#ff6348", onCatch: (p) => invertControls(p) },
    { id: "rob-item",         icon: Scissors,     color: "#ff6b6b", onCatch: (p) => robItem(p) },
    { id: "panic",            icon: AlertCircle,  color: "#ff6348", onCatch: (p) => panicItem(p) },
    // Mine (field trap — not stored, activates on ball contact)
    { id: "mine",             icon: Bomb,         color: "#ff4757", onCatch: () => {},
      onBallCollide: () => triggerMine() },
  ];
  const itemPoolRef = useRef(itemPool);

  const prevBallCxRef = useRef<number | null>(null);
  const prevBallCyRef = useRef<number | null>(null);

  function circleOverlapsRect(cx: number, cy: number, r: number, rx: number, ry: number, rw: number, rh: number): boolean {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < r * r;
  }

  function circleOverlapsCircle(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const rr = r1 + r2;
    return dx * dx + dy * dy <= rr * rr;
  }

  function sweptFaceCrossing(
    prevCx: number,
    prevCy: number,
    cx: number,
    cy: number,
    faceX: number,
    yMin: number,
    yMax: number,
    approachingFromRight: boolean
  ): number | null {
    const crossed = approachingFromRight ? prevCx >= faceX && cx < faceX : prevCx <= faceX && cx > faceX;
    if (!crossed) return null;
    const t = (faceX - prevCx) / (cx - prevCx);
    const cyAtCross = prevCy + t * (cy - prevCy);
    return cyAtCross >= yMin && cyAtCross <= yMax ? cyAtCross : null;
  }

  function getCollisionSide(
    cx: number,
    cy: number,
    r: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): "front" | "topbottom" {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    if (dx === 0 && dy === 0) return "front";
    const penX = r - Math.abs(dx);
    const penY = r - Math.abs(dy);
    return penX <= penY ? "front" : "topbottom";
  }

  useEffect(() => {
    setBallDirectionWithSpeed(START_BALL_SPEED);
  }, []);

  useEffect(() => {
    const check = () => setIsPortrait(window.innerWidth < window.innerHeight && window.innerWidth <= 900);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  useEffect(() => { isPausedRef.current = isPortrait || winner !== null; }, [isPortrait, winner]);

  useEffect(() => {
    prevBallCxRef.current = null;
    prevBallCyRef.current = null;

    if (collisionRafRef.current !== null) {
      cancelAnimationFrame(collisionRafRef.current);
      collisionRafRef.current = null;
    }

    function applyFrontCollision(
      cy: number,
      barraCenterY: number,
      barraHalfH: number,
      barraVyRef: { current: number },
      directionSign: 1 | -1
    ) {
      const impact = Math.max(-1, Math.min(1, (cy - barraCenterY) / barraHalfH));
      const speed = Math.sqrt(VxRef.current ** 2 + VyRef.current ** 2) * (fireActiveRef.current ? 1.22 : 1.05);
      const angle = impact * (Math.PI / 3);
      VxRef.current = directionSign * Math.abs(speed * Math.cos(angle));
      VyRef.current = speed * Math.sin(angle) + barraVyRef.current * 0.008;
      // Spin: barra desce → backspin → bola curva para cima (sinal invertido, como ping pong)
      vyAccelRef.current = configRef.current.spinEnabled ? -barraVyRef.current * 0.28 : 0;
      // Clamp near-vertical: garante |Vx| >= 28% da velocidade total
      const totalSpeed = Math.hypot(VxRef.current, VyRef.current);
      if (totalSpeed > 0) {
        const minVx = totalSpeed * 0.28;
        if (Math.abs(VxRef.current) < minVx) {
          VxRef.current = directionSign * minVx;
          VyRef.current = Math.sign(VyRef.current || 1) * Math.sqrt(Math.max(0, totalSpeed ** 2 - minVx ** 2));
        }
      }
    }

    function applyTopBottomCollision(cy: number, barraCenterY: number) {
      VyRef.current = cy < barraCenterY ? -Math.abs(VyRef.current) : Math.abs(VyRef.current);
    }

    function collideWithRect(
      cx: number,
      cy: number,
      r: number,
      prevCx: number | null,
      prevCy: number | null,
      rect: DOMRect,
      vyRef: { current: number },
      directionSign: 1 | -1,
      approachingFromRight: boolean
    ): boolean {
      const overlap = circleOverlapsRect(cx, cy, r, rect.left, rect.top, rect.width, rect.height);

      if (!overlap && prevCx !== null && prevCy !== null) {
        const faceX = approachingFromRight ? rect.right : rect.left;
        const cyAtCross = sweptFaceCrossing(prevCx, prevCy, cx, cy, faceX, rect.top - r, rect.bottom + r, approachingFromRight);
        if (cyAtCross !== null) {
          applyFrontCollision(cyAtCross, rect.top + rect.height / 2, rect.height / 2, vyRef, directionSign);
          cooldownRef.current = 20;
          return true;
        }
      }

      if (overlap) {
        const side = getCollisionSide(cx, cy, r, rect.left, rect.top, rect.width, rect.height);
        if (side === "topbottom") {
          applyTopBottomCollision(cy, rect.top + rect.height / 2);
        } else {
          applyFrontCollision(cy, rect.top + rect.height / 2, rect.height / 2, vyRef, directionSign);
        }
        cooldownRef.current = 20;
        return true;
      }

      return false;
    }

    function checkCollision() {
      if (!bolaRef.current || !barra1Ref.current || !barra2Ref.current) {
        collisionRafRef.current = requestAnimationFrame(checkCollision);
        return;
      }

      if (isPausedRef.current) {
        collisionRafRef.current = requestAnimationFrame(checkCollision);
        return;
      }

      if (cooldownRef.current > 0) {
        cooldownRef.current--;
        collisionRafRef.current = requestAnimationFrame(checkCollision);
        return;
      }

      const bolaRect = bolaRef.current.getBoundingClientRect();
      const cx = bolaRect.left + bolaRect.width / 2;
      const cy = bolaRect.top + bolaRect.height / 2;
      const r = bolaRect.width / 2;

      const prevCx = prevBallCxRef.current;
      const prevCy = prevBallCyRef.current;
      prevBallCxRef.current = cx;
      prevBallCyRef.current = cy;

      const barra1Rect = barra1Ref.current.getBoundingClientRect();
      const barra2Rect = barra2Ref.current.getBoundingClientRect();

      if (collideWithRect(cx, cy, r, prevCx, prevCy, barra1Rect, barra1VyRef, 1, true)) {
        lastTouchRef.current = "player1";
        collisionRafRef.current = requestAnimationFrame(checkCollision);
        return;
      }

      if (collideWithRect(cx, cy, r, prevCx, prevCy, barra2Rect, barra2VyRef, -1, false)) {
        lastTouchRef.current = "player2";
        collisionRafRef.current = requestAnimationFrame(checkCollision);
        return;
      }

      if (shieldActive.player1 && shield1Ref.current) {
        const shield1Rect = shield1Ref.current.getBoundingClientRect();
        if (collideWithRect(cx, cy, r, prevCx, prevCy, shield1Rect, { current: 0 }, 1, true)) {
          lastTouchRef.current = "player1";
          collisionRafRef.current = requestAnimationFrame(checkCollision);
          setShieldActive((prev) => ({ ...prev, player1: false }))
          return;
        }
      }

      if (shieldActive.player2 && shield2Ref.current) {
        const shield2Rect = shield2Ref.current.getBoundingClientRect();
        if (collideWithRect(cx, cy, r, prevCx, prevCy, shield2Rect, { current: 0 }, -1, false)) {
          lastTouchRef.current = "player2";
          collisionRafRef.current = requestAnimationFrame(checkCollision);
          setShieldActive((prev) => ({ ...prev, player2: false }))
          return;
        }
      }

      collisionRafRef.current = requestAnimationFrame(checkCollision);
    }

    collisionRafRef.current = requestAnimationFrame(checkCollision);

    return () => {
      if (collisionRafRef.current !== null) {
        cancelAnimationFrame(collisionRafRef.current);
        collisionRafRef.current = null;
      }
    };
  }, [shieldActive]);

  useEffect(() => {
    if (!gameStarted) return;

    function scheduleNextSpawn() {
      const base = configRef.current.spawnDelay;
      const delay = base + Math.random() * base * 0.5;
      itemSpawnTimeoutRef.current = window.setTimeout(() => {
        if (window.innerWidth > 0 && window.innerHeight > 0) {
          const entryPool = itemPoolRef.current;
          const entry = entryPool[Math.floor(Math.random() * entryPool.length)];
          const marginX = 140;
          const marginY = 80;
          const x = marginX + Math.random() * Math.max(1, window.innerWidth - marginX * 2);
          const y = marginY + Math.random() * Math.max(1, window.innerHeight - marginY * 2);
          setActiveItems((prev) => [
            ...prev,
            { ...entry, instanceId: `${entry.id}-${Date.now()}-${Math.random()}`, x, y, radius: ITEM_RADIUS },
          ]);
        }
        scheduleNextSpawn();
      }, delay);
    }

    scheduleNextSpawn();

    return () => {
      if (itemSpawnTimeoutRef.current !== null) {
        clearTimeout(itemSpawnTimeoutRef.current);
        itemSpawnTimeoutRef.current = null;
      }
    };
  }, [gameStarted]);

  useEffect(() => {
    function checkItemPickup() {
      if (!bolaRef.current) {
        itemPickupRafRef.current = requestAnimationFrame(checkItemPickup);
        return;
      }

      const items = activeItemsRef.current;
      if (items.length === 0) {
        itemPickupRafRef.current = requestAnimationFrame(checkItemPickup);
        return;
      }

      const ballRect = bolaRef.current.getBoundingClientRect();
      const ballX = ballRect.left + ballRect.width / 2;
      const ballY = ballRect.top + ballRect.height / 2;
      const ballR = ballRect.width / 2;
      const consumedIds = new Set<string>();

      for (const item of items) {
        const caughtByBall = circleOverlapsCircle(item.x, item.y, item.radius, ballX, ballY, ballR);
        if (caughtByBall) {
          if (item.onBallCollide) {
            // Mine / trap: direct effect, not stored in slot
            item.onBallCollide();
          } else {
            const slotItem: StoredSlot = {
              icon: item.icon,
              color: item.color,
              onCatch: item.onCatch,
              canUse: item.canUse,
            };
            if (lastTouchRef.current === "player1") {
              setCurrent1((prevCurrent) => {
                if (prevCurrent !== null) {
                  setNext1((prevNext) => (prevNext ?? slotItem));
                  return prevCurrent;
                }
                return slotItem;
              });
            } else {
              setCurrent2((prevCurrent) => {
                if (prevCurrent !== null) {
                  setNext2((prevNext) => (prevNext ?? slotItem));
                  return prevCurrent;
                }
                return slotItem;
              });
            }
          }
          consumedIds.add(item.instanceId);
        }
      }

      if (consumedIds.size > 0) {
        setActiveItems((prev) => prev.filter((item) => !consumedIds.has(item.instanceId)));
      }

      itemPickupRafRef.current = requestAnimationFrame(checkItemPickup);
    }

    itemPickupRafRef.current = requestAnimationFrame(checkItemPickup);

    return () => {
      if (itemPickupRafRef.current !== null) {
        cancelAnimationFrame(itemPickupRafRef.current);
        itemPickupRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    activeItemsRef.current = activeItems;
  }, [activeItems]);

  function shoot1() {
    if (!current1) return;
    if (current1.canUse && !current1.canUse("player1")) {
      notify("⚠ BOLA NO LADO ERRADO", "#ffd43b", "player1");
      return;
    }
    current1.onCatch("player1");
    if (next1) {
      setCurrent1(next1);
      setNext1(null);
    } else {
      setCurrent1(null);
    }
  }

  function shoot2() {
    if (!current2) return;
    if (current2.canUse && !current2.canUse("player2")) {
      notify("⚠ BOLA NO LADO ERRADO", "#ffd43b", "player2");
      return;
    }
    current2.onCatch("player2");
    if (next2) {
      setCurrent2(next2);
      setNext2(null);
    } else {
      setCurrent2(null);
    }
  }

  function rotate1() {
    if (!current1 || !next1) return;
    const a = current1;
    const b = next1;
    setCurrent1(b);
    setNext1(a);
  }

  function rotate2() {
    if (!current2 || !next2) return;
    const a = current2;
    const b = next2;
    setCurrent2(b);
    setNext2(a);
  }


  useEffect(() => {
    const timers = timeoutByKeyRef.current;
    return () => {
      Object.values(timers).forEach((id) => {
        if (id !== null && id !== undefined) clearTimeout(id);
      });

      if (itemSpawnTimeoutRef.current !== null) clearTimeout(itemSpawnTimeoutRef.current);
      if (itemPickupRafRef.current !== null) cancelAnimationFrame(itemPickupRafRef.current);
      if (distortionIntervalRef.current !== null) clearInterval(distortionIntervalRef.current);
    };
  }, []);

  const paddleHeight1 = BASE_PADDLE_HEIGHT * playerSizeMultiplier.player1;
  const paddleHeight2 = BASE_PADDLE_HEIGHT * playerSizeMultiplier.player2;

  if (!gameStarted) {
    return <Menu onPlay={(cfg) => { setConfig(cfg); resetGame(); setGameStarted(true); }} />;
  }

  return (
    <>
    {/* Overlay portrait em mobile */}
    <div style={{
      display: "none",
      position: "fixed", inset: 0, zIndex: 200,
      background: "#0e0b18",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      // Mostrado só via CSS media query — ver abaixo
    } as React.CSSProperties} className="portrait-overlay">
      <div style={{ fontSize: "3rem" }}>↻</div>
      <div style={{
        fontFamily: "'Courier New', Courier, monospace",
        color: "rgba(232,244,251,0.7)",
        fontSize: "1rem",
        letterSpacing: "0.15em",
        textAlign: "center",
        padding: "0 32px",
      }}>
        RODA O TELEMÓVEL<br/>
        <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>joga em landscape</span>
      </div>
    </div>
    {winner && (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(14,11,24,0.92)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 28,
      }}>
        <div style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "clamp(1.2rem, 5vw, 2.2rem)",
          fontWeight: "bold",
          color: winner === "player1" ? "#56d1c4" : "#f5895e",
          textShadow: `0 0 32px ${winner === "player1" ? "#56d1c488" : "#f5895e88"}`,
          letterSpacing: "0.15em",
          textAlign: "center",
        }}>
          {winner === "player1" ? "JOGADOR 1" : "JOGADOR 2"}<br />
          <span style={{ fontSize: "0.6em", color: "rgba(255,255,255,0.5)", fontWeight: "normal" }}>GANHOU!</span>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <button
            onClick={() => { resetGame(); setGameStarted(false); }}
            style={winBtnStyle}
          >MENU</button>
          <button
            onClick={() => { resetGame(); }}
            style={{ ...winBtnStyle, borderColor: "rgba(232,244,251,0.5)", color: "#e8f4fb" }}
          >JOGAR DE NOVO</button>
        </div>
      </div>
    )}

    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Pontuacao score1={score[0]} score2={score[1]} />
      <StoredItems
        left={{ current: current1 ?? undefined, next: next1 ?? undefined }}
        right={{ current: current2 ?? undefined, next: next2 ?? undefined }}
      />

      {shieldActive.player1 && (
        <div
          ref={shield1Ref}
          style={{
            position: "fixed",
            left: 46,
            top: "20%",
            width: 8,
            height: "60%",
            borderRadius: 999,
            background: "rgba(86,209,196,0.35)",
            boxShadow: "0 0 16px rgba(86,209,196,0.5)",
          }}
        />
      )}

      {shieldActive.player2 && (
        <div
          ref={shield2Ref}
          style={{
            position: "fixed",
            right: 46,
            top: "20%",
            width: 8,
            height: "60%",
            borderRadius: 999,
            background: "rgba(245,137,94,0.35)",
            boxShadow: "0 0 16px rgba(245,137,94,0.5)",
          }}
        />
      )}

      <ManualMover
        v={500 * playerSpeedMultiplier.player1}
        initialX={PADDLE_OFFSET}
        initialY={(vh - paddleHeight1) / 2}
        elementHeight={paddleHeight1}
        keys={new Map([
          ["w", "up"],
          ["s", "down"],
          [" ", "shoot"],
          ["d", "rotate"]
        ])}
        onVelocityChange={(v) => {
          barra1VyRef.current = v;
        }}
        onShoot={shoot1}
        onRotate={rotate1}
        touchZone="left"
        frozen={frozen.player1}
        inverted={inverted.player1}
        driftForce={drift.player1}
        paused={isPortrait || winner !== null}
      >
        <Barra ref={barra1Ref} height={paddleHeight1} width={BASE_PADDLE_WIDTH} color="#56d1c4" glowColor="86,209,196" />
      </ManualMover>

      <ManualMover
        v={500 * playerSpeedMultiplier.player2}
        initialX={vw - PADDLE_OFFSET - BASE_PADDLE_WIDTH}
        initialY={(vh - paddleHeight2) / 2}
        elementHeight={paddleHeight2}
        keys={new Map([
          ["ArrowUp", "up"],
          ["ArrowDown", "down"],
          ["Enter", "shoot"],
          ["ArrowRight", "rotate"]
        ])}
        onVelocityChange={(v) => {
          barra2VyRef.current = v;
        }}
        onShoot={shoot2}
        onRotate={rotate2}
        touchZone="right"
        frozen={frozen.player2}
        inverted={inverted.player2}
        driftForce={drift.player2}
        paused={isPortrait || winner !== null}
      >
        <Barra ref={barra2Ref} height={paddleHeight2} width={BASE_PADDLE_WIDTH} color="#f5895e" glowColor="245,137,94" />
      </ManualMover>

      <AutoMover
        vxRef={VxRef}
        vyRef={VyRef}
        initialX={vw / 2 - BALL_RADIUS}
        initialY={vh / 2 - BALL_RADIUS}
        onGoal={onGoal}
        teleportY={teleportY}
        vyAccelRef={vyAccelRef}
        magnetRef={magnetRef}
        paused={isPortrait || winner !== null}
      >
        <Bola ref={bolaRef} radius={ballRadius} ghost={ballGhost} />
      </AutoMover>

      {/* Buffs activos — player 1 (esquerda) */}
      <div style={{ position: "fixed", left: 16, top: 102, display: "flex", flexDirection: "column", gap: 5, zIndex: 30, pointerEvents: "none" }}>
        {activeBuffs.filter(b => b.player === "player1").map(b => (
          <BuffBar key={`${b.key}-${b.startedAt}`} buff={b} align="left" />
        ))}
      </div>

      {/* Buffs activos — player 2 (direita) */}
      <div style={{ position: "fixed", right: 16, top: 102, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, zIndex: 30, pointerEvents: "none" }}>
        {activeBuffs.filter(b => b.player === "player2").map(b => (
          <BuffBar key={`${b.key}-${b.startedAt}`} buff={b} align="right" />
        ))}
      </div>

      {/* Notificações de habilidades do inimigo */}
      {notifications.map(n => (
        <div key={n.id} className="skill-notif" style={{
          position: "fixed",
          top: "38%",
          ...(n.player === "player1" ? { left: "8%" } : { right: "8%" }),
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "clamp(0.85rem, 2vw, 1.15rem)",
          fontWeight: "bold",
          color: n.color,
          textShadow: `0 0 18px ${n.color}88`,
          letterSpacing: "0.12em",
          pointerEvents: "none",
          zIndex: 40,
          whiteSpace: "nowrap",
        }}>
          {n.text}
        </div>
      ))}

      {/* Botão voltar ao menu */}
      <button
        onClick={() => { resetGame(); setGameStarted(false); }}
        style={{
          position: "fixed",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(196,170,255,0.1)",
          border: "1px solid rgba(196,170,255,0.35)",
          color: "rgba(196,170,255,0.75)",
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "0.7rem",
          fontWeight: "bold",
          letterSpacing: "0.25em",
          padding: "5px 18px",
          borderRadius: 4,
          cursor: "pointer",
          zIndex: 50,
        }}
      >
        MENU
      </button>

      {/* Botões mobile */}
      {isTouchDevice && (
        <>
          {/* Jogador 1 — botões bottom-left */}
          <div style={{ position: "fixed", bottom: 20, left: 16, display: "flex", gap: 10, zIndex: 50 }}>
            <MobileBtn label="TROCAR" color="#56d1c4" onPress={rotate1} />
            <MobileBtn label="USAR" color="#56d1c4" onPress={shoot1} />
          </div>
          {/* Jogador 2 — botões bottom-right */}
          <div style={{ position: "fixed", bottom: 20, right: 16, display: "flex", gap: 10, zIndex: 50 }}>
            <MobileBtn label="USAR" color="#f5895e" onPress={shoot2} />
            <MobileBtn label="TROCAR" color="#f5895e" onPress={rotate2} />
          </div>
        </>
      )}

      {shots.map(s => (
        <Shot
          key={s.id}
          startX={s.startX}
          startY={s.startY}
          direction={s.direction}
          enemyRef={s.shooter === "player1" ? barra2Ref : barra1Ref}
          paused={isPortrait || winner !== null}
          onHit={() => {
            setShots(prev => prev.filter(x => x.id !== s.id));
            applyFreeze(opposite(s.shooter));
          }}
          onMiss={() => setShots(prev => prev.filter(x => x.id !== s.id))}
        />
      ))}

      {activeItems.map((item) => (
        <div
          key={item.instanceId}
          style={{
            position: "fixed",
            left: item.x - item.radius,
            top: item.y - item.radius,
            pointerEvents: "none",
          }}
        >
          <Item radius={item.radius} color={item.color} icon={item.icon} />
        </div>
      ))}

      {decoys.map(d => (
        <div key={d.id} style={{ position: "fixed", left: d.x - d.radius, top: d.y - d.radius, pointerEvents: "none", zIndex: 60 }}>
          <div style={{ width: d.radius * 2, height: d.radius * 2, borderRadius: "50%", backgroundColor: "#e8f4fb", border: "1.5px solid #e8f4fb", boxShadow: "0 0 8px rgba(200,235,255,0.28)", opacity: 0.9 }} />
        </div>
      ))}
    </div>
    </>
  );
}

const winBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.2)",
  color: "rgba(255,255,255,0.55)",
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "0.85rem",
  fontWeight: "bold",
  letterSpacing: "0.2em",
  padding: "10px 28px",
  borderRadius: 4,
  cursor: "pointer",
};

function BuffBar({ buff, align }: { buff: ActiveBuff; align: "left" | "right" }) {
  const Icon = buff.icon;
  const durationS = (buff.duration / 1000).toFixed(2);
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      flexDirection: align === "right" ? "row-reverse" : "row",
      gap: 5,
      width: 118,
    }}>
      <Icon size={10} color={buff.color} strokeWidth={2.5} />
      <span style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "0.58rem",
        color: buff.color,
        letterSpacing: "0.06em",
        width: 46,
        textAlign: align === "right" ? "right" : "left",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>{buff.label}</span>
      <div style={{
        flex: 1,
        height: 2,
        background: "rgba(255,255,255,0.07)",
        borderRadius: 2,
        overflow: "hidden",
      }}>
        <div
          key={buff.startedAt}
          style={{
            height: "100%",
            background: buff.color,
            width: "100%",
            borderRadius: 2,
            animation: `buff-shrink ${durationS}s linear forwards`,
            transformOrigin: align === "right" ? "right" : "left",
          }}
        />
      </div>
    </div>
  );
}

function MobileBtn({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      style={{
        background: color + "18",
        border: `1.5px solid ${color}55`,
        color: color,
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "0.7rem",
        fontWeight: "bold",
        letterSpacing: "0.1em",
        padding: "10px 16px",
        borderRadius: 6,
        cursor: "pointer",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        minWidth: 64,
      }}
    >
      {label}
    </button>
  );
}
