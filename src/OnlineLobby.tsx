"use client";

import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import type { DataConnection } from "peerjs";
import type { GameConfig } from "./gameTypes.ts";
import { DEFAULT_CONFIG } from "./gameTypes.ts";

type Props = {
  onBack: () => void;
  onHostStart: (conn: DataConnection, config: GameConfig) => void;
  onGuestStart: (conn: DataConnection) => void;
};

type Phase =
  | { t: "idle" }
  | { t: "creating" }
  | { t: "hosting"; code: string }
  | { t: "joining" }
  | { t: "connecting"; code: string };

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const mono: React.CSSProperties = { fontFamily: "'Courier New', Courier, monospace" };

export default function OnlineLobby({ onBack, onHostStart, onGuestStart }: Props) {
  const [phase, setPhase] = useState<Phase>({ t: "idle" });
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [config] = useState<GameConfig>(DEFAULT_CONFIG);
  const peerRef = useRef<Peer | null>(null);
  const handedOffRef = useRef(false);

  // Cleanup on unmount — only destroy peer if it wasn't handed off to the game
  useEffect(() => {
    return () => { if (!handedOffRef.current) peerRef.current?.destroy(); };
  }, []);

  function createRoom() {
    setError(null);
    setPhase({ t: "creating" });
    const code = genCode();
    const peer = new Peer(code, { debug: 0 });
    peerRef.current = peer;

    peer.on("open", () => {
      setPhase({ t: "hosting", code });
    });

    peer.on("connection", (conn) => {
      conn.on("open", () => {
        peer.off("connection");
        handedOffRef.current = true;
        onHostStart(conn, config);
      });
    });

    peer.on("error", (err) => {
      if (err.type === "unavailable-id") {
        peer.destroy();
        createRoom();
      } else {
        setError("Erro ao criar sala. Tenta de novo.");
        setPhase({ t: "idle" });
      }
    });
  }

  function joinRoom() {
    const code = codeInput.trim().toUpperCase();
    if (code.length < 4) { setError("Código inválido."); return; }
    setError(null);
    setPhase({ t: "connecting", code });
    const peer = new Peer(undefined as unknown as string, { debug: 0 });
    peerRef.current = peer;

    peer.on("open", () => {
      const conn = peer.connect(code, { reliable: true });
      conn.on("open", () => {
        handedOffRef.current = true;
        onGuestStart(conn);
      });
      conn.on("error", () => {
        setError("Não foi possível ligar. Verifica o código.");
        setPhase({ t: "joining" });
      });
      const t = window.setTimeout(() => {
        if (!conn.open) {
          setError("Tempo esgotado. Verifica o código.");
          setPhase({ t: "joining" });
          peer.destroy();
        }
      }, 8000);
      conn.on("open", () => clearTimeout(t));
    });

    peer.on("error", () => {
      setError("Não foi possível ligar. Verifica o código.");
      setPhase({ t: "joining" });
    });
  }

  const isIdle      = phase.t === "idle";
  const isHosting   = phase.t === "hosting";
  const isCreating  = phase.t === "creating";
  const isJoining   = phase.t === "joining";
  const isConnecting = phase.t === "connecting";
  const canJoin     = codeInput.trim().length >= 4;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0e0b18", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "0 20px" }}>
      <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <div style={{ ...mono, fontSize: "clamp(1.8rem, 6vw, 2.6rem)", fontWeight: "bold", color: "#e8f4fb", letterSpacing: "0.12em" }}>
            ONLINE
          </div>
          <div style={{ ...mono, fontSize: "0.8rem", color: "rgba(255,255,255,0.52)", letterSpacing: "0.2em", marginTop: 6 }}>
            P2P — SEM SERVIDOR
          </div>
        </div>

        {/* CRIAR SALA */}
        {(isIdle || isCreating || isHosting) && (
          <div style={cardStyle}>
            <div style={cardLabel}>CRIAR SALA</div>

            {isIdle && (
              <button className="menu-btn menu-btn-online" style={primaryBtn} onClick={createRoom}>
                CRIAR SALA
              </button>
            )}

            {isCreating && (
              <div style={{ ...mono, color: "rgba(255,255,255,0.7)", textAlign: "center", fontSize: "0.9rem", letterSpacing: "0.12em", padding: "10px 0" }}>
                A GERAR SALA...
              </div>
            )}

            {isHosting && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
                <div style={{ ...mono, fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", letterSpacing: "0.12em" }}>
                  CÓDIGO DA SALA
                </div>
                <div style={{
                  ...mono,
                  fontSize: "clamp(2.2rem, 8vw, 3.2rem)",
                  fontWeight: "bold",
                  color: "#56d1c4",
                  letterSpacing: "0.5em",
                  textShadow: "0 0 32px #56d1c466",
                  paddingLeft: "0.5em",  /* compensate letter-spacing on last char */
                }}>
                  {(phase as { t: "hosting"; code: string }).code}
                </div>
                <div style={{ ...mono, fontSize: "0.82rem", color: "rgba(255,255,255,0.62)", letterSpacing: "0.06em", textAlign: "center", lineHeight: 1.6 }}>
                  Partilha este código com o outro jogador.
                  <br />
                  <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "0.76rem" }}>À espera de ligação...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {isIdle && (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            <span style={{ ...mono, fontSize: "0.75rem", color: "rgba(255,255,255,0.48)", letterSpacing: "0.25em" }}>OU</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
          </div>
        )}

        {/* ENTRAR EM SALA */}
        {(isIdle || isJoining || isConnecting) && (
          <div style={cardStyle}>
            <div style={cardLabel}>ENTRAR EM SALA</div>
            <input
              style={inputStyle}
              placeholder="CÓDIGO"
              maxLength={6}
              value={codeInput}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === "Enter" && canJoin) joinRoom(); }}
            />
            {isConnecting ? (
              <div style={{ ...mono, color: "rgba(255,255,255,0.7)", textAlign: "center", fontSize: "0.9rem", letterSpacing: "0.12em", padding: "6px 0" }}>
                A LIGAR...
              </div>
            ) : (
              <button
                className={canJoin ? "menu-btn menu-btn-join" : undefined}
                style={canJoin ? joinBtn : disabledBtn}
                onClick={joinRoom}
                disabled={!canJoin}
              >
                ENTRAR
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ ...mono, color: "#ff7070", fontSize: "0.85rem", textAlign: "center", letterSpacing: "0.06em", padding: "0 8px" }}>
            {error}
          </div>
        )}

        {/* Back */}
        {(isIdle || isJoining) && (
          <button
            onClick={() => { peerRef.current?.destroy(); onBack(); }}
            style={{ ...mono, background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", fontSize: "0.82rem", cursor: "pointer", letterSpacing: "0.2em", padding: "4px 8px", alignSelf: "center" }}
          >
            ← VOLTAR
          </button>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  padding: "20px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const cardLabel: React.CSSProperties = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "0.72rem",
  color: "rgba(255,255,255,0.52)",
  letterSpacing: "0.25em",
  textTransform: "uppercase",
};

const inputStyle: React.CSSProperties = {
  fontFamily: "'Courier New', Courier, monospace",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.22)",
  color: "#e8f4fb",
  fontSize: "1.5rem",
  letterSpacing: "0.45em",
  textAlign: "center",
  padding: "12px 16px",
  borderRadius: 6,
  width: "100%",
  boxSizing: "border-box",
  textTransform: "uppercase",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  fontFamily: "'Courier New', Courier, monospace",
  background: "rgba(86,209,196,0.1)",
  border: "1px solid rgba(86,209,196,0.55)",
  color: "#56d1c4",
  fontSize: "0.92rem",
  fontWeight: "bold",
  letterSpacing: "0.22em",
  padding: "13px 28px",
  borderRadius: 5,
  cursor: "pointer",
  width: "100%",
  minHeight: 46,
  whiteSpace: "nowrap",
};

const joinBtn: React.CSSProperties = {
  ...primaryBtn,
  background: "rgba(245,137,94,0.1)",
  border: "1px solid rgba(245,137,94,0.55)",
  color: "#f5895e",
};

const disabledBtn: React.CSSProperties = {
  ...primaryBtn,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.3)",
  cursor: "default",
};
