"use client";

import { useEffect, useRef, useState } from "react";

type ManualMoverProps = {
  v: number;
  initialX?: number;
  initialY?: number;
  elementHeight?: number;
  keys: Map<string, string>;
  onVelocityChange?: (vy: number) => void;
  onShoot?: () => void;
  onRotate?: () => void;
  touchZone?: "left" | "right";
  frozen?: boolean;
  inverted?: boolean;
  driftForce?: number;
  paused?: boolean;
  /** When provided, overrides keyboard + touch for movement (online guest inputs) */
  externalInput?: { current: { up: boolean; down: boolean } } | null;
  children: React.ReactNode;
};

export default function ManualMover({
  v,
  initialX = 40,
  initialY = 40,
  elementHeight,
  keys,
  onVelocityChange,
  onShoot,
  onRotate,
  touchZone,
  frozen = false,
  inverted = false,
  driftForce = 0,
  paused = false,
  externalInput = null,
  children,
}: ManualMoverProps) {
  // vRef: sempre tem o valor mais recente de v, sem re-criar o RAF
  const vRef = useRef(v);
  useEffect(() => { vRef.current = v; }, [v]);

  const frozenRef = useRef(frozen);
  useEffect(() => { frozenRef.current = frozen; }, [frozen]);

  const invertedRef = useRef(inverted);
  useEffect(() => { invertedRef.current = inverted; }, [inverted]);

  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const driftRef = useRef(driftForce);
  useEffect(() => { driftRef.current = driftForce; }, [driftForce]);

  const posYRef = useRef(initialY);
  const sizeRef = useRef({ w: 0, h: elementHeight ?? 0 });
  const prevElementHeightRef = useRef(elementHeight ?? 0);
  const elRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const onVelocityChangeRef = useRef(onVelocityChange);
  onVelocityChangeRef.current = onVelocityChange;

  useEffect(() => {
    if (elementHeight === undefined) return;
    const oldH = prevElementHeightRef.current;
    const newH = elementHeight;
    sizeRef.current.h = newH;
    prevElementHeightRef.current = newH;
    // Reposition so that the center of the paddle stays at the same Y
    if (oldH > 0 && oldH !== newH) {
      const center = posYRef.current + oldH / 2;
      const newTop = Math.max(0, Math.min(window.innerHeight - newH, center - newH / 2));
      posYRef.current = newTop;
      if (elRef.current) {
        elRef.current.style.transform = `translate3d(0,${Math.round(newTop)}px,0)`;
      }
    }
  }, [elementHeight]);

  useEffect(() => {
    if (elementHeight !== undefined) return;
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    sizeRef.current = { w: rect.width, h: rect.height };
  }, [children, elementHeight]);

  const touchYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!touchZone) return;
    const isMyZone = (x: number) =>
      touchZone === "left" ? x < window.innerWidth / 2 : x >= window.innerWidth / 2;

    const onStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches))
        if (isMyZone(t.clientX)) { touchYRef.current = t.clientY; e.preventDefault(); }
    };
    const onMove = (e: TouchEvent) => {
      for (const t of Array.from(e.touches))
        if (isMyZone(t.clientX)) { touchYRef.current = t.clientY; e.preventDefault(); }
    };
    const onEnd = (e: TouchEvent) => {
      if (!Array.from(e.touches).some(t => isMyZone(t.clientX))) touchYRef.current = null;
    };

    window.addEventListener("touchstart", onStart, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [touchZone]);

  const [keyUp, setKeyUp] = useState(false);
  const [keyDown, setKeyDown] = useState(false);
  const keyUpRef = useRef(false);
  const keyDownRef = useRef(false);

  const allowedKeys = Array.from(keys.keys());

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!allowedKeys.includes(e.key)) return;
    const k = keys.get(e.key) ?? "";
    if (k === "up")   { setKeyUp(true);  keyUpRef.current = true; }
    if (k === "down") { setKeyDown(true); keyDownRef.current = true; }
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    if (!allowedKeys.includes(e.key)) return;
    const k = keys.get(e.key) ?? "";
    if (k === "up")     { setKeyUp(false);  keyUpRef.current = false; }
    if (k === "down")   { setKeyDown(false); keyDownRef.current = false; }
    if (k === "shoot"  && onShoot)  onShoot();
    if (k === "rotate" && onRotate) onRotate();
  };

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
      const dt = Math.min((t - lastRef.current) / 1000, 0.05);
      lastRef.current = t;

      if (pausedRef.current) {
        lastRef.current = t;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const h = sizeRef.current.h;
      const maxY = window.innerHeight - h;
      const minY = 0;
      const prevY = posYRef.current;
      let nextY = prevY;

      if (!frozenRef.current) {
        if (externalInput) {
          // Online mode: use remote player inputs, ignore local keyboard/touch
          const goingUp   = invertedRef.current ? externalInput.current.down : externalInput.current.up;
          const goingDown = invertedRef.current ? externalInput.current.up   : externalInput.current.down;
          if (goingUp && !goingDown)   nextY = Math.max(prevY - vRef.current * dt, minY);
          else if (goingDown && !goingUp) nextY = Math.min(prevY + vRef.current * dt, maxY);
        } else if (touchYRef.current !== null) {
          // Touch: move em direcção ao dedo à velocidade do player
          const target = Math.max(minY, Math.min(maxY, touchYRef.current - h / 2));
          const diff = target - prevY;
          const maxMove = vRef.current * dt;
          nextY = prevY + Math.max(-maxMove, Math.min(maxMove, diff));
        } else {
          // invertedRef: troca up↔down
          const goingUp   = invertedRef.current ? keyDownRef.current : keyUpRef.current;
          const goingDown = invertedRef.current ? keyUpRef.current  : keyDownRef.current;
          if (goingUp && !goingDown)   nextY = Math.max(prevY - vRef.current * dt, minY);
          else if (goingDown && !goingUp) nextY = Math.min(prevY + vRef.current * dt, maxY);
        }
      }

      // Apply drift (enemy panic effect — player still has control but fights a constant force)
      if (driftRef.current !== 0) {
        nextY = Math.max(minY, Math.min(maxY, nextY + driftRef.current * dt));
      }

      if (nextY !== prevY) {
        posYRef.current = nextY;
        if (elRef.current) {
          elRef.current.style.transform = `translate3d(0,${Math.round(nextY)}px,0)`;
        }
        if (onVelocityChangeRef.current) onVelocityChangeRef.current((nextY - prevY) / dt);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  void keyUp; void keyDown;

  return (
    <div
      ref={elRef}
      style={{
        position: "fixed",
        left: initialX,
        top: 0,
        transform: `translate3d(0,${Math.round(posYRef.current)}px,0)`,
        willChange: "transform",
        touchAction: "none",
      }}
    >
      {children}
    </div>
  );
}
