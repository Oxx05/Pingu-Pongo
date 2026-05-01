"use client";

import React, { forwardRef } from "react";

type BarProps = {
    height: number;
    width: number;
};

const Barra = forwardRef<HTMLDivElement, BarProps>(
    ({ height = 60, width = 20 }, ref) => (
        <div
            ref={ref}
            style={{
                backgroundColor: "#c4aaff",
                width: width,
                height: height,
                borderRadius: 4,
                boxShadow: "0 0 8px rgba(180,130,255,0.5), 0 0 28px rgba(160,100,255,0.15)",
            }}
        ></div>
    )
);

export default Barra;