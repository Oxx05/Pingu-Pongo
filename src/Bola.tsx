"use client";

import React, { forwardRef } from "react";

type BallProps = {
    radius: number;
};

const Bola = forwardRef<HTMLDivElement, BallProps>(
    ({ radius = 20 }, ref) => (
        <div
            ref={ref}
            style={{
                backgroundColor: "#e8f4fb",
                width: radius * 2,
                height: radius * 2,
                borderRadius: "50%",
                border: "1.5px solid #e8f4fb",
                boxSizing: "border-box",
                boxShadow: "0 0 8px rgba(200,235,255,0.28), 0 0 18px rgba(160,210,255,0.08)",
            }}
        ></div>
    )
);

export default Bola;