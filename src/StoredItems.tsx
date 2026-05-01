"use client";

import Item from "./Item.tsx";
import type { LucideIcon } from "lucide-react";

type SlotItem = {
  icon?: LucideIcon;
  color?: string;
};

type PlayerStoredItems = {
  current?: SlotItem;
  next?: SlotItem;
};

type StoredItemsProps = {
  left?: PlayerStoredItems;
  right?: PlayerStoredItems;
};

function PlayerCorner({
  side,
  current,
  next,
}: {
  side: "left" | "right";
  current?: SlotItem;
  next?: SlotItem;
}) {
  const isLeft = side === "left";

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        [isLeft ? "left" : "right"]: 16,
        width: 72,
        height: 72,
        pointerEvents: "none",
      }}
    >
      <div style={{ position: "absolute", [!isLeft ? "left" : "right"]: 0, top: 18 }}>
        <Item radius={20} color={current?.color ?? "#ffffff"} icon={current?.icon} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 0,
          [!isLeft ? "right" : "left"]: 0,
          opacity: 0.92,
          transform: "scale(0.82)",
          transformOrigin: isLeft ? "top right" : "top left",
        }}
      >
        <Item radius={14} color={next?.color ?? "#ffffff"} icon={next?.icon} />
      </div>
    </div>
  );
}

export default function StoredItems({ left, right }: StoredItemsProps) {
  return (
    <>
      <PlayerCorner side="left" current={left?.current} next={left?.next} />
      <PlayerCorner side="right" current={right?.current} next={right?.next} />
    </>
  );
}
