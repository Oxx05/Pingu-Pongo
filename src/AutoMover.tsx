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
  magnetRef?: { current: "player1" | "player2" | null };
  vortexRef?: { current: "player1" | "player2" | null };
  repulsorRef?: { current: "player1" | "player2" | null };
  maxSpeedRef?: { current: number };
  paused?: boolean;
  /** Landscape: left wall bounces instead of triggering onGoal("player2") */
  bounceLeft?: boolean;
  /** Landscape: right wall bounces instead of triggering onGoal("player1") */
  bounceRight?: boolean;
  /** Portrait mode: swap goal/bounce axes — Y becomes goal axis, X always bounces */
  portraitMode?: boolean;
  /** Portrait: top wall bounces instead of triggering onGoal("player2") */
  bounceTop?: boolean;
  /** Portrait: bottom wall bounces instead of triggering onGoal("player1") */
  bounceBottom?: boolean;
  /** Called whenever the ball bounces off any wall (not on goals) */
  onWallBounce?: () => void;
  /** Curve-shot: sustained lateral force (px/s²) applied each frame; null = inactive */
  curveForceSideRef?: { current: number | null };
  children: React.ReactNode;
};

export default function AutoMover({
  vxRef, vyRef,
  initialX = 40, initialY = 40,
  onGoal, teleportY, vyAccelRef, magnetRef, vortexRef, repulsorRef, maxSpeedRef,
  paused = false,
  bounceLeft = false, bounceRight = false,
  portraitMode = false,
  bounceTop = false, bounceBottom = false,
  onWallBounce,
  curveForceSideRef,
  children,
}: AutoMoverProps) {
  const posRef = useRef({ x: initialX, y: initialY });
  const sizeRef = useRef({ w: 0, h: 0 });
  const elRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const onGoalRef = useRef(onGoal);
  onGoalRef.current = onGoal;
  const onWallBounceRef = useRef(onWallBounce);
  onWallBounceRef.current = onWallBounce;

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    sizeRef.current = { w: rect.width, h: rect.height };
  }, [children]);

  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const bounceLeftRef = useRef(bounceLeft);
  useEffect(() => { bounceLeftRef.current = bounceLeft; }, [bounceLeft]);
  const bounceRightRef = useRef(bounceRight);
  useEffect(() => { bounceRightRef.current = bounceRight; }, [bounceRight]);
  const portraitModeRef = useRef(portraitMode);
  useEffect(() => { portraitModeRef.current = portraitMode; }, [portraitMode]);
  const bounceTopRef = useRef(bounceTop);
  useEffect(() => { bounceTopRef.current = bounceTop; }, [bounceTop]);
  const bounceBottomRef = useRef(bounceBottom);
  useEffect(() => { bounceBottomRef.current = bounceBottom; }, [bounceBottom]);

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
        lastRef.current = t;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (lastRef.current == null) lastRef.current = t;
      const dt = Math.min((t - lastRef.current) / 1000, 0.05);
      lastRef.current = t;

      if (sizeRef.current.w === 0 && elRef.current) {
        const r = elRef.current.getBoundingClientRect();
        if (r.width > 0) sizeRef.current = { w: r.width, h: r.height };
      }

      // Spin (VY acceleration from paddle) — pure direction change, no speed gain
      if (vyAccelRef) {
        const speedBefore = Math.hypot(vxRef.current, vyRef.current);
        vyRef.current += vyAccelRef.current * dt;
        vyAccelRef.current *= Math.exp(-1.2 * dt);
        const speedAfter = Math.hypot(vxRef.current, vyRef.current);
        if (speedAfter > 0 && speedBefore > 0) {
          const rescale = speedBefore / speedAfter;
          vxRef.current *= rescale;
          vyRef.current *= rescale;
        }
        const totalSpeed = Math.hypot(vxRef.current, vyRef.current);
        const maxVy = totalSpeed * 0.968;
        if (Math.abs(vyRef.current) > maxVy) {
          vyRef.current = Math.sign(vyRef.current) * maxVy;
          vxRef.current = Math.sign(vxRef.current || 1) * Math.sqrt(Math.max(0, totalSpeed ** 2 - maxVy ** 2));
        }
      }

      // Speed cap
      if (maxSpeedRef && isFinite(maxSpeedRef.current) && maxSpeedRef.current > 0) {
        const cur = Math.hypot(vxRef.current, vyRef.current);
        if (cur > maxSpeedRef.current) {
          vxRef.current = vxRef.current / cur * maxSpeedRef.current;
          vyRef.current = vyRef.current / cur * maxSpeedRef.current;
        }
      }

      // Magnet
      if (magnetRef?.current) {
        const activator = magnetRef.current;
        let headingAtPlayer: boolean;
        if (portraitModeRef.current) {
          // portrait: player1 at bottom (Vy > 0 = heading toward P1), player2 at top (Vy < 0)
          headingAtPlayer =
            (activator === "player1" && vyRef.current > 0) ||
            (activator === "player2" && vyRef.current < 0);
        } else {
          headingAtPlayer =
            (activator === "player1" && vxRef.current < 0) ||
            (activator === "player2" && vxRef.current > 0);
        }
        if (headingAtPlayer) {
          const speedBefore = Math.hypot(vxRef.current, vyRef.current);
          const factor = Math.pow(0.4, dt);
          if (portraitModeRef.current) {
            vxRef.current *= factor;  // dampen lateral component in portrait
          } else {
            vyRef.current *= factor;
          }
          if (vyAccelRef) vyAccelRef.current *= factor;
          // Preserve total speed — magnet steers direction only, doesn't slow the ball
          const speedAfter = Math.hypot(vxRef.current, vyRef.current);
          if (speedAfter > 0 && speedBefore > 0) {
            const rescale = speedBefore / speedAfter;
            vxRef.current *= rescale;
            vyRef.current *= rescale;
          }
        }
      }

      // Vortex: steer ball toward screen center — preserves total speed (direction change only)
      if (vortexRef?.current) {
        const vortexSpeedBefore = Math.hypot(vxRef.current, vyRef.current);
        if (portraitModeRef.current) {
          const centerY = window.innerHeight / 2 - sizeRef.current.h / 2;
          vyRef.current += Math.sign(centerY - posRef.current.y) * 180 * dt;
        } else {
          const centerX = window.innerWidth / 2 - sizeRef.current.w / 2;
          vxRef.current += Math.sign(centerX - posRef.current.x) * 180 * dt;
        }
        const vortexSpeedAfter = Math.hypot(vxRef.current, vyRef.current);
        if (vortexSpeedAfter > 0 && vortexSpeedBefore > 0) {
          const rescale = vortexSpeedBefore / vortexSpeedAfter;
          vxRef.current *= rescale;
          vyRef.current *= rescale;
        }
      }

      // Repulsor: push ball toward opponent's side (away from activating player)
      if (repulsorRef?.current) {
        const activator = repulsorRef.current;
        if (portraitModeRef.current) {
          vyRef.current += (activator === "player1" ? -150 : 150) * dt;
        } else {
          vxRef.current += (activator === "player1" ? 150 : -150) * dt;
        }
      }

      // Curve-shot: sustained lateral force (no decay) — ball arcs across the field
      if (curveForceSideRef?.current != null) {
        const force = curveForceSideRef.current;
        const speedBefore = Math.hypot(vxRef.current, vyRef.current);
        if (portraitModeRef.current) {
          vxRef.current += force * dt;        // lateral = X in portrait
        } else {
          vyRef.current += force * dt;        // lateral = Y in landscape
        }
        // preserve total speed — curve is a direction change only, no energy added
        const speedAfter = Math.hypot(vxRef.current, vyRef.current);
        if (speedAfter > 0 && speedBefore > 0) {
          const rescale = speedBefore / speedAfter;
          vxRef.current *= rescale;
          vyRef.current *= rescale;
        }
        // cap lateral component so ball can't go perfectly sideways
        const totalSpeed = Math.hypot(vxRef.current, vyRef.current);
        if (portraitModeRef.current) {
          const maxVx = totalSpeed * 0.968;
          if (Math.abs(vxRef.current) > maxVx) {
            vxRef.current = Math.sign(vxRef.current) * maxVx;
            vyRef.current = Math.sign(vyRef.current || 1) * Math.sqrt(Math.max(0, totalSpeed ** 2 - maxVx ** 2));
          }
        } else {
          const maxVy = totalSpeed * 0.968;
          if (Math.abs(vyRef.current) > maxVy) {
            vyRef.current = Math.sign(vyRef.current) * maxVy;
            vxRef.current = Math.sign(vxRef.current || 1) * Math.sqrt(Math.max(0, totalSpeed ** 2 - maxVy ** 2));
          }
        }
      }

      const maxX = window.innerWidth - sizeRef.current.w;
      const maxY = window.innerHeight - sizeRef.current.h;
      const nextX = posRef.current.x + vxRef.current * dt;
      const nextY = posRef.current.y + vyRef.current * dt;

      const cx_center = window.innerWidth / 2 - sizeRef.current.w / 2;
      const cy_center = window.innerHeight / 2 - sizeRef.current.h / 2;

      if (portraitModeRef.current) {
        // Portrait: X always bounces, Y is goal axis
        if (nextX >= maxX) {
          vxRef.current = -Math.abs(vxRef.current);
          if (vyAccelRef) vyAccelRef.current *= -0.4;
          onWallBounceRef.current?.();
        } else if (nextX <= 0) {
          vxRef.current = Math.abs(vxRef.current);
          if (vyAccelRef) vyAccelRef.current *= -0.4;
          onWallBounceRef.current?.();
        }

        if (nextY >= maxY) {
          if (bounceBottomRef.current) {
            vyRef.current = -Math.abs(vyRef.current);
            if (vyAccelRef) vyAccelRef.current *= -0.4;
            posRef.current = { x: Math.min(Math.max(nextX, 0), maxX), y: maxY };
            onWallBounceRef.current?.();
          } else {
            posRef.current = { x: cx_center, y: cy_center };
            if (onGoalRef.current) onGoalRef.current("player1");
          }
        } else if (nextY <= 0) {
          if (bounceTopRef.current) {
            vyRef.current = Math.abs(vyRef.current);
            if (vyAccelRef) vyAccelRef.current *= -0.4;
            posRef.current = { x: Math.min(Math.max(nextX, 0), maxX), y: 0 };
            onWallBounceRef.current?.();
          } else {
            posRef.current = { x: cx_center, y: cy_center };
            if (onGoalRef.current) onGoalRef.current("player2");
          }
        } else {
          posRef.current = {
            x: Math.min(Math.max(nextX, 0), maxX),
            y: Math.min(Math.max(nextY, 0), maxY),
          };
        }
      } else {
        // Landscape: Y always bounces, X is goal axis
        if (nextY >= maxY) {
          vyRef.current = -Math.abs(vyRef.current);
          if (vyAccelRef) vyAccelRef.current *= -0.4;
          onWallBounceRef.current?.();
        }
        if (nextY <= 0) {
          vyRef.current = Math.abs(vyRef.current);
          if (vyAccelRef) vyAccelRef.current *= -0.4;
          onWallBounceRef.current?.();
        }

        if (nextX >= maxX) {
          if (bounceRightRef.current) {
            vxRef.current = -Math.abs(vxRef.current);
            if (vyAccelRef) vyAccelRef.current *= -0.4;
            posRef.current = { x: maxX, y: Math.min(Math.max(nextY, 0), maxY) };
            onWallBounceRef.current?.();
          } else {
            posRef.current = { x: cx_center, y: cy_center };
            if (onGoalRef.current) onGoalRef.current("player1");
          }
        } else if (nextX <= 0) {
          if (bounceLeftRef.current) {
            vxRef.current = Math.abs(vxRef.current);
            if (vyAccelRef) vyAccelRef.current *= -0.4;
            posRef.current = { x: 0, y: Math.min(Math.max(nextY, 0), maxY) };
            onWallBounceRef.current?.();
          } else {
            posRef.current = { x: cx_center, y: cy_center };
            if (onGoalRef.current) onGoalRef.current("player2");
          }
        } else {
          posRef.current = {
            x: Math.min(Math.max(nextX, 0), maxX),
            y: Math.min(Math.max(nextY, 0), maxY),
          };
        }
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
