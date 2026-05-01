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
import {
  Shuffle,
  Gauge,
  TimerReset,
  Crosshair,
  Expand,
  Rabbit,
  Shield,
  Trophy,
  Snowflake,
  Zap,
  Flame,
  Maximize2,
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
};

type SpawnedItem = ItemEntry & {
  instanceId: string;
  x: number;
  y: number;
  radius: number;
};

type StoredSlot = Pick<ItemEntry, "icon" | "color" | "onCatch">;

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

  const barra1Ref = useRef<HTMLDivElement>(null);
  const barra2Ref = useRef<HTMLDivElement>(null);
  const shield1Ref = useRef<HTMLDivElement>(null);
  const shield2Ref = useRef<HTMLDivElement>(null);
  const bolaRef = useRef<HTMLDivElement>(null);
  const barra1VyRef = useRef(0);
  const barra2VyRef = useRef(0);

  const BALL_RADIUS = 20;
  const START_BALL_SPEED = 500;
  const BASE_PADDLE_HEIGHT = 200;
  const BUFF_DURATION_MS = 7000;
  const ITEM_RADIUS = 18;

  const [score, setScore] = useState([0, 0]);
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
  const [teleportY, setTeleportY] = useState<number | null>(null);
  const [activeItems, setActiveItems] = useState<SpawnedItem[]>([]);
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const timeoutByKeyRef = useRef<Record<string, number | null>>({});
  const buffCleanupRef = useRef<Record<string, number | null>>({});
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

  function onGoal(scored: PlayerId) {
    const amount = goalMultiplier[scored];
    if (scored === "player1") {
      setScore((prev) => [prev[0] + amount, prev[1]]);
    } else {
      setScore((prev) => [prev[0], prev[1] + amount]);
    }

    setGoalMultiplier({ player1: 1, player2: 1 });
    setBallDirectionWithSpeed(START_BALL_SPEED);
    prevBallCxRef.current = null;
    prevBallCyRef.current = null;
    cooldownRef.current = 30;
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
    // 50% chance: very slow (30-50%) | 50% chance: very fast (170-220%)
    const newSpeed = Math.random() < 0.5
      ? 150 + Math.random() * 100   // lento: 150-250 px/s
      : 750 + Math.random() * 300;  // rápido: 750-1050 px/s
    VxRef.current = Math.cos(angle) * newSpeed;
    VyRef.current = Math.sin(angle) * newSpeed;
  }

  function timerChange(player: PlayerId) {
    const key = `timer:${player}`;
    if (timeoutByKeyRef.current[key]) return; // limite por player
    const savedSpeed = Math.hypot(VxRef.current, VyRef.current);
    VxRef.current *= 0.45;
    VyRef.current *= 0.45;
    addBuff(key, "LENTO", TimerReset, "#91a7ff", player, 3500);
    timeoutByKeyRef.current[key] = window.setTimeout(() => {
      const currentSpeed = Math.hypot(VxRef.current, VyRef.current);
      if (currentSpeed > 0) {
        VxRef.current = VxRef.current / currentSpeed * savedSpeed;
        VyRef.current = VyRef.current / currentSpeed * savedSpeed;
      }
      timeoutByKeyRef.current[key] = null;
    }, 3500);
  }

  function shoot(player: PlayerId) {
    const boost = 380;
    const sign = player === "player1" ? 1 : -1;
    VxRef.current += boost * sign;
  }

  function speedBlue(player: PlayerId) {
    const key = `speed:${player}`;
    setTimedEffect(
      key, BUFF_DURATION_MS,
      () => setPlayerSpeedMultiplier(prev => ({ ...prev, [player]: 1.55 })),
      () => setPlayerSpeedMultiplier(prev => ({ ...prev, [player]: 1 })),
      { label: "VELOZ", icon: Rabbit, color: "#339af0", player }
    );
  }

  function sizeBlue(player: PlayerId) {
    const key = `size:${player}`;
    setTimedEffect(
      key, BUFF_DURATION_MS,
      () => setPlayerSizeMultiplier(prev => ({ ...prev, [player]: 1.6 })),
      () => setPlayerSizeMultiplier(prev => ({ ...prev, [player]: 1 })),
      { label: "BARRA+", icon: Expand, color: "#4dabf7", player }
    );
  }

  function sizeRed(player: PlayerId) {
    const enemy = opposite(player);
    const key = `size:${enemy}`;
    setTimedEffect(
      key, BUFF_DURATION_MS,
      () => setPlayerSizeMultiplier(prev => ({ ...prev, [enemy]: 0.7 })),
      () => setPlayerSizeMultiplier(prev => ({ ...prev, [enemy]: 1 })),
      { label: "BARRA-", icon: Expand, color: "#ff6b6b", player: enemy }
    );
    notify("▼ BARRA MENOR", "#ff6b6b", enemy);
  }

  function shield(player: PlayerId) {
    const key = `shield:${player}`;
    setTimedEffect(
      key, BUFF_DURATION_MS,
      () => setShieldActive(prev => ({ ...prev, [player]: true })),
      () => setShieldActive(prev => ({ ...prev, [player]: false })),
      { label: "ESCUDO", icon: Shield, color: "#63e6be", player }
    );
  }

  function goalMultiplierSkill(player: PlayerId) {
    const key = `goal:${player}`;
    setTimedEffect(
      key, BUFF_DURATION_MS,
      () => setGoalMultiplier(prev => ({ ...prev, [player]: 2 })),
      () => setGoalMultiplier(prev => ({ ...prev, [player]: 1 })),
      { label: "GOLO×2", icon: Trophy, color: "#fab005", player }
    );
  }

  // ── 5 novos efeitos ────────────────────────────────────────────────

  function bigBall(player: PlayerId) {
    // Limite: só 1 bola gigante activa de cada vez por player
    const key = `bigball:${player}`;
    if (timeoutByKeyRef.current[key]) return;
    setTimedEffect(
      key, 6000,
      () => setBallRadius(40),
      () => setBallRadius(BALL_RADIUS),
      { label: "BOLA+", icon: Maximize2, color: "#f5a623", player }
    );
  }

  function freeze(player: PlayerId) {
    const enemy = opposite(player);
    const key = `freeze:${enemy}`;
    setTimedEffect(
      key, 2800,
      () => setFrozen(prev => ({ ...prev, [enemy]: true })),
      () => setFrozen(prev => ({ ...prev, [enemy]: false })),
      { label: "GELO", icon: Snowflake, color: "#a8d8f0", player: enemy }
    );
    notify("❄ GELO", "#a8d8f0", enemy);
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
    // Limite por player: 1 teleporte de cada vez (cooldown igual ao spawn do próximo)
    const key = `teleport:${player}`;
    if (timeoutByKeyRef.current[key]) return;
    const margin = 80;
    const newY = Math.round(margin + Math.random() * (window.innerHeight - margin * 2 - BALL_RADIUS * 2));
    setTeleportY(newY);
    addBuff(key, "TELEP.", Zap, "#c0eb75", player, 1500);
    timeoutByKeyRef.current[key] = window.setTimeout(() => { timeoutByKeyRef.current[key] = null; }, 4000);
  }

  function turbine(player: PlayerId) {
    // Limite por player: não pode estar 2 turbines activos do mesmo player
    const key = `turbine:${player}`;
    if (timeoutByKeyRef.current[key]) return;

    const savedSpeed = Math.max(Math.hypot(VxRef.current, VyRef.current), START_BALL_SPEED);
    const currentSpeed = Math.hypot(VxRef.current, VyRef.current);
    const targetSpeed = 1050;

    if (currentSpeed > 0) {
      // Garante que a bola vai na direcção do inimigo (beneficia quem activou)
      const sign = player === "player1" ? 1 : -1;
      if (Math.sign(VxRef.current) !== sign) VxRef.current = -VxRef.current;
      const norm = Math.hypot(VxRef.current, VyRef.current);
      VxRef.current = VxRef.current / norm * targetSpeed;
      VyRef.current = VyRef.current / norm * targetSpeed;
    }

    addBuff(key, "TURBINE", Flame, "#ff7b54", player, 3000);
    timeoutByKeyRef.current[key] = window.setTimeout(() => {
      const speedNow = Math.hypot(VxRef.current, VyRef.current);
      if (speedNow > 0) {
        const target = Math.max(savedSpeed, START_BALL_SPEED);
        VxRef.current = VxRef.current / speedNow * target;
        VyRef.current = VyRef.current / speedNow * target;
      }
      timeoutByKeyRef.current[key] = null;
    }, 3000);
  }

  const itemPool: ItemEntry[] = [
    { id: "random-direction", icon: Shuffle,    color: "#ffd43b", onCatch: ()  => randomDirection() },
    { id: "random-velocity",  icon: Gauge,      color: "#74c0fc", onCatch: ()  => randomVelocity() },
    { id: "timer-change",     icon: TimerReset, color: "#91a7ff", onCatch: (p) => timerChange(p) },
    { id: "shoot",            icon: Crosshair,  color: "#fcc419", onCatch: (p) => shoot(p) },
    { id: "size-blue",        icon: Expand,     color: "#4dabf7", onCatch: (p) => sizeBlue(p) },
    { id: "size-red",         icon: Expand,     color: "#ff6b6b", onCatch: (p) => sizeRed(p) },
    { id: "speed-blue",       icon: Rabbit,     color: "#339af0", onCatch: (p) => speedBlue(p) },
    { id: "shield",           icon: Shield,     color: "#63e6be", onCatch: (p) => shield(p) },
    { id: "goal-multiplier",  icon: Trophy,     color: "#fab005", onCatch: (p) => goalMultiplierSkill(p) },
    { id: "big-ball",         icon: Maximize2,  color: "#f5a623", onCatch: (p) => bigBall(p) },
    { id: "freeze",           icon: Snowflake,  color: "#a8d8f0", onCatch: (p) => freeze(p) },
    { id: "invert",           icon: ArrowUpDown,color: "#f472b6", onCatch: (p) => invertControls(p) },
    { id: "teleport",         icon: Zap,        color: "#c0eb75", onCatch: (p) => teleport(p) },
    { id: "turbine",          icon: Flame,      color: "#ff7b54", onCatch: (p) => turbine(p) },
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
      const speed = Math.sqrt(VxRef.current ** 2 + VyRef.current ** 2) * 1.05;
      const angle = impact * (Math.PI / 3);
      VxRef.current = directionSign * Math.abs(speed * Math.cos(angle));
      VyRef.current = speed * Math.sin(angle) + barraVyRef.current * 0.5;
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
    function scheduleNextSpawn() {
      const delay = 10000 + Math.random() * 10000; // 10 a 20s
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
          const slotItem: StoredSlot = {
            icon: item.icon,
            color: item.color,
            onCatch: item.onCatch,
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
    };
  }, []);

  const paddleHeight1 = BASE_PADDLE_HEIGHT * playerSizeMultiplier.player1;
  const paddleHeight2 = BASE_PADDLE_HEIGHT * playerSizeMultiplier.player2;

  if (!gameStarted) {
    return <Menu onPlay={() => setGameStarted(true)} />;
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
        initialX={100}
        initialY={(window.innerHeight - paddleHeight1) / 2}
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
      >
        <Barra ref={barra1Ref} height={paddleHeight1} width={20} color="#56d1c4" glowColor="86,209,196" />
      </ManualMover>

      <ManualMover
        v={500 * playerSpeedMultiplier.player2}
        initialX={window.innerWidth - 100}
        initialY={(window.innerHeight - paddleHeight2) / 2}
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
      >
        <Barra ref={barra2Ref} height={paddleHeight2} width={20} color="#f5895e" glowColor="245,137,94" />
      </ManualMover>

      <AutoMover
        vxRef={VxRef}
        vyRef={VyRef}
        initialX={window.innerWidth / 2 - BALL_RADIUS}
        initialY={window.innerHeight / 2 - BALL_RADIUS}
        onGoal={onGoal}
        teleportY={teleportY}
      >
        <Bola ref={bolaRef} radius={ballRadius} />
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
        onClick={() => setGameStarted(false)}
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
    </div>
    </>
  );
}

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
