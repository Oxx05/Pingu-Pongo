"use client";

type PontuacaoProps = {
    score1: number;
    score2: number;
};

export default function Pontuacao({ score1 = 0, score2 = 0 }: PontuacaoProps) {
    const base: React.CSSProperties = {
        position: "fixed",
        top: "50%",
        fontSize: "clamp(5rem, 18vw, 16rem)",
        fontWeight: "bold",
        fontFamily: "'Courier New', Courier, monospace",
        userSelect: "none",
        pointerEvents: "none",
        letterSpacing: "-0.02em",
        lineHeight: 1,
    };
    return (
        <>
            {/* Linha central */}
            <div style={{
                position: "fixed",
                left: "50%",
                top: "8%",
                height: "84%",
                width: 1,
                background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent)",
                pointerEvents: "none",
            }} />

            <div style={{
                ...base,
                left: "25%",
                transform: "translateY(-50%) translateX(-50%)",
                color: "rgba(86,209,196,0.08)",
                textShadow: "0 0 40px rgba(86,209,196,0.05)",
            }}>
                {score1}
            </div>
            <div style={{
                ...base,
                left: "75%",
                transform: "translateY(-50%) translateX(-50%)",
                color: "rgba(245,137,94,0.08)",
                textShadow: "0 0 40px rgba(245,137,94,0.05)",
            }}>
                {score2}
            </div>
        </>
    );
}
