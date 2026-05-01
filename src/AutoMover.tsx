"use client";

import { useEffect, useRef, useState } from "react";

type AutoMoverProps = {
  vxRef: { current: number };
  vyRef: { current: number };
  initialX?: number;
  initialY?: number;
  onGoal?: (scored: string) => void;
  children: React.ReactNode;
};

export default function AutoMover({ vxRef, vyRef, initialX = 40, initialY = 40, onGoal, children }: AutoMoverProps) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const posRef = useRef({ x: initialX, y: initialY }); // fonte de verdade, sem updater pattern
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

      setPos({ ...posRef.current });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, []);

  return (
    <div
      ref={elRef}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        touchAction: "none",
      }}
    >
      {children}
    </div>
  );
}
