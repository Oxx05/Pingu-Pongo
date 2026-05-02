"use client";

import { useEffect, useRef } from "react";
import iceShardGif from "./ice-shard.gif";

type ShotProps = {
  /** Starting X (left edge of the image) */
  startX: number;
  /** Starting Y (center of the paddle) */
  startY: number;
  /** +1 → goes right (player1 shot), -1 → goes left (player2 shot) */
  direction: 1 | -1;
  /** Ref to the enemy paddle div for hit detection */
  enemyRef: React.RefObject<HTMLDivElement | null>;
  /** Called when the shard hits the enemy paddle */
  onHit: () => void;
  /** Called when the shard leaves the screen without hitting */
  onMiss: () => void;
  paused?: boolean;
};

const SPEED = 900; // px/s
const IMG_W = 144;
const IMG_H = 72;

export default function Shot({ startX, startY, direction, enemyRef, onHit, onMiss, paused = false }: ShotProps) {
  const posRef = useRef({ x: startX, y: startY - IMG_H / 2 });
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

      posRef.current.x += SPEED * direction * dt;

      const x = posRef.current.x;
      const y = posRef.current.y;

      // Out of screen → miss
      if (x > window.innerWidth || x + IMG_W < 0) {
        doneRef.current = true;
        onMissRef.current();
        return;
      }

      // Hit detection against enemy paddle
      if (enemyRef.current) {
        const pr = enemyRef.current.getBoundingClientRect();
        // AABB overlap between shard rect and paddle rect
        const shardRight  = x + IMG_W;
        const shardBottom = y + IMG_H;
        const hit =
          shardRight  > pr.left &&
          x           < pr.right &&
          shardBottom > pr.top &&
          y           < pr.bottom;

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
          // flip horizontally when going left
          transform: direction === -1 ? "scaleX(-1)" : undefined,
          imageRendering: "pixelated",
          filter: "drop-shadow(0 0 4px #a8d8f088)",
        }}
      />
    </div>
  );
}
