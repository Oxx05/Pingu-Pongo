"use client";

import { useEffect, useRef } from "react";
import iceShardGif from "./ice-shard.gif";

type ShotProps = {
  /** Starting X — left edge of image (landscape) or paddle center X (portrait) */
  startX: number;
  /** Starting Y — paddle center (landscape) or launch edge Y (portrait) */
  startY: number;
  /** +1 → right/down, -1 → left/up */
  direction: 1 | -1;
  /** Ref to the enemy paddle div for hit detection */
  enemyRef: React.RefObject<HTMLDivElement | null>;
  /** Called when the shard hits the enemy paddle */
  onHit: () => void;
  /** Called when the shard leaves the screen without hitting */
  onMiss: () => void;
  paused?: boolean;
  /** Portrait mode: shot travels vertically instead of horizontally */
  vertical?: boolean;
};

const SPEED = 1800; // px/s
const IMG_W = 144;
const IMG_H = 72;

/**
 * Vertical shots: the 144×72 img is rotated -90deg/90deg around its center (72, 36).
 * After rotation the visual bounding box is 72×144.
 * posRef still tracks the div top-left (144×72 layout).
 *   visual_cx = posRef.x + IMG_W/2  (= posRef.x + 72)
 *   visual_cy = posRef.y + IMG_H/2  (= posRef.y + 36)
 *   visual box: cx±36 × cy±72
 *
 * Launch positions:
 *   upward   (dir=-1, player1 at bottom): visual bottom = rect.top → cy = rect.top − 72
 *   downward (dir=+1, player2 at top):    visual top    = rect.bottom → cy = rect.bottom + 72
 */
function initPos(startX: number, startY: number, direction: 1 | -1, vertical: boolean) {
  if (!vertical) {
    return { x: startX, y: startY - IMG_H / 2 };
  }
  // startX = paddle center X, startY = launch edge Y (rect.top or rect.bottom)
  const cx = startX;
  const cy = direction === -1 ? startY - 72 : startY + 72;
  return { x: cx - IMG_W / 2, y: cy - IMG_H / 2 };
}

export default function Shot({ startX, startY, direction, enemyRef, onHit, onMiss, paused = false, vertical = false }: ShotProps) {
  const posRef = useRef(initPos(startX, startY, direction, vertical));
  const elRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const onHitRef = useRef(onHit);
  onHitRef.current = onHit;
  const onMissRef = useRef(onMiss);
  onMissRef.current = onMiss;

  useEffect(() => {
    const tick = (t: number) => {
      if (doneRef.current) return;

      if (pausedRef.current) {
        lastRef.current = t;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (lastRef.current == null) lastRef.current = t;
      const dt = Math.min((t - lastRef.current) / 1000, 0.05);
      lastRef.current = t;

      if (vertical) {
        posRef.current.y += SPEED * direction * dt;
      } else {
        posRef.current.x += SPEED * direction * dt;
      }

      const x = posRef.current.x;
      const y = posRef.current.y;

      // Out of screen → miss
      if (vertical) {
        const cy = y + IMG_H / 2;
        if (direction === -1 ? cy + 72 < 0 : cy - 72 > window.innerHeight) {
          doneRef.current = true;
          onMissRef.current();
          return;
        }
      } else {
        if (x > window.innerWidth || x + IMG_W < 0) {
          doneRef.current = true;
          onMissRef.current();
          return;
        }
      }

      // Hit detection against enemy paddle
      if (enemyRef.current) {
        const pr = enemyRef.current.getBoundingClientRect();
        let sl: number, sr: number, st: number, sb: number;
        if (vertical) {
          // Visual box after rotation: cx±36, cy±72
          const cx = x + IMG_W / 2;
          const cy = y + IMG_H / 2;
          sl = cx - 36; sr = cx + 36;
          st = cy - 72; sb = cy + 72;
        } else {
          sl = x; sr = x + IMG_W;
          st = y; sb = y + IMG_H;
        }
        const hit = sr > pr.left && sl < pr.right && sb > pr.top && st < pr.bottom;
        if (hit) {
          doneRef.current = true;
          if (elRef.current) elRef.current.style.display = "none";
          onHitRef.current();
          return;
        }
      }

      if (elRef.current) {
        elRef.current.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
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
        transform: `translate3d(${Math.round(posRef.current.x)}px,${Math.round(posRef.current.y)}px,0)`,
        willChange: "transform",
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      <img
        src={iceShardGif}
        width={IMG_W}
        height={IMG_H}
        alt=""
        style={{
          display: "block",
          transform: vertical
            ? (direction === -1 ? "rotate(-90deg)" : "rotate(90deg)")
            : (direction === -1 ? "scaleX(-1)" : undefined),
          imageRendering: "pixelated",
          filter: "drop-shadow(0 0 4px #a8d8f088)",
        }}
      />
    </div>
  );
}
