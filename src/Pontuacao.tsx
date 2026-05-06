"use client";

type PontuacaoProps = {
    score1: number;
    score2: number;
    isPortrait?: boolean;
};

export default function Pontuacao({ score1 = 0, score2 = 0, isPortrait = false }: PontuacaoProps) {
    if (isPortrait) {
        const base: React.CSSProperties = {
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%) translateY(-50%)",
            fontSize: "clamp(4rem, 18vh, 14rem)",
            fontWeight: "bold",
            fontFamily: "'Courier New', Courier, monospace",
            userSelect: "none",
            pointerEvents: "none",
            letterSpacing: "-0.02em",
            lineHeight: 1,
        };
        return (
            <>
                {/* Linha central horizontal */}
                <div style={{
                    position: "fixed",
                    top: "50%",
                    left: "8%",
                    width: "84%",
                    height: 1,
                    background: "linear-gradient(to right, transparent, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent)",
                    pointerEvents: "none",
                }} />
                {/* Score player2 (topo) — no quarto superior */}
                <div style={{ ...base, top: "25%", color: "rgba(245,137,94,0.08)", textShadow: "0 0 40px rgba(245,137,94,0.05)" }}>
                    {score2}
                </div>
                {/* Score player1 (baixo) — no quarto inferior */}
                <div style={{ ...base, top: "75%", color: "rgba(86,209,196,0.08)", textShadow: "0 0 40px rgba(86,209,196,0.05)" }}>
                    {score1}
                </div>
            </>
        );
    }

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
            {/* Linha central vertical */}
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
