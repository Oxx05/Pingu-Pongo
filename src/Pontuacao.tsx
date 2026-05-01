"use client";

type PontuacaoProps = {
    score1: number;
    score2: number;
};

const scoreStyle: React.CSSProperties = {
    position: "fixed",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "clamp(5rem, 18vw, 16rem)",
    fontWeight: "bold",
    fontFamily: "'Courier New', Courier, monospace",
    color: "rgba(196, 170, 255, 0.09)",
    textShadow: "0 0 40px rgba(180,130,255,0.07)",
    userSelect: "none",
    pointerEvents: "none",
    letterSpacing: "-0.02em",
    lineHeight: 1,
};

export default function Pontuacao({ score1 = 0, score2 = 0 }: PontuacaoProps) {
    return (
        <>
            <div style={{ ...scoreStyle, left: "25%", transform: "translateY(-50%) translateX(-50%)" }}>
                {score1}
            </div>
            <div style={{ ...scoreStyle, left: "75%", transform: "translateY(-50%) translateX(-50%)" }}>
                {score2}
            </div>
        </>
    );
}
