"use client";

import { useEffect, useRef } from "react";

type AutoMoverProps = {
  vxRef: { current: number };
  vyRef: { current: number };
  initialX?: number;
  initialY?: number;
  onGoal?: (scored: "player1" | "player2") => void;
  teleportY?: number | null;
  vyAccelRef?: { current: number };
  magnetRef?: { current: boolean };
  paused?: boolean;
  children: React.ReactNode;
};

export default function AutoMover({ vxRef, vyRef, initialX = 40, initialY = 40, onGoal, teleportY, vyAccelRef, magnetRef, paused = false, children }: AutoMoverProps) {
  const posRef = useRef({ x: initialX, y: initialY });
  const sizeRef = useRef({ w: 0, h: 0 });
  const elRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const onGoalRef = useRef(onGoal);
  onGoalRef.current = onGoal;

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    sizeRef.current = { w: rect.width, h: rect.height };
  }, [children]);

  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const lastTeleportYRef = useRef<number | null>(null);
  useEffect(() => {
    if (teleportY !== null && teleportY !== undefined && teleportY !== lastTeleportYRef.current) {
      lastTeleportYRef.current = teleportY;
      posRef.current.y = teleportY;
    }
  }, [teleportY]);

  useEffect(() => {
    const tick = (t: number) => {
      if (pausedRef.current) {
        lastRef.current = t; // keep time in sync so dt doesn't spike on resume
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (lastRef.current == null) lastRef.current = t;
      const dt = Math.min((t - lastRef.current) / 1000, 0.05);
      lastRef.current = t;

      // Fallback size measurement if not yet measured
      if (sizeRef.current.w === 0 && elRef.current) {
        const r = elRef.current.getBoundingClientRect();
        if (r.width > 0) sizeRef.current = { w: r.width, h: r.height };
      }

      // Aplicar spin (aceleração em Y impartida pela barra)
      if (vyAccelRef) {
        vyRef.current += vyAccelRef.current * dt;
        // Natural decay: half-life ~0.4s so spin fades between hits
        vyAccelRef.current *= Math.exp(-2.2 * dt);
        // Cap: garante que |Vx| >= 25% da velocidade total (evita trajectória vertical)
        const totalSpeed = Math.hypot(vxRef.current, vyRef.current);
        if (totalSpeed > 0) {
          const maxVy = totalSpeed * 0.968;
          if (Math.abs(vyRef.current) > maxVy) {
            vyRef.current = Math.sign(vyRef.current) * maxVy;
          }
        }
      }
      // Magnetism: dampen Vy toward horizontal over time
      if (magnetRef?.current) {
        vyRef.current *= Math.pow(0.04, dt); // half-life ~0.17s — pulls trajectory toward horizontal
      }

      const maxX = window.innerWidth - sizeRef.current.w;
      const maxY = window.innerHeight - sizeRef.current.h;
      const nextX = posRef.current.x + vxRef.current * dt;
      const nextY = posRef.current.y + vyRef.current * dt;

      if (nextY >= maxY) {
        vyRef.current = -Math.abs(vyRef.current);
        if (vyAccelRef) vyAccelRef.current *= -0.4;
      }
      if (nextY <= 0) {
        vyRef.current = Math.abs(vyRef.current);
        if (vyAccelRef) vyAccelRef.current *= -0.4;
      }

      if (nextX >= maxX) {
        // Golo direito — sem side-effects dentro do setPos updater
        const cx = window.innerWidth / 2 - sizeRef.current.w / 2;
        const cy = window.innerHeight / 2 - sizeRef.current.h / 2;
        posRef.current = { x: cx, y: cy };
        if (onGoalRef.current) onGoalRef.current("player1");
      } else if (nextX <= 0) {
        // Golo esquerdo
        const cx = window.innerWidth / 2 - sizeRef.current.w / 2;
        const cy = window.innerHeight / 2 - sizeRef.current.h / 2;
        posRef.current = { x: cx, y: cy };
        if (onGoalRef.current) onGoalRef.current("player2");
      } else {
        // wall bounce handled above
        posRef.current = {
          x: Math.min(Math.max(nextX, 0), maxX),
          y: Math.min(Math.max(nextY, 0), maxY),
        };
      }

      if (elRef.current) {
        elRef.current.style.transform = `translate3d(${Math.round(posRef.current.x)}px,${Math.round(posRef.current.y)}px,0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={elRef}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        transform: `translate3d(${initialX}px,${initialY}px,0)`,
        willChange: "transform",
        touchAction: "none",
      }}
    >
      {children}
    </div>
  );
}
