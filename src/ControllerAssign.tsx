"use client";

import { useEffect, useState } from "react";

type Assignment = { p1: number | null; p2: number | null };

type ConnectedGamepad = { index: number; id: string };

type Props = {
  onStart: (p1Gamepad: number | null, p2Gamepad: number | null) => void;
  onBack: () => void;
};

const mono: React.CSSProperties = { fontFamily: "'Courier New', Courier, monospace" };

function shortName(id: string): string {
  if (/xbox|xinput/i.test(id)) return "Xbox";
  if (/dual.?shock|ps4|playstation/i.test(id)) return "PS4";
  if (/dual.?sense|ps5/i.test(id)) return "PS5";
  if (/nintendo|pro.?controller/i.test(id)) return "Nintendo";
  const clean = id.replace(/\(.*\)/, "").trim();
  return clean.length > 0 ? clean.slice(0, 22) : "Gamepad";
}

export default function ControllerAssign({ onStart, onBack }: Props) {
  const [gamepads, setGamepads] = useState<ConnectedGamepad[]>([]);
  const [assign, setAssign] = useState<Assignment>({ p1: null, p2: null });

  const refresh = () => {
    const gps = Array.from(navigator.getGamepads ? navigator.getGamepads() : [])
      .filter((g): g is Gamepad => g !== null)
      .map(g => ({ index: g.index, id: g.id }));
    setGamepads(gps);
    setAssign(prev => ({
      p1: gps.some(g => g.index === prev.p1) ? prev.p1 : null,
      p2: gps.some(g => g.index === prev.p2) ? prev.p2 : null,
    }));
  };

  useEffect(() => {
    refresh();
    window.addEventListener("gamepadconnected", refresh);
    window.addEventListener("gamepaddisconnected", refresh);
    return () => {
      window.removeEventListener("gamepadconnected", refresh);
      window.removeEventListener("gamepaddisconnected", refresh);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (player: "p1" | "p2", index: number) => {
    setAssign(prev => {
      const other = player === "p1" ? "p2" : "p1";
      return {
        ...prev,
        [player]: prev[player] === index ? null : index,
        [other]:  prev[other]  === index ? null : prev[other],
      };
    });
  };

  const p1Color = "#56d1c4";
  const p2Color = "#f5895e";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0e0b18", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "0 24px" }}>
      <div style={{ width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <div style={{ ...mono, fontSize: "clamp(1.8rem, 5vw, 2.4rem)", fontWeight: "bold", color: "#e8f4fb", letterSpacing: "0.15em" }}>
            COMANDOS
          </div>
          <div style={{ ...mono, fontSize: "0.95rem", color: "rgba(255,255,255,0.6)", letterSpacing: "0.14em", marginTop: 8 }}>
            Atribui um comando a cada jogador
          </div>
        </div>

        {/* Gamepad list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {gamepads.length === 0 ? (
            <div style={{ ...mono, color: "rgba(255,255,255,0.55)", fontSize: "1rem", letterSpacing: "0.08em", textAlign: "center", padding: "24px 0", lineHeight: 1.7 }}>
              Nenhum comando ligado.<br />
              <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.35)" }}>Liga um e carrega num botão para o detectar.</span>
            </div>
          ) : (
            gamepads.map(gp => {
              const isP1 = assign.p1 === gp.index;
              const isP2 = assign.p2 === gp.index;
              return (
                <div key={gp.index} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...mono, fontSize: "1.1rem", fontWeight: "bold", color: "#e8f4fb", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {shortName(gp.id)}
                    </div>
                    <div style={{ ...mono, fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", letterSpacing: "0.05em", marginTop: 3 }}>
                      índice {gp.index}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                    <button
                      onClick={() => pick("p1", gp.index)}
                      style={{
                        ...mono,
                        background: isP1 ? `rgba(86,209,196,0.2)` : "rgba(86,209,196,0.05)",
                        border: `1.5px solid ${isP1 ? p1Color : "rgba(86,209,196,0.4)"}`,
                        color: isP1 ? p1Color : "rgba(86,209,196,0.55)",
                        fontSize: "1rem", fontWeight: "bold", letterSpacing: "0.12em",
                        padding: "10px 18px", borderRadius: 6, cursor: "pointer", minWidth: 54,
                        boxShadow: isP1 ? `0 0 20px rgba(86,209,196,0.25)` : "none",
                        transition: "all 0.12s",
                      }}
                    >
                      J1
                    </button>
                    <button
                      onClick={() => pick("p2", gp.index)}
                      style={{
                        ...mono,
                        background: isP2 ? `rgba(245,137,94,0.2)` : "rgba(245,137,94,0.05)",
                        border: `1.5px solid ${isP2 ? p2Color : "rgba(245,137,94,0.4)"}`,
                        color: isP2 ? p2Color : "rgba(245,137,94,0.55)",
                        fontSize: "1rem", fontWeight: "bold", letterSpacing: "0.12em",
                        padding: "10px 18px", borderRadius: 6, cursor: "pointer", minWidth: 54,
                        boxShadow: isP2 ? `0 0 20px rgba(245,137,94,0.25)` : "none",
                        transition: "all 0.12s",
                      }}
                    >
                      J2
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary */}
        <div style={{ display: "flex", gap: 14 }}>
          {(["p1", "p2"] as const).map(p => {
            const color = p === "p1" ? p1Color : p2Color;
            const label = p === "p1" ? "JOGADOR 1" : "JOGADOR 2";
            const idx = assign[p];
            const gp = idx !== null ? gamepads.find(g => g.index === idx) : null;
            return (
              <div key={p} style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: `1.5px solid ${color}44`, borderRadius: 8, padding: "14px 16px" }}>
                <div style={{ ...mono, fontSize: "0.72rem", color: `${color}bb`, letterSpacing: "0.18em", marginBottom: 6 }}>{label}</div>
                <div style={{ ...mono, fontSize: "1rem", fontWeight: "bold", color: gp ? color : "rgba(255,255,255,0.45)", letterSpacing: "0.05em" }}>
                  {gp ? shortName(gp.id) : "Teclado"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <button
          className="menu-btn"
          onClick={() => onStart(assign.p1, assign.p2)}
          style={{ ...mono, background: "rgba(232,244,251,0.06)", border: "1px solid rgba(232,244,251,0.45)", color: "#e8f4fb", fontSize: "1.05rem", fontWeight: "bold", letterSpacing: "0.22em", padding: "15px 28px", borderRadius: 6, cursor: "pointer", width: "100%" }}
        >
          JOGAR
        </button>

        <button
          onClick={onBack}
          style={{ ...mono, background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", cursor: "pointer", letterSpacing: "0.18em", padding: "4px", alignSelf: "center" }}
        >
          ← VOLTAR
        </button>

      </div>
    </div>
  );
}
