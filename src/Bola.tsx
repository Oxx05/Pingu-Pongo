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
                backgroundColor: "#d6c0ff",
                width: radius * 2,
                height: radius * 2,
                borderRadius: "50%",
                boxShadow: "0 0 10px rgba(180,130,255,0.55), 0 0 30px rgba(160,100,255,0.18)",
            }}
        ></div>
    )
);

export default Bola;