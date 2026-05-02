"use client";

import React, { forwardRef } from "react";

type BallProps = {
    radius: number;
    ghost?: boolean;
};

const Bola = forwardRef<HTMLDivElement, BallProps>(
    ({ radius = 20, ghost = false }, ref) => (
        <div
            ref={ref}
            style={{
                backgroundColor: "#e8f4fb",
                width: radius * 2,
                height: radius * 2,
                borderRadius: "50%",
                border: "1.5px solid #e8f4fb",
                boxSizing: "border-box",
                boxShadow: ghost ? "none" : "0 0 8px rgba(200,235,255,0.28), 0 0 18px rgba(160,210,255,0.08)",
                opacity: ghost ? 0.08 : 1,
                transition: "opacity 0.4s ease",
            }}
        ></div>
    )
);

export default Bola;