"use client";

import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import "./Item.css";

type IconProps = {
  radius?: number;
  color?: string;
  icon?: LucideIcon;
};

export default function Item({ radius = 20, color = "#63e6ff", icon: Icon }: IconProps) {
  const bubbleStyle = {
    width: radius * 2,
    height: radius * 2,
    ["--bubble-color" as string]: color,
  } as CSSProperties;

  return (
    <div className="item-bubble" style={bubbleStyle}>
      {Icon ? <Icon className="item-bubble-icon" size={radius} color={color} strokeWidth={2.2} /> : null}
    </div>
  );
}
