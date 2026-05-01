"use client";

import React, { forwardRef } from "react";

type BarProps = {
    height: number;
    width: number;
    color?: string;
    glowColor?: string;
};

const Barra = forwardRef<HTMLDivElement, BarProps>(
    ({ height = 60, width = 20, color = "#56d1c4", glowColor = "82,209,196" }, ref) => (
        <div
            ref={ref}
            style={{
                backgroundColor: color,
                width: width,
                height: height,
                borderRadius: 4,
                boxShadow: `0 0 8px rgba(${glowColor},0.45), 0 0 24px rgba(${glowColor},0.12)`,
            }}
        ></div>
    )
);

export default Barra;