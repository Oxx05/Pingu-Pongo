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
import Shot from "./Shot.tsx";
import type { GameConfig } from "./gameTypes.ts";
import { DEFAULT_CONFIG } from "./gameTypes.ts";
import type { DataConnection } from "peerjs";
import { iconToId } from "./iconRegistry.ts";
import type { StateMsg } from "./peerTypes.ts";
import {
  Shuffle,
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
  Ghost,
  Copy,
  AlertCircle,
  Activity,
  ArrowLeftRight,
  Bomb,
  Magnet,
  TrendingUp,
  ArrowUpDown,
} from "lucide-react";

const isTouchDevice = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
const SLOW_FACTOR = 0.22;

type Brick = { id: string; x: number; y: number; w: number; h: number; color: string };

function initBricks(w: number, h: number): Brick[] {
  const cols = 5, rows = 4;
  const gap = 6;
  const bw = Math.max(48, Math.floor(w * 0.075));
  const bh = Math.max(20, Math.floor(h * 0.065));
  const totalW = cols * bw + (cols - 1) * gap;
  const totalH = rows * bh + (rows - 1) * gap;
  const startX = Math.floor((w - totalW) / 2);
  const startY = Math.floor((h - totalH) / 2);
  const rowColors = ["#ff6b6b", "#ff9f43", "#ffd43b", "#51cf66"];
  const bricks: Brick[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      bricks.push({
        id: `${r}-${c}`,
        x: startX + c * (bw + gap),
        y: startY + r * (bh + gap),
        w: bw,
        h: bh,
        color: rowColors[r],
      });
    }
  }
  return bricks;
}

type PlayerId = "player1" | "player2";

type PlayerMapNumber = Record<PlayerId, number>;
type PlayerMapBool = Record<PlayerId, boolean>;

type ItemEntry = {
  id: string;
  icon: LucideIcon;
  color: string;
  onCatch: (player: PlayerId) => void;
  canUse?: (player: PlayerId) => boolean;
  onBallCollide?: () => void;
};

type Decoy = { id: string; x: number; y: number; radius: number; vx: number; vy: number };

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

type GameProps = {
  config?: GameConfig;
  conn?: DataConnection | null;
  onBack?: () => void;
  p1GamepadIndex?: number;
  p2GamepadIndex?: number;
};

export default function Game({ config: configProp, conn, onBack, p1GamepadIndex, p2GamepadIndex }: GameProps = {}) {
  const [config] = useState<GameConfig>(configProp ?? DEFAULT_CONFIG);
  const configRef = useRef(config);
  const gameModeRef = useRef(config.mode);
  const [winner, setWinner] = useState<PlayerId | null>(null);

  const barra1Ref = useRef<HTMLDivElement>(null);
  const barra2Ref = useRef<HTMLDivElement>(null);
  const shield1Ref = useRef<HTMLDivElement>(null);
  const shield2Ref = useRef<HTMLDivElement>(null);
  const bolaRef = useRef<HTMLDivElement>(null);
  const barra1VyRef = useRef(0);
  const barra2VyRef = useRef(0);
  const barra1VxRef = useRef(0);  // portrait mode spin
  const barra2VxRef = useRef(0);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const BALL_RADIUS = isTouchDevice ? Math.round(Math.min(14, vh * 0.02)) : Math.round(Math.min(20, vh * 0.028));
  const BALL_RADIUS_BIG = Math.round(BALL_RADIUS * 2.2);
  const BALL_RADIUS_MINI = Math.round(BALL_RADIUS * 0.45);
  const START_BALL_SPEED = config.initialSpeed;
  const BASE_PADDLE_HEIGHT = isTouchDevice ? Math.round(Math.min(160, vh * 0.25)) : Math.round(Math.min(200, vh * 0.32));
  const BASE_PADDLE_WIDTH = isTouchDevice ? Math.round(Math.min(14, vh * 0.03)) : Math.round(Math.min(20, vh * 0.04));
  const ITEM_RADIUS = Math.round(Math.min(18, vh * 0.04));
  const PADDLE_OFFSET = Math.round(Math.min(100, Math.max(36, vw * 0.08)));
  // Portrait dimensions
  const PORT_PADDLE_W = Math.round(Math.min(130, vw * 0.33));
  const PORT_PADDLE_H = Math.round(Math.min(14, vw * 0.038));
  const PORT_PAD_OFF = Math.round(Math.min(60, vh * 0.08));

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
  const rallyHitsRef = useRef(0);
  const [rallyHits, setRallyHits] = useState(0);
  // Solo bricks
  const bricksRef = useRef<Brick[]>(config.mode === "solo" ? initBricks(vw, vh) : []);
  const [bricks, setBricks] = useState<Brick[]>(() => config.mode === "solo" ? initBricks(vw, vh) : []);

  useEffect(() => { current1Ref.current = current1; }, [current1]);
  useEffect(() => { current2Ref.current = current2; }, [current2]);
  useEffect(() => { next1Ref.current = next1; }, [next1]);
  useEffect(() => { next2Ref.current = next2; }, [next2]);
  useEffect(() => { ballGhostRef.current = ballGhost; }, [ballGhost]);
  useEffect(() => { winnerRef.current = winner; }, [winner]);
  useEffect(() => { shieldActiveRefH.current = shieldActive; }, [shieldActive]);
  useEffect(() => { frozenStateRef.current = frozen; }, [frozen]);
  const [activeItems, setActiveItems] = useState<SpawnedItem[]>([]);
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>([]);
  useEffect(() => { activeBuffsRef.current = activeBuffs; }, [activeBuffs]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  const decoyDataRef = useRef<Decoy[]>([]);
  const decoyRafRef  = useRef<number | null>(null);
  useEffect(() => {
    if (decoys.length === 0) {
      if (decoyRafRef.current !== null) { cancelAnimationFrame(decoyRafRef.current); decoyRafRef.current = null; }
      decoyDataRef.current = [];
      decoysRef.current    = [];
      return;
    }
    decoyDataRef.current = decoys.map(d => ({ ...d }));
    let lastT = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      const cvw = window.innerWidth;
      const cvh = window.innerHeight;
      decoyDataRef.current = decoyDataRef.current.map(d => {
        let { x, y, vx, vy, radius } = d;
        x += vx * dt;  y += vy * dt;
        if (x - radius < 0)   { x = radius;       vx =  Math.abs(vx); }
        if (x + radius > cvw) { x = cvw - radius;  vx = -Math.abs(vx); }
        if (y - radius < 0)   { y = radius;        vy =  Math.abs(vy); }
        if (y + radius > cvh) { y = cvh - radius;  vy = -Math.abs(vy); }
        const el = document.getElementById(`decoy-${d.id}`);
        if (el) el.style.transform = `translate3d(${Math.round(x - radius)}px,${Math.round(y - radius)}px,0)`;
        return { ...d, x, y, vx, vy };
      });
      decoysRef.current = decoyDataRef.current;
      decoyRafRef.current = requestAnimationFrame(tick);
    };
    decoyRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (decoyRafRef.current !== null) { cancelAnimationFrame(decoyRafRef.current); decoyRafRef.current = null; }
      decoysRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decoys.length]);

  const [isPortrait, setIsPortrait] = useState(() => window.innerWidth < window.innerHeight && window.innerWidth <= 900);
  const isPortraitRef = useRef(isPortrait);
  useEffect(() => { isPortraitRef.current = isPortrait; }, [isPortrait]);

  type ShotData = { id: string; startX: number; startY: number; direction: 1 | -1; shooter: PlayerId };
  const [shots, setShots] = useState<ShotData[]>([]);

  const timeoutByKeyRef = useRef<Record<string, number | null>>({});
  const buffCleanupRef = useRef<Record<string, number | null>>({});
  const isPausedRef = useRef(false);
  const slowCountRef = useRef(0);
  const slowSavedSpeedRef = useRef(0);
  const slowSavedPlayerSpeedRef = useRef<PlayerMapNumber>({ player1: 1, player2: 1 });
  const slowMaxSpeedRef = useRef(Infinity);
  const bigBallCountRef = useRef(0);
  const miniBallCountRef = useRef(0);
  const ghostCountRef = useRef(0);
  const fireActiveRef = useRef(false);
  const magnetRef = useRef<"player1" | "player2" | null>(null);
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

  const guestInputRef   = useRef({ up: false, down: false });
  const ballGhostRef    = useRef(false);
  const winnerRef       = useRef<PlayerId | null>(null);
  const activeBuffsRef  = useRef<ActiveBuff[]>([]);
  const decoysRef       = useRef<Decoy[]>([]);
  const notificationsRef = useRef<Notification[]>([]);
  const shieldActiveRefH = useRef<PlayerMapBool>({ player1: false, player2: false });
  const frozenStateRef  = useRef<PlayerMapBool>({ player1: false, player2: false });
  const shoot2Ref       = useRef<() => void>(() => {});
  const rotate2Ref      = useRef<() => void>(() => {});

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
    slowCountRef.current = 0;
    slowSavedSpeedRef.current = 0;
    slowSavedPlayerSpeedRef.current = { player1: 1, player2: 1 };
    bigBallCountRef.current = 0;
    miniBallCountRef.current = 0;
    ghostCountRef.current = 0;
    turbineCountRef.current = 0;
    turbineSavedSpeedRef.current = 0;
    fireActiveRef.current = false;
    magnetRef.current = null;
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
    rallyHitsRef.current = 0;
    setRallyHits(0);
    if (config.mode === "solo") {
      const newBricks = initBricks(window.innerWidth, window.innerHeight);
      bricksRef.current = newBricks;
      setBricks(newBricks);
    }
    setBallDirectionWithSpeed(START_BALL_SPEED);
    if (config.mode === "solo") {
      if (isPortraitRef.current) {
        VyRef.current = -Math.abs(VyRef.current); // portrait: go up toward bricks
      } else {
        VxRef.current = Math.abs(VxRef.current); // landscape: go right toward bricks
      }
    }
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
    // Solo mode: ball missed = game over
    if (gameModeRef.current === "solo") {
      setWinner("player2");
      return;
    }
    const amount = goalMultiplier[scored];
    const newScore: [number, number] = scored === "player1"
      ? [scoreRef.current[0] + amount, scoreRef.current[1]]
      : [scoreRef.current[0], scoreRef.current[1] + amount];
    scoreRef.current = newScore;
    setScore(newScore);
    setGoalMultiplier(prev => ({ ...prev, [scored]: 1 }));
    for (const p of ["player1", "player2"] as PlayerId[]) {
      const dk = `distort:${p}`;
      const dt = timeoutByKeyRef.current[dk];
      if (dt) { clearTimeout(dt); timeoutByKeyRef.current[dk] = null; }
      const db = buffCleanupRef.current[dk];
      if (db) { clearTimeout(db); buffCleanupRef.current[dk] = null; }
    }
    if (distortionIntervalRef.current !== null) {
      clearInterval(distortionIntervalRef.current);
      distortionIntervalRef.current = null;
    }
    distortionSavedSpeedRef.current = 0;
    setActiveBuffs(prev => prev.filter(b => !b.key.startsWith("distort:")));
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
    const minAbsCos = 0.3;
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

  function timerChange(player: PlayerId) {
    const key = `timer:${player}`;
    if (timeoutByKeyRef.current[key]) return;

    if (slowCountRef.current === 0) {
      slowSavedSpeedRef.current = Math.max(Math.hypot(VxRef.current, VyRef.current), START_BALL_SPEED);
      VxRef.current *= SLOW_FACTOR;
      VyRef.current *= SLOW_FACTOR;
      slowMaxSpeedRef.current = slowSavedSpeedRef.current * SLOW_FACTOR;
      slowSavedPlayerSpeedRef.current = { ...playerSpeedMultiplier };
      setPlayerSpeedMultiplier(prev => ({ player1: prev.player1 * SLOW_FACTOR, player2: prev.player2 * SLOW_FACTOR }));
    }
    slowCountRef.current++;

    addBuff(key, "CÂMARA", TimerReset, "#91a7ff", player, 4000);
    notify("⏱ CÂMARA LENTA", "#91a7ff", player);
    notify("⏱ CÂMARA LENTA", "#91a7ff", opposite(player));
    timeoutByKeyRef.current[key] = window.setTimeout(() => {
      slowCountRef.current--;
      if (slowCountRef.current === 0) {
        slowMaxSpeedRef.current = Infinity;
        const cur = Math.hypot(VxRef.current, VyRef.current);
        if (cur > 0) {
          VxRef.current = VxRef.current / cur * slowSavedSpeedRef.current;
          VyRef.current = VyRef.current / cur * slowSavedSpeedRef.current;
        }
        if (distortionIntervalRef.current !== null) {
          distortionSavedSpeedRef.current = slowSavedSpeedRef.current;
        }
        setPlayerSpeedMultiplier(slowSavedPlayerSpeedRef.current);
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
    const otherKey = `ghost:${opposite(player)}`;
    setTimedEffect(
      key, 5000,
      () => setBallGhost(true),
      () => { if (!timeoutByKeyRef.current[otherKey]) setBallGhost(false); },
      { label: "FANTASMA", icon: Ghost, color: "#c0eb75", player }
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
    if (player === "player1") {
      setCurrent1(c2);
      setNext1(n2);
      setCurrent2(n1);
      setNext2(null);
    } else {
      setCurrent2(c1);
      setNext2(n1);
      setCurrent1(n2);
      setNext1(null);
    }
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
        const restoreSpeed = Math.min(distortionSavedSpeedRef.current, slowMaxSpeedRef.current);
        VxRef.current = VxRef.current / cur * restoreSpeed;
        VyRef.current = VyRef.current / cur * restoreSpeed;
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
    const speed = Math.hypot(VxRef.current, VyRef.current);
    const newDecoys: Decoy[] = Array.from({ length: 3 }, (_, i) => {
      const angle = (Math.PI * 2 / 3) * i + Math.random() * 0.9;
      return {
        id: `decoy-${Date.now()}-${i}`,
        x: window.innerWidth  * (0.25 + Math.random() * 0.5),
        y: window.innerHeight * (0.2  + Math.random() * 0.6),
        radius: BALL_RADIUS,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });
    setDecoys(newDecoys);
    addBuff(key, "ECO", Copy, "#ffd43b", player, 8000);
    notify("👁 ECO — qual é a real?", "#ffd43b", opposite(player));
    timeoutByKeyRef.current[key] = window.setTimeout(() => {
      setDecoys([]);
      timeoutByKeyRef.current[key] = null;
    }, 8000);
  }

  function magnetItem(player: PlayerId) {
    const key = `magnet:${player}`;
    setTimedEffect(
      key, 5000,
      () => { magnetRef.current = player; },
      () => { if (magnetRef.current === player) magnetRef.current = null; },
      { label: "ÍMAN", icon: Magnet, color: "#51cf66", player }
    );
  }

  function fireBallItem(player: PlayerId) {
    const key = `fire:${player}`;
    const otherKey = `fire:${opposite(player)}`;
    setTimedEffect(
      key, 6000,
      () => { fireActiveRef.current = true; },
      () => { if (!timeoutByKeyRef.current[otherKey]) fireActiveRef.current = false; },
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
          const restoreSpeed = Math.min(turbineSavedSpeedRef.current, slowMaxSpeedRef.current);
          VxRef.current = VxRef.current / speedNow * restoreSpeed;
          VyRef.current = VyRef.current / speedNow * restoreSpeed;
        }
      }
      timeoutByKeyRef.current[key] = null;
    }, 3000);
  }

  const itemPool: ItemEntry[] = [
    { id: "random-direction", icon: Shuffle,      color: "#ffd43b", onCatch: ()  => randomDirection() },
    { id: "timer-change",     icon: TimerReset,   color: "#91a7ff", onCatch: (p) => timerChange(p) },
    { id: "reverse-x",        icon: Undo2,        color: "#ffd43b", onCatch: ()  => reverseX() },
    { id: "distortion",       icon: Activity,     color: "#74c0fc", onCatch: (p) => distortion(p) },
    { id: "size-blue",        icon: Expand,       color: "#4dabf7", onCatch: (p) => sizeBlue(p) },
    { id: "mega-barra",       icon: MoveVertical, color: "#4dabf7", onCatch: (p) => megaBarra(p) },
    { id: "speed-blue",       icon: Rabbit,       color: "#51cf66", onCatch: (p) => speedBlue(p) },
    { id: "shield",           icon: Shield,       color: "#63e6be", onCatch: (p) => shield(p) },
    { id: "goal-multiplier",  icon: Trophy,       color: "#fab005", onCatch: (p) => goalMultiplierSkill(p) },
    { id: "big-ball",         icon: Maximize2,    color: "#4dabf7", onCatch: (p) => bigBall(p) },
    { id: "mini-ball",        icon: Minimize2,    color: "#51cf66", onCatch: (p) => miniBall(p) },
    { id: "teleport",         icon: Zap,          color: "#c0eb75", onCatch: (p) => teleport(p), canUse: (p) => isBallInMyHalf(p) },
    { id: "turbine",          icon: Flame,        color: "#ff9f43", onCatch: (p) => turbine(p) },
    { id: "ghost-ball",       icon: Ghost,        color: "#c0eb75", onCatch: (p) => ghostBall(p) },
    { id: "echo",             icon: Copy,         color: "#ffd43b", onCatch: (p) => echoItem(p) },
    { id: "magnet",           icon: Magnet,       color: "#51cf66", onCatch: (p) => magnetItem(p) },
    { id: "fire-ball",        icon: TrendingUp,   color: "#ff7b54", onCatch: (p) => fireBallItem(p) },
    { id: "swap-items",       icon: ArrowLeftRight,color: "#74c0fc",onCatch: (p) => swapItems(p) },
    { id: "size-red",         icon: Expand,       color: "#ff6b6b", onCatch: (p) => sizeRed(p) },
    { id: "speed-red",        icon: Turtle,       color: "#ff6b6b", onCatch: (p) => speedRed(p) },
    { id: "freeze",           icon: Snowflake,    color: "#ff4757", onCatch: (p) => freeze(p) },
    { id: "invert",           icon: ArrowUpDown,  color: "#ff6348", onCatch: (p) => invertControls(p) },
    { id: "rob-item",         icon: Scissors,     color: "#ff6b6b", onCatch: (p) => robItem(p) },
    { id: "panic",            icon: AlertCircle,  color: "#ff6348", onCatch: (p) => panicItem(p) },
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
    prevCx: number, prevCy: number, cx: number, cy: number,
    faceX: number, yMin: number, yMax: number, approachingFromRight: boolean
  ): number | null {
    const crossed = approachingFromRight ? prevCx >= faceX && cx < faceX : prevCx <= faceX && cx > faceX;
    if (!crossed) return null;
    const t = (faceX - prevCx) / (cx - prevCx);
    const cyAtCross = prevCy + t * (cy - prevCy);
    return cyAtCross >= yMin && cyAtCross <= yMax ? cyAtCross : null;
  }

  // Portrait: swept detection on Y face
  function sweptFaceCrossingY(
    prevCy: number, prevCx: number, cy: number, cx: number,
    faceY: number, xMin: number, xMax: number, approachingFromAbove: boolean
  ): number | null {
    const crossed = approachingFromAbove ? prevCy <= faceY && cy > faceY : prevCy >= faceY && cy < faceY;
    if (!crossed) return null;
    const t = (faceY - prevCy) / (cy - prevCy);
    const cxAtCross = prevCx + t * (cx - prevCx);
    return cxAtCross >= xMin && cxAtCross <= xMax ? cxAtCross : null;
  }

  function getCollisionSide(
    cx: number, cy: number, r: number, rx: number, ry: number, rw: number, rh: number
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
    if (config.mode === "solo") {
      if (isPortrait) {
        VyRef.current = -Math.abs(VyRef.current);
      } else {
        VxRef.current = Math.abs(VxRef.current);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => { isPausedRef.current = winner !== null; }, [winner]);

  useEffect(() => {
    prevBallCxRef.current = null;
    prevBallCyRef.current = null;

    if (collisionRafRef.current !== null) {
      cancelAnimationFrame(collisionRafRef.current);
      collisionRafRef.current = null;
    }

    function applyFrontCollision(
      cy: number, barraCenterY: number, barraHalfH: number,
      barraVyRef: { current: number }, directionSign: 1 | -1
    ) {
      const impact = Math.max(-1, Math.min(1, (cy - barraCenterY) / barraHalfH));
      const fireMult = fireActiveRef.current ? 1.38 : 1.0;
      const baseSpeed = Math.sqrt(VxRef.current ** 2 + VyRef.current ** 2) * fireMult;
      const progressionFactor = 1 + configRef.current.speedProgression;
      const maxSpeed = configRef.current.initialSpeed * 2.5;
      const speed = Math.min(baseSpeed * progressionFactor, maxSpeed);
      const angle = impact * (Math.PI / 3);
      VxRef.current = directionSign * Math.abs(speed * Math.cos(angle));
      VyRef.current = speed * Math.sin(angle) + barraVyRef.current * 0.008;
      vyAccelRef.current = configRef.current.spinEnabled ? -barraVyRef.current * 0.5 : 0;
      const totalSpeed = Math.hypot(VxRef.current, VyRef.current);
      if (totalSpeed > 0) {
        const minVx = totalSpeed * 0.28;
        if (Math.abs(VxRef.current) < minVx) {
          VxRef.current = directionSign * minVx;
          VyRef.current = Math.sign(VyRef.current || 1) * Math.sqrt(Math.max(0, totalSpeed ** 2 - minVx ** 2));
        }
      }
    }

    function applyFrontCollisionPortrait(
      cx: number, barraCenterX: number, barraHalfW: number,
      barraVxRef: { current: number }, goingUp: boolean
    ) {
      const impact = Math.max(-1, Math.min(1, (cx - barraCenterX) / barraHalfW));
      const fireMult = fireActiveRef.current ? 1.38 : 1.0;
      const baseSpeed = Math.sqrt(VxRef.current ** 2 + VyRef.current ** 2) * fireMult;
      const progressionFactor = 1 + configRef.current.speedProgression;
      const maxSpeed = configRef.current.initialSpeed * 2.5;
      const speed = Math.min(baseSpeed * progressionFactor, maxSpeed);
      const angle = impact * (Math.PI / 3);
      VyRef.current = (goingUp ? -1 : 1) * Math.abs(speed * Math.cos(angle));
      VxRef.current = speed * Math.sin(angle) + barraVxRef.current * 0.008;
      vyAccelRef.current = configRef.current.spinEnabled ? -barraVxRef.current * 0.5 : 0;
      const totalSpeed = Math.hypot(VxRef.current, VyRef.current);
      if (totalSpeed > 0) {
        const minVy = totalSpeed * 0.28;
        if (Math.abs(VyRef.current) < minVy) {
          VyRef.current = (goingUp ? -1 : 1) * minVy;
          VxRef.current = Math.sign(VxRef.current || 1) * Math.sqrt(Math.max(0, totalSpeed ** 2 - minVy ** 2));
        }
      }
    }

    function applyTopBottomCollision(cy: number, barraCenterY: number) {
      VyRef.current = cy < barraCenterY ? -Math.abs(VyRef.current) : Math.abs(VyRef.current);
    }

    function collideWithRect(
      cx: number, cy: number, r: number, prevCx: number | null, prevCy: number | null,
      rect: DOMRect, vyRef: { current: number }, directionSign: 1 | -1, approachingFromRight: boolean
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

    function collideWithRectPortrait(
      cx: number, cy: number, r: number, prevCx: number | null, prevCy: number | null,
      rect: DOMRect, vxRef: { current: number }, goingUp: boolean, approachingFromAbove: boolean
    ): boolean {
      const overlap = circleOverlapsRect(cx, cy, r, rect.left, rect.top, rect.width, rect.height);

      if (!overlap && prevCx !== null && prevCy !== null) {
        const faceY = approachingFromAbove ? rect.top : rect.bottom;
        const cxAtCross = sweptFaceCrossingY(prevCy, prevCx, cy, cx, faceY, rect.left - r, rect.right + r, approachingFromAbove);
        if (cxAtCross !== null) {
          applyFrontCollisionPortrait(cxAtCross, rect.left + rect.width / 2, rect.width / 2, vxRef, goingUp);
          cooldownRef.current = 20;
          return true;
        }
      }

      if (overlap) {
        const side = getCollisionSide(cx, cy, r, rect.left, rect.top, rect.width, rect.height);
        if (side === "topbottom") {
          // Main face of horizontal paddle
          applyFrontCollisionPortrait(cx, rect.left + rect.width / 2, rect.width / 2, vxRef, goingUp);
        } else {
          // Side of paddle — just deflect Vy
          VyRef.current = goingUp ? -Math.abs(VyRef.current) : Math.abs(VyRef.current);
        }
        cooldownRef.current = 20;
        return true;
      }

      return false;
    }

    function checkCollision() {
      const isSolo = gameModeRef.current === "solo";
      if (!bolaRef.current || !barra1Ref.current) {
        collisionRafRef.current = requestAnimationFrame(checkCollision);
        return;
      }
      if (!isSolo && !barra2Ref.current) {
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

      if (isPortraitRef.current) {
        // Portrait: P1 at bottom (goingUp=true, approachingFromAbove=true — ball comes from above)
        if (collideWithRectPortrait(cx, cy, r, prevCx, prevCy, barra1Rect, barra1VxRef, true, true)) {
          lastTouchRef.current = "player1";
          if (gameModeRef.current === "rally") { rallyHitsRef.current++; setRallyHits(rallyHitsRef.current); }
          collisionRafRef.current = requestAnimationFrame(checkCollision);
          return;
        }
        if (!isSolo && barra2Ref.current) {
          const barra2Rect = barra2Ref.current.getBoundingClientRect();
          // P2 at top (goingUp=false, approachingFromAbove=false — ball comes from below)
          if (collideWithRectPortrait(cx, cy, r, prevCx, prevCy, barra2Rect, barra2VxRef, false, false)) {
            lastTouchRef.current = "player2";
            if (gameModeRef.current === "rally") { rallyHitsRef.current++; setRallyHits(rallyHitsRef.current); }
            collisionRafRef.current = requestAnimationFrame(checkCollision);
            return;
          }
        }
      } else {
        // Landscape
        if (collideWithRect(cx, cy, r, prevCx, prevCy, barra1Rect, barra1VyRef, 1, true)) {
          lastTouchRef.current = "player1";
          if (gameModeRef.current === "rally") { rallyHitsRef.current++; setRallyHits(rallyHitsRef.current); }
          collisionRafRef.current = requestAnimationFrame(checkCollision);
          return;
        }

        if (!isSolo && barra2Ref.current) {
          const barra2Rect = barra2Ref.current.getBoundingClientRect();
          if (collideWithRect(cx, cy, r, prevCx, prevCy, barra2Rect, barra2VyRef, -1, false)) {
            lastTouchRef.current = "player2";
            if (gameModeRef.current === "rally") { rallyHitsRef.current++; setRallyHits(rallyHitsRef.current); }
            collisionRafRef.current = requestAnimationFrame(checkCollision);
            return;
          }
        }
      }

      if (shieldActive.player1 && shield1Ref.current) {
        const shield1Rect = shield1Ref.current.getBoundingClientRect();
        if (collideWithRect(cx, cy, r, prevCx, prevCy, shield1Rect, { current: 0 }, 1, true)) {
          lastTouchRef.current = "player1";
          collisionRafRef.current = requestAnimationFrame(checkCollision);
          setShieldActive((prev) => ({ ...prev, player1: false }));
          return;
        }
      }

      if (shieldActive.player2 && shield2Ref.current) {
        const shield2Rect = shield2Ref.current.getBoundingClientRect();
        if (collideWithRect(cx, cy, r, prevCx, prevCy, shield2Rect, { current: 0 }, -1, false)) {
          lastTouchRef.current = "player2";
          collisionRafRef.current = requestAnimationFrame(checkCollision);
          setShieldActive((prev) => ({ ...prev, player2: false }));
          return;
        }
      }

      // Solo: check brick collision
      if (gameModeRef.current === "solo" && bricksRef.current.length > 0) {
        for (const brick of bricksRef.current) {
          if (circleOverlapsRect(cx, cy, r, brick.x, brick.y, brick.w, brick.h)) {
            const side = getCollisionSide(cx, cy, r, brick.x, brick.y, brick.w, brick.h);
            if (side === "topbottom") {
              VyRef.current = cy < brick.y + brick.h / 2 ? -Math.abs(VyRef.current) : Math.abs(VyRef.current);
            } else {
              VxRef.current = cx < brick.x + brick.w / 2 ? -Math.abs(VxRef.current) : Math.abs(VxRef.current);
            }
            const hitId = brick.id;
            const brickCx = brick.x + brick.w / 2;
            const brickCy = brick.y + brick.h / 2;
            bricksRef.current = bricksRef.current.filter(b => b.id !== hitId);
            setBricks(bricksRef.current.slice());
            if (bricksRef.current.length === 0) setWinner("player1");

            // 10% chance to drop an item
            if (Math.random() < 0.10) {
              const pool = itemPoolRef.current.filter(it => !it.onBallCollide);
              if (pool.length > 0) {
                const dropped = pool[Math.floor(Math.random() * pool.length)];
                setActiveItems(prev => [...prev, {
                  ...dropped,
                  instanceId: `drop-${Date.now()}-${Math.random()}`,
                  x: brickCx,
                  y: brickCy,
                  radius: ITEM_RADIUS,
                }]);
              }
            }

            cooldownRef.current = 8;
            collisionRafRef.current = requestAnimationFrame(checkCollision);
            return;
          }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shieldActive]);

  useEffect(() => {
    if (config.mode === "solo") return;
    function scheduleNextSpawn() {
      const base = configRef.current.spawnDelay;
      const delay = base + Math.random() * base * 0.5;
      itemSpawnTimeoutRef.current = window.setTimeout(() => {
        if (winnerRef.current !== null) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (next1) { setCurrent1(next1); setNext1(null); } else { setCurrent1(null); }
    current1.onCatch("player1");
  }

  function shoot2() {
    if (!current2) return;
    if (current2.canUse && !current2.canUse("player2")) {
      notify("⚠ BOLA NO LADO ERRADO", "#ffd43b", "player2");
      return;
    }
    if (next2) { setCurrent2(next2); setNext2(null); } else { setCurrent2(null); }
    current2.onCatch("player2");
  }
  shoot2Ref.current = shoot2;

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
  rotate2Ref.current = rotate2;

  useEffect(() => {
    if (!conn) return;
    const onData = (raw: unknown) => {
      const msg = raw as { type: string; up?: boolean; down?: boolean; action?: string };
      if (msg.type === "input") {
        guestInputRef.current.up   = !!msg.up;
        guestInputRef.current.down = !!msg.down;
      } else if (msg.type === "action") {
        if (msg.action === "shoot")  shoot2Ref.current();
        if (msg.action === "rotate") rotate2Ref.current();
      }
    };
    conn.on("data", onData);
    return () => { conn.off("data", onData); };
  }, [conn]);

  useEffect(() => {
    if (!conn) return;
    let rafId: number;
    const tick = () => {
      if (!conn.open) { rafId = requestAnimationFrame(tick); return; }
      const cvw = window.innerWidth;
      const cvh = window.innerHeight;
      const ballEl = bolaRef.current;
      const p1El   = barra1Ref.current;
      const p2El   = barra2Ref.current;
      if (!ballEl || !p1El || !p2El) { rafId = requestAnimationFrame(tick); return; }
      const bR  = ballEl.getBoundingClientRect();
      const p1R = p1El.getBoundingClientRect();
      const p2R = p2El.getBoundingClientRect();
      const state: StateMsg = {
        type: "state",
        bx: bR.left / cvw, by: bR.top / cvh, br: (bR.width / 2) / cvh, bg: ballGhostRef.current,
        p1y: p1R.top / cvh, p2y: p2R.top / cvh, p1h: p1R.height / cvh, p2h: p2R.height / cvh, pw: p1R.width,
        score: scoreRef.current as [number, number],
        winner: winnerRef.current,
        current1: current1Ref.current ? { iconId: iconToId(current1Ref.current.icon), color: current1Ref.current.color } : null,
        current2: current2Ref.current ? { iconId: iconToId(current2Ref.current.icon), color: current2Ref.current.color } : null,
        next1: next1Ref.current ? { iconId: iconToId(next1Ref.current.icon), color: next1Ref.current.color } : null,
        next2: next2Ref.current ? { iconId: iconToId(next2Ref.current.icon), color: next2Ref.current.color } : null,
        items: activeItemsRef.current.map(it => ({ id: it.instanceId, x: it.x / cvw, y: it.y / cvh, r: it.radius / cvh, color: it.color, iconId: iconToId(it.icon) })),
        buffs: activeBuffsRef.current.map(b => ({ key: b.key, label: b.label, iconId: iconToId(b.icon), color: b.color, player: b.player, startedAt: b.startedAt, duration: b.duration })),
        decoys: decoysRef.current.map(d => ({ id: d.id, x: d.x / cvw, y: d.y / cvh, r: d.radius / cvh })),
        notifs: notificationsRef.current.map(n => ({ id: n.id, text: n.text, color: n.color, player: n.player })),
        s1: shieldActiveRefH.current.player1, s2: shieldActiveRefH.current.player2,
        f1: frozenStateRef.current.player1,  f2: frozenStateRef.current.player2,
      };
      try { conn.send(state); } catch {}
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [conn]);

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
  const portPaddleW1 = Math.round(PORT_PADDLE_W * playerSizeMultiplier.player1);
  const portPaddleW2 = Math.round(PORT_PADDLE_W * playerSizeMultiplier.player2);

  // Solo win conditions
  const soloWon = config.mode === "solo" && winner === "player1";
  const soloLost = config.mode === "solo" && winner === "player2";

  return (
    <>
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
          color: soloWon ? "#ffd43b" : soloLost ? "#f5895e" : winner === "player1" ? "#56d1c4" : "#f5895e",
          textShadow: `0 0 32px ${soloWon ? "#ffd43b88" : soloLost ? "#f5895e88" : winner === "player1" ? "#56d1c488" : "#f5895e88"}`,
          letterSpacing: "0.15em",
          textAlign: "center",
        }}>
          {soloWon
            ? <>TODOS OS BLOCOS<br /><span style={{ fontSize: "0.6em", color: "rgba(255,255,255,0.72)", fontWeight: "normal" }}>DESTRUÍDOS!</span></>
            : soloLost
            ? <>PERDESTE!</>
            : <>{winner === "player1" ? "JOGADOR 1" : "JOGADOR 2"}<br /><span style={{ fontSize: "0.6em", color: "rgba(255,255,255,0.72)", fontWeight: "normal" }}>GANHOU!</span></>
          }
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <button
            onClick={() => { resetGame(); onBack?.(); }}
            style={winBtnStyle}
          >MENU</button>
          <button
            onClick={() => { resetGame(); }}
            style={{ ...winBtnStyle, background: "rgba(86,209,196,0.1)", borderColor: "rgba(86,209,196,0.6)", color: "#56d1c4" }}
          >JOGAR DE NOVO</button>
        </div>
      </div>
    )}

    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {config.mode === "pong" ? (
        <Pontuacao score1={score[0]} score2={score[1]} />
      ) : config.mode === "rally" ? (
        <div style={modeHudStyle}>RALLY — {rallyHits} {rallyHits === 1 ? "toque" : "toques"}</div>
      ) : config.mode === "solo" ? (
        <div style={modeHudStyle}>{bricks.length} bloco{bricks.length !== 1 ? "s" : ""}</div>
      ) : null}

      {(config.mode === "pong" || config.mode === "rally") && (
        <StoredItems
          left={{ current: current1 ?? undefined, next: next1 ?? undefined }}
          right={{ current: current2 ?? undefined, next: next2 ?? undefined }}
        />
      )}

      {shieldActive.player1 && (
        <div
          ref={shield1Ref}
          style={isPortrait ? {
            position: "fixed",
            bottom: PORT_PAD_OFF + PORT_PADDLE_H,
            left: "20%",
            width: "60%",
            height: 8,
            borderRadius: 999,
            background: "rgba(86,209,196,0.35)",
            boxShadow: "0 0 16px rgba(86,209,196,0.5)",
          } : {
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
          style={isPortrait ? {
            position: "fixed",
            top: PORT_PAD_OFF + PORT_PADDLE_H,
            left: "20%",
            width: "60%",
            height: 8,
            borderRadius: 999,
            background: "rgba(245,137,94,0.35)",
            boxShadow: "0 0 16px rgba(245,137,94,0.5)",
          } : {
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
        key={isPortrait ? "p1-portrait" : "p1-landscape"}
        v={500 * playerSpeedMultiplier.player1}
        initialX={isPortrait ? (vw - portPaddleW1) / 2 : PADDLE_OFFSET}
        initialY={isPortrait ? vh - PORT_PAD_OFF - PORT_PADDLE_H : (vh - paddleHeight1) / 2}
        elementHeight={isPortrait ? portPaddleW1 : paddleHeight1}
        horizontal={isPortrait}
        keys={new Map([
          ["w", "up"],
          ["s", "down"],
          [" ", "shoot"],
          ["d", "rotate"]
        ])}
        onVelocityChange={(v) => {
          if (isPortrait) barra1VxRef.current = v;
          else barra1VyRef.current = v;
        }}
        onShoot={shoot1}
        onRotate={rotate1}
        touchZone={isPortrait ? "bottom" : "left"}
        gamepadIndex={p1GamepadIndex}
        frozen={frozen.player1}
        inverted={inverted.player1}
        driftForce={drift.player1}
        paused={winner !== null}
      >
        <Barra ref={barra1Ref}
          height={isPortrait ? PORT_PADDLE_H : paddleHeight1}
          width={isPortrait ? portPaddleW1 : BASE_PADDLE_WIDTH}
          color="#56d1c4" glowColor="86,209,196" />
      </ManualMover>

      {config.mode !== "solo" && (
        <ManualMover
          key={isPortrait ? "p2-portrait" : "p2-landscape"}
          v={500 * playerSpeedMultiplier.player2}
          initialX={isPortrait ? (vw - portPaddleW2) / 2 : vw - PADDLE_OFFSET - BASE_PADDLE_WIDTH}
          initialY={isPortrait ? PORT_PAD_OFF : (vh - paddleHeight2) / 2}
          elementHeight={isPortrait ? portPaddleW2 : paddleHeight2}
          horizontal={isPortrait}
          keys={conn ? new Map() : new Map([
            ["ArrowUp", "up"],
            ["ArrowDown", "down"],
            ["Enter", "shoot"],
            ["ArrowRight", "rotate"]
          ])}
          onVelocityChange={(v) => {
            if (isPortrait) barra2VxRef.current = v;
            else barra2VyRef.current = v;
          }}
          onShoot={shoot2}
          onRotate={rotate2}
          touchZone={isPortrait ? "top" : (conn ? undefined : "right")}
          gamepadIndex={conn ? undefined : p2GamepadIndex}
          frozen={frozen.player2}
          inverted={inverted.player2}
          driftForce={drift.player2}
          paused={winner !== null}
          externalInput={conn ? guestInputRef : null}
        >
          <Barra ref={barra2Ref}
            height={isPortrait ? PORT_PADDLE_H : paddleHeight2}
            width={isPortrait ? portPaddleW2 : BASE_PADDLE_WIDTH}
            color="#f5895e" glowColor="245,137,94" />
        </ManualMover>
      )}

      <AutoMover
        key={isPortrait ? "ball-portrait" : "ball-landscape"}
        vxRef={VxRef}
        vyRef={VyRef}
        initialX={!isPortrait && config.mode === "solo" ? PADDLE_OFFSET + BASE_PADDLE_WIDTH + 20 : vw / 2 - BALL_RADIUS}
        initialY={isPortrait && config.mode === "solo" ? vh - PORT_PAD_OFF - PORT_PADDLE_H - 40 : vh / 2 - BALL_RADIUS}
        onGoal={onGoal}
        teleportY={teleportY}
        vyAccelRef={vyAccelRef}
        magnetRef={magnetRef}
        maxSpeedRef={slowMaxSpeedRef}
        paused={winner !== null}
        bounceLeft={config.mode === "rally"}
        bounceRight={config.mode !== "pong"}
        portraitMode={isPortrait}
        bounceTop={isPortrait && (config.mode === "rally" || config.mode === "solo")}
        bounceBottom={isPortrait && config.mode === "rally"}
        onWallBounce={() => {
          if (gameModeRef.current === "rally") {
            rallyHitsRef.current = 0;
            setRallyHits(0);
          }
        }}
      >
        <Bola ref={bolaRef} radius={ballRadius} ghost={ballGhost} />
      </AutoMover>

      {/* Buffs activos — player 1 */}
      <div style={{ position: "fixed", left: 16, top: 102, display: "flex", flexDirection: "column", gap: 5, zIndex: 30, pointerEvents: "none" }}>
        {activeBuffs.filter(b => b.player === "player1").map(b => (
          <BuffBar key={`${b.key}-${b.startedAt}`} buff={b} align="left" />
        ))}
      </div>

      {/* Buffs activos — player 2 */}
      <div style={{ position: "fixed", right: 16, top: 102, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, zIndex: 30, pointerEvents: "none" }}>
        {activeBuffs.filter(b => b.player === "player2").map(b => (
          <BuffBar key={`${b.key}-${b.startedAt}`} buff={b} align="right" />
        ))}
      </div>

      {/* Notificações */}
      {(["player1", "player2"] as PlayerId[]).map(player => {
        const pNotifs = notifications.filter(n => n.player === player);
        if (pNotifs.length === 0) return null;
        return (
          <div key={player} style={{
            position: "fixed",
            top: "35%",
            ...(player === "player1" ? { left: "8%" } : { right: "8%" }),
            display: "flex",
            flexDirection: "column",
            gap: 6,
            pointerEvents: "none",
            zIndex: 40,
          }}>
            {pNotifs.map(n => (
              <div key={n.id} className="skill-notif" style={{
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: "clamp(0.85rem, 2vw, 1.15rem)",
                fontWeight: "bold",
                color: n.color,
                textShadow: `0 0 18px ${n.color}88`,
                letterSpacing: "0.12em",
                whiteSpace: "nowrap",
              }}>
                {n.text}
              </div>
            ))}
          </div>
        );
      })}

      {/* Botão voltar ao menu */}
      <button
        onClick={() => { resetGame(); onBack?.(); }}
        style={{
          position: "fixed",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(196,170,255,0.1)",
          border: "1px solid rgba(196,170,255,0.35)",
          color: "rgba(196,170,255,0.75)",
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "clamp(0.65rem, 1.2vw, 0.85rem)",
          fontWeight: "bold",
          letterSpacing: "0.25em",
          padding: "clamp(5px, 1vh, 10px) clamp(14px, 2vw, 28px)",
          minHeight: 36,
          minWidth: 80,
          borderRadius: 4,
          cursor: "pointer",
          zIndex: 50,
          whiteSpace: "nowrap",
        }}
      >
        MENU
      </button>

      {/* Botões mobile — landscape only, modes with items */}
      {isTouchDevice && !isPortrait && (config.mode === "pong" || config.mode === "rally" || config.mode === "solo") && (
        <>
          <div style={{ position: "fixed", bottom: 20, left: 16, display: "flex", gap: 10, zIndex: 50 }}>
            <MobileBtn label="TROCAR" color="#56d1c4" onPress={rotate1} />
            <MobileBtn label="USAR" color="#56d1c4" onPress={shoot1} />
          </div>
          {!conn && config.mode !== "solo" && (
            <div style={{ position: "fixed", bottom: 20, right: 16, display: "flex", gap: 10, zIndex: 50 }}>
              <MobileBtn label="USAR" color="#f5895e" onPress={shoot2} />
              <MobileBtn label="TROCAR" color="#f5895e" onPress={rotate2} />
            </div>
          )}
        </>
      )}

      {shots.map(s => (
        <Shot
          key={s.id}
          startX={s.startX}
          startY={s.startY}
          direction={s.direction}
          enemyRef={s.shooter === "player1" ? barra2Ref : barra1Ref}
          paused={winner !== null}
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
        <div
          key={d.id}
          id={`decoy-${d.id}`}
          style={{ position: "fixed", left: 0, top: 0, transform: `translate3d(${Math.round(d.x - ballRadius)}px,${Math.round(d.y - ballRadius)}px,0)`, willChange: "transform", pointerEvents: "none", zIndex: 60 }}
        >
          <Bola radius={ballRadius} ghost={ballGhost} />
        </div>
      ))}

      {/* Solo bricks */}
      {config.mode === "solo" && bricks.map(brick => (
        <div
          key={brick.id}
          style={{
            position: "fixed",
            left: brick.x,
            top: brick.y,
            width: brick.w,
            height: brick.h,
            background: brick.color + "99",
            border: `2px solid ${brick.color}`,
            borderRadius: 4,
            boxSizing: "border-box" as const,
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
    </>
  );
}

const modeHudStyle: React.CSSProperties = {
  position: "fixed",
  top: 14,
  left: "50%",
  transform: "translateX(-50%)",
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "clamp(0.85rem, 2vw, 1.1rem)",
  fontWeight: "bold",
  color: "rgba(255,255,255,0.75)",
  letterSpacing: "0.12em",
  pointerEvents: "none",
  whiteSpace: "nowrap",
  zIndex: 20,
};

const winBtnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.45)",
  color: "rgba(255,255,255,0.88)",
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "0.9rem",
  fontWeight: "bold",
  letterSpacing: "0.2em",
  padding: "12px 32px",
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
