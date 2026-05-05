"use client";

import { useEffect, useRef, useState } from "react";

type ManualMoverProps = {
  v: number;
  initialX?: number;
  initialY?: number;
  elementHeight?: number;
  keys: Map<string, string>;
  onVelocityChange?: (v: number) => void;
  onShoot?: () => void;
  onRotate?: () => void;
  onDiscard?: () => void;
  touchZone?: "left" | "right" | "top" | "bottom";
  frozen?: boolean;
  inverted?: boolean;
  driftForce?: number;
  paused?: boolean;
  /** When provided, overrides keyboard + touch for movement (online guest inputs) */
  externalInput?: { current: { up: boolean; down: boolean } } | null;
  /** Index into navigator.getGamepads() — enables gamepad/controller input */
  gamepadIndex?: number;
  /** Portrait mode: paddle moves horizontally on X axis */
  horizontal?: boolean;
  /** Inertia mode: paddle continues sliding when key released */
  inertia?: boolean;
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
  onDiscard,
  touchZone,
  frozen = false,
  inverted = false,
  driftForce = 0,
  paused = false,
  externalInput = null,
  gamepadIndex,
  horizontal = false,
  inertia = false,
  children,
}: ManualMoverProps) {
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

  const horizontalRef = useRef(horizontal);
  useEffect(() => { horizontalRef.current = horizontal; }, [horizontal]);

  const inertiaRef = useRef(inertia);
  useEffect(() => { inertiaRef.current = inertia; }, [inertia]);
  const momentumRef = useRef(0);

  // Vertical movement (landscape)
  const posYRef = useRef(initialY);
  // Horizontal movement (portrait)
  const posXRef = useRef(initialX);

  const sizeRef = useRef({ w: 0, h: elementHeight ?? 0 });
  const prevElementHeightRef = useRef(elementHeight ?? 0);
  const elRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const onVelocityChangeRef = useRef(onVelocityChange);
  onVelocityChangeRef.current = onVelocityChange;

  const onShootRef = useRef(onShoot);
  onShootRef.current = onShoot;
  const onRotateRef = useRef(onRotate);
  onRotateRef.current = onRotate;
  const onDiscardRef = useRef(onDiscard);
  onDiscardRef.current = onDiscard;

  const gamepadIndexRef = useRef(gamepadIndex ?? -1);
  useEffect(() => { gamepadIndexRef.current = gamepadIndex ?? -1; }, [gamepadIndex]);
  const gpUpRef = useRef(false);
  const gpDownRef = useRef(false);
  const prevGpButtonsRef = useRef([false, false, false, false, false]);

  useEffect(() => {
    if (elementHeight === undefined) return;
    const oldH = prevElementHeightRef.current;
    const newH = elementHeight;
    sizeRef.current.h = newH;
    prevElementHeightRef.current = newH;
    if (oldH > 0 && oldH !== newH) {
      if (horizontalRef.current) {
        const center = posXRef.current + oldH / 2;
        const newLeft = Math.max(0, Math.min(window.innerWidth - newH, center - newH / 2));
        posXRef.current = newLeft;
        if (elRef.current) {
          elRef.current.style.transform = `translate3d(${Math.round(newLeft)}px,0,0)`;
        }
      } else {
        const center = posYRef.current + oldH / 2;
        const newTop = Math.max(0, Math.min(window.innerHeight - newH, center - newH / 2));
        posYRef.current = newTop;
        if (elRef.current) {
          elRef.current.style.transform = `translate3d(0,${Math.round(newTop)}px,0)`;
        }
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

  // touchYRef: tracks clientY (vertical) or clientX (horizontal) of active touch
  const touchYRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    if (!touchZone) return;

    const isMyZone = (x: number, y: number): boolean => {
      if (touchZone === "top")    return y < window.innerHeight / 2;
      if (touchZone === "bottom") return y >= window.innerHeight / 2;
      if (touchZone === "left")   return x < window.innerWidth / 2;
      if (touchZone === "right")  return x >= window.innerWidth / 2;
      return false;
    };

    const onStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        // Don't intercept touches on interactive UI elements (buttons, links, etc.)
        const target = t.target as Element;
        if (target.closest('button, a, input, select, [role="button"]')) continue;
        if (isMyZone(t.clientX, t.clientY)) {
          touchYRef.current = horizontalRef.current ? t.clientX : t.clientY;
          touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
          if (!pausedRef.current) e.preventDefault();
        }
      }
    };
    const onMove = (e: TouchEvent) => {
      for (const t of Array.from(e.touches)) {
        const target = t.target as Element;
        if (target.closest('button, a, input, select, [role="button"]')) continue;
        if (isMyZone(t.clientX, t.clientY)) {
          touchYRef.current = horizontalRef.current ? t.clientX : t.clientY;
          if (!pausedRef.current) e.preventDefault();
        }
      }
    };
    const onEnd = (e: TouchEvent) => {
      const start = touchStartRef.current;
      if (start && !pausedRef.current) {
        for (const t of Array.from(e.changedTouches)) {
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          const elapsed = Date.now() - start.t;
          if (horizontalRef.current) {
            // Portrait: vertical swipe = toward/away opponent
            if (Math.abs(dy) > 38 && Math.abs(dy) > Math.abs(dx) * 1.4 && elapsed < 450) {
              const towardOpponent = touchZone === "bottom" ? dy < 0 : dy > 0;
              if (towardOpponent) onShootRef.current?.();
              else                onRotateRef.current?.();
            }
          } else {
            // Landscape: horizontal swipe = toward/away opponent
            if (Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 1.4 && elapsed < 450) {
              const towardOpponent = touchZone === "left" ? dx > 0 : dx < 0;
              if (towardOpponent) onShootRef.current?.();
              else                onRotateRef.current?.();
            }
          }
        }
      }
      touchStartRef.current = null;
      if (!Array.from(e.touches).some(t => isMyZone(t.clientX, t.clientY))) touchYRef.current = null;
    };

    window.addEventListener("touchstart", onStart, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [touchZone]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (k === "shoot"   && onShoot)   onShoot();
    if (k === "rotate"  && onRotate)  onRotate();
    if (k === "discard" && onDiscard) onDiscard();
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

      // Poll gamepad
      if (!externalInput && gamepadIndexRef.current >= 0) {
        const gp = navigator.getGamepads ? navigator.getGamepads()[gamepadIndexRef.current] : null;
        if (gp) {
          if (horizontalRef.current) {
            // Portrait: left stick X axis + D-pad left/right
            const ax0    = gp.axes[0] ?? 0;
            const b14    = gp.buttons[14]?.pressed ?? false;
            const b15    = gp.buttons[15]?.pressed ?? false;
            gpUpRef.current   = ax0 < -0.3 || b14;
            gpDownRef.current = ax0 >  0.3 || b15;
          } else {
            const ax1    = gp.axes[1] ?? 0;
            const b12    = gp.buttons[12]?.pressed ?? false;
            const b13    = gp.buttons[13]?.pressed ?? false;
            gpUpRef.current   = ax1 < -0.3 || b12;
            gpDownRef.current = ax1 >  0.3 || b13;
          }

          const cur = [
            gp.buttons[0]?.pressed ?? false,
            gp.buttons[1]?.pressed ?? false,
            gp.buttons[2]?.pressed ?? false,
            gp.buttons[4]?.pressed ?? false,
            gp.buttons[5]?.pressed ?? false,
          ];
          const prev = prevGpButtonsRef.current;
          if (cur[0] && !prev[0]) onShootRef.current?.();
          if ((cur[1] && !prev[1]) || (cur[2] && !prev[2]) || (cur[3] && !prev[3]) || (cur[4] && !prev[4])) onRotateRef.current?.();
          prevGpButtonsRef.current = cur;
        } else {
          gpUpRef.current   = false;
          gpDownRef.current = false;
        }
      }

      if (horizontalRef.current) {
        // Horizontal mode: move along X axis
        const h = sizeRef.current.h; // elementHeight = paddle visual width
        const maxX = window.innerWidth - h;
        const prevX = posXRef.current;
        let nextX = prevX;

        if (!frozenRef.current) {
          if (externalInput) {
            const goingLeft  = invertedRef.current ? externalInput.current.down : externalInput.current.up;
            const goingRight = invertedRef.current ? externalInput.current.up   : externalInput.current.down;
            if (goingLeft && !goingRight)   nextX = Math.max(prevX - vRef.current * dt, 0);
            else if (goingRight && !goingLeft) nextX = Math.min(prevX + vRef.current * dt, maxX);
          } else if (touchYRef.current !== null) {
            // touchYRef stores clientX of finger when horizontal
            const rawTarget = Math.max(0, Math.min(maxX, touchYRef.current - h / 2));
            const target = invertedRef.current ? maxX - rawTarget : rawTarget;
            const diff = target - prevX;
            const maxMove = vRef.current * dt;
            nextX = prevX + Math.max(-maxMove, Math.min(maxMove, diff));
          } else {
            const goingLeft  = invertedRef.current ? (keyDownRef.current || gpDownRef.current) : (keyUpRef.current || gpUpRef.current);
            const goingRight = invertedRef.current ? (keyUpRef.current || gpUpRef.current)     : (keyDownRef.current || gpDownRef.current);
            if (goingLeft && !goingRight)   nextX = Math.max(prevX - vRef.current * dt, 0);
            else if (goingRight && !goingLeft) nextX = Math.min(prevX + vRef.current * dt, maxX);
          }
        }

        if (driftRef.current !== 0) {
          nextX = Math.max(0, Math.min(maxX, nextX + driftRef.current * dt));
        }

        if (nextX !== prevX) {
          posXRef.current = nextX;
          if (elRef.current) {
            elRef.current.style.transform = `translate3d(${Math.round(nextX)}px,0,0)`;
          }
          if (onVelocityChangeRef.current) onVelocityChangeRef.current((nextX - prevX) / dt);
        }
      } else {
        // Vertical mode (landscape)
        const h = sizeRef.current.h;
        const maxY = window.innerHeight - h;
        const minY = 0;
        const prevY = posYRef.current;
        let nextY = prevY;

        if (frozenRef.current) {
          momentumRef.current = 0;
        } else if (externalInput) {
          const goingUp   = invertedRef.current ? externalInput.current.down : externalInput.current.up;
          const goingDown = invertedRef.current ? externalInput.current.up   : externalInput.current.down;
          if (goingUp && !goingDown)   nextY = Math.max(prevY - vRef.current * dt, minY);
          else if (goingDown && !goingUp) nextY = Math.min(prevY + vRef.current * dt, maxY);
        } else if (touchYRef.current !== null) {
          const rawTarget = Math.max(minY, Math.min(maxY, touchYRef.current - h / 2));
          const target = invertedRef.current ? maxY - rawTarget : rawTarget;
          const diff = target - prevY;
          const maxMove = vRef.current * dt;
          nextY = prevY + Math.max(-maxMove, Math.min(maxMove, diff));
        } else {
          const goingUp   = invertedRef.current ? (keyDownRef.current || gpDownRef.current) : (keyUpRef.current || gpUpRef.current);
          const goingDown = invertedRef.current ? (keyUpRef.current || gpUpRef.current)     : (keyDownRef.current || gpDownRef.current);
          if (inertiaRef.current) {
            const pressing = (goingUp && !goingDown) ? -1 : (goingDown && !goingUp) ? 1 : 0;
            if (pressing !== 0) {
              momentumRef.current = pressing * vRef.current;
            } else {
              momentumRef.current *= Math.pow(0.15, dt);
              if (Math.abs(momentumRef.current) < 5) momentumRef.current = 0;
            }
            nextY = Math.max(minY, Math.min(maxY, prevY + momentumRef.current * dt));
          } else {
            if (goingUp && !goingDown)   nextY = Math.max(prevY - vRef.current * dt, minY);
            else if (goingDown && !goingUp) nextY = Math.min(prevY + vRef.current * dt, maxY);
          }
        }

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
        left: horizontal ? 0 : initialX,
        top: horizontal ? initialY : 0,
        transform: horizontal
          ? `translate3d(${Math.round(posXRef.current)}px,0,0)`
          : `translate3d(0,${Math.round(posYRef.current)}px,0)`,
        willChange: "transform",
        touchAction: "none",
      }}
    >
      {children}
    </div>
  );
}
