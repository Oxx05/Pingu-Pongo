"use client";

import { useEffect, useRef, useState } from "react";

type ManualMoverProps = {
  v: number;
  initialX?: number;
  initialY?: number;
  keys: Map<string,string>; // event.key :  direction
  onVelocityChange?: (vy: number) => void;
  children: React.ReactNode;
};

export default function ManualMover({ v, initialX = 40, initialY = 40, keys, onVelocityChange, children }: ManualMoverProps) {
  const [pos, setPos] = useState({y: initialY});
  const sizeRef = useRef({ w: 0, h: 0 });
  const elRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  const [lastY, setLastY] = useState(initialY);

  useEffect(() => {
    setLastY(pos.y);
    if (onVelocityChange) onVelocityChange(pos.y - lastY);
  }, [pos.y]); // eslint-disable-line react-hooks/exhaustive-deps


  const [keyUp, setKeyUp] = useState(false);
  const [keyDown, setKeyDown] = useState(false);


  const allowedKeys = Array.from(keys.keys());
  const handleKeyDown = (event: KeyboardEvent) => {
      if (allowedKeys.includes(event.key)) {
        const k = keys.get(event.key) ?? ""

        if (k === "up") setKeyUp(true);
        else if (k === "down") setKeyDown(true);
      }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
      if (allowedKeys.includes(event.key)) {
        const k = keys.get(event.key) ?? ""

        if (k === "up") setKeyUp(false);
        else if (k === "down") setKeyDown(false);
      }
  };

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    sizeRef.current = { w: rect.width, h: rect.height };
  }, [children]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [keys]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const tick = (t: number) => {
      if (lastRef.current == null) lastRef.current = t;
      const dt = (t - lastRef.current) / 1000;
      lastRef.current = t;

      setPos((p) => {
        const maxY = window.innerHeight - sizeRef.current.h;
        const minY = 0;

        let nextY = p.y;
 
        if (keyUp === true && keyDown === false){
          nextY = Math.max(Math.max(p.y - v * dt, 0), Math.max(minY, 0));

        }
        else if (keyDown === true && keyUp === false){
          nextY = Math.min(Math.max(p.y + v * dt, 0), Math.max(maxY, 0));

        }

        return {y: nextY};
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [keyUp, keyDown]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={elRef}
      style={{
        position: "fixed",
        left: initialX,
        top: pos.y,
        touchAction: "none",
      }}
    >
      {children}
    </div>
  );
}