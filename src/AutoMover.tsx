"use client";

import { useEffect, useRef } from "react";

type AutoMoverProps = {
  vxRef: { current: number };
  vyRef: { current: number };
  initialX?: number;
  initialY?: number;
  onGoal?: (scored: string) => void;
  teleportY?: number | null;
  children: React.ReactNode;
};

export default function AutoMover({ vxRef, vyRef, initialX = 40, initialY = 40, onGoal, teleportY, children }: AutoMoverProps) {
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

  const lastTeleportYRef = useRef<number | null>(null);
  useEffect(() => {
    if (teleportY !== null && teleportY !== undefined && teleportY !== lastTeleportYRef.current) {
      lastTeleportYRef.current = teleportY;
      posRef.current.y = teleportY;
    }
  }, [teleportY]);

  useEffect(() => {
    const tick = (t: number) => {
      if (lastRef.current == null) lastRef.current = t;
      const dt = (t - lastRef.current) / 1000;
      lastRef.current = t;

      const maxX = window.innerWidth - sizeRef.current.w;
      const maxY = window.innerHeight - sizeRef.current.h;
      const nextX = posRef.current.x + vxRef.current * dt;
      const nextY = posRef.current.y + vyRef.current * dt;

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
        if (nextY >= maxY) vyRef.current = -Math.abs(vyRef.current);
        if (nextY <= 0)    vyRef.current =  Math.abs(vyRef.current);
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
