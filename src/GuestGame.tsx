"use client";

import { useEffect, useRef, useState } from "react";
import type { DataConnection } from "peerjs";
import type { StateMsg, InputMsg, ActionMsg, BuffMsg } from "./peerTypes.ts";
import { idToIcon } from "./iconRegistry.ts";
import Bola from "./Bola.tsx";
import Barra from "./Barra.tsx";
import Pontuacao from "./Pontuacao.tsx";
import StoredItems from "./StoredItems.tsx";
import Item from "./Item.tsx";

const isTouchDevice = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

const winBtnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.45)",
  color: "rgba(255,255,255,0.88)",
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "0.9rem",
  fontWeight: "bold",
  letterSpacing: "0.2em",
  padding: "12px 32px",
  borderRadius: 4,
  cursor: "pointer",
};

function GuestBuffBar({ buff, align }: { buff: BuffMsg; align: "left" | "right" }) {
  const Icon = idToIcon(buff.iconId);
  const durationS = (buff.duration / 1000).toFixed(2);
  return (
    <div style={{ display: "flex", alignItems: "center", flexDirection: align === "right" ? "row-reverse" : "row", gap: 6, width: 130 }}>
      <Icon size={12} color={buff.color} strokeWidth={2.5} />
      <span style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "0.7rem", color: buff.color, letterSpacing: "0.04em", width: 52, textAlign: align === "right" ? "right" : "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {buff.label}
      </span>
      <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.12)", borderRadius: 2, overflow: "hidden" }}>
        <div key={buff.startedAt} style={{ height: "100%", background: buff.color, width: "100%", borderRadius: 2, animation: `buff-shrink ${durationS}s linear forwards`, transformOrigin: align === "right" ? "right" : "left" }} />
      </div>
    </div>
  );
}

function MobileBtn({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      style={{ background: color + "22", border: `1.5px solid ${color}88`, color, fontFamily: "'Courier New', Courier, monospace", fontSize: "0.78rem", fontWeight: "bold", letterSpacing: "0.1em", padding: "11px 18px", borderRadius: 6, cursor: "pointer", userSelect: "none", WebkitUserSelect: "none", touchAction: "none", minWidth: 68 }}
    >
      {label}
    </button>
  );
}

export default function GuestGame({ conn, onBack }: { conn: DataConnection; onBack: () => void }) {
  const [state, setState] = useState<StateMsg | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const [isPortrait, setIsPortrait] = useState(() => window.innerWidth < window.innerHeight && window.innerWidth <= 900);

  // Portrait detection
  useEffect(() => {
    const check = () => setIsPortrait(window.innerWidth < window.innerHeight && window.innerWidth <= 900);
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => { window.removeEventListener("resize", check); window.removeEventListener("orientationchange", check); };
  }, []);

  // Receive state from host
  useEffect(() => {
    const onData = (raw: unknown) => {
      const msg = raw as StateMsg;
      if (msg.type === "state") setState(msg);
    };
    const onClose = () => setDisconnected(true);
    conn.on("data", onData);
    conn.on("close", onClose);
    conn.on("error", onClose);
    return () => {
      conn.off("data", onData);
      conn.off("close", onClose);
    };
  }, [conn]);

  // P2 input state
  const inputRef = useRef({ up: false, down: false });

  // Send continuous input changes to host
  useEffect(() => {
    let prev = { up: false, down: false };
    let rafId: number;
    const tick = () => {
      const cur = inputRef.current;
      if (cur.up !== prev.up || cur.down !== prev.down) {
        const msg: InputMsg = { type: "input", up: cur.up, down: cur.down };
        try { conn.send(msg); } catch {}
        prev = { ...cur };
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [conn]);

  const sendAction = (action: "shoot" | "rotate") => {
    const msg: ActionMsg = { type: "action", action };
    try { conn.send(msg); } catch {}
  };

  // Keyboard input — aceita ambos os esquemas (W/S/Espaço/D e Arrows/Enter/→)
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp"   || e.key === "w") { e.preventDefault(); inputRef.current.up = true; }
      if (e.key === "ArrowDown" || e.key === "s") { e.preventDefault(); inputRef.current.down = true; }
      if (e.key === "Enter" || e.key === " ")     { e.preventDefault(); sendAction("shoot"); }
      if (e.key === "ArrowRight" || e.key === "d") sendAction("rotate");
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp"   || e.key === "w") inputRef.current.up   = false;
      if (e.key === "ArrowDown" || e.key === "s") inputRef.current.down = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, [conn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Touch input (right side of screen)
  useEffect(() => {
    const touchYRef = { current: null as number | null };
    const isRight = (x: number) => x >= window.innerWidth / 2;
    const onStart = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) if (isRight(t.clientX)) { touchYRef.current = t.clientY; e.preventDefault(); } };
    const onMove  = (e: TouchEvent) => { for (const t of Array.from(e.touches))        if (isRight(t.clientX)) { touchYRef.current = t.clientY; e.preventDefault(); } };
    const onEnd   = (e: TouchEvent) => { if (!Array.from(e.touches).some(t => isRight(t.clientX))) touchYRef.current = null; };
    window.addEventListener("touchstart", onStart, { passive: false });
    window.addEventListener("touchmove",  onMove,  { passive: false });
    window.addEventListener("touchend",   onEnd);
    // Drive up/down from touch position relative to screen center
    let rafId: number;
    let prev = { up: false, down: false };
    const tick = () => {
      if (touchYRef.current !== null) {
        const cy = window.innerHeight / 2;
        const dy = touchYRef.current - cy;
        const up   = dy < -30;
        const down = dy > 30;
        if (up !== prev.up || down !== prev.down) {
          const msg: InputMsg = { type: "input", up, down };
          try { conn.send(msg); } catch {}
          prev = { up, down };
          inputRef.current = { up, down };
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove",  onMove);
      window.removeEventListener("touchend",   onEnd);
    };
  }, [conn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (disconnected) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#0e0b18", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, fontFamily: "'Courier New', Courier, monospace" }}>
        <div style={{ fontSize: "1.1rem", letterSpacing: "0.12em", color: "#ff7070" }}>LIGAÇÃO PERDIDA</div>
        <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em" }}>O anfitrião encerrou a sessão.</div>
        <button onClick={onBack} style={winBtnStyle}>VOLTAR AO MENU</button>
      </div>
    );
  }

  if (!state) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#0e0b18", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: "'Courier New', Courier, monospace" }}>
        <div style={{ color: "rgba(255,255,255,0.75)", letterSpacing: "0.15em", fontSize: "0.92rem" }}>A AGUARDAR JOGO...</div>
        <div style={{ color: "rgba(255,255,255,0.38)", letterSpacing: "0.08em", fontSize: "0.75rem" }}>ligado ao anfitrião</div>
      </div>
    );
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const ballLeft = state.bx * vw;
  const ballTop  = state.by * vh;
  const ballR    = Math.round(state.br * vh);
  const p1Top    = state.p1y * vh;
  const p2Top    = state.p2y * vh;
  const p1H      = state.p1h * vh;
  const p2H      = state.p2h * vh;
  const pw       = isTouchDevice ? Math.round(Math.min(14, vh * 0.03)) : Math.round(Math.min(20, vh * 0.04));
  const PADDLE_OFFSET = Math.round(Math.min(100, Math.max(36, vw * 0.08)));

  return (
    <>
      {/* Portrait overlay */}
      <div style={{ display: "none", position: "fixed", inset: 0, zIndex: 200, background: "#0e0b18", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 } as React.CSSProperties} className="portrait-overlay">
        <div style={{ fontSize: "3rem" }}>↻</div>
        <div style={{ fontFamily: "'Courier New', Courier, monospace", color: "rgba(232,244,251,0.7)", fontSize: "1rem", letterSpacing: "0.15em", textAlign: "center", padding: "0 32px" }}>
          RODA O TELEMÓVEL<br /><span style={{ fontSize: "0.75rem", opacity: 0.5 }}>joga em landscape</span>
        </div>
      </div>

      <Pontuacao score1={state.score[0]} score2={state.score[1]} />

      <StoredItems
        left={{ current: state.current1 ? { icon: idToIcon(state.current1.iconId), color: state.current1.color } : undefined, next: state.next1 ? { icon: idToIcon(state.next1.iconId), color: state.next1.color } : undefined }}
        right={{ current: state.current2 ? { icon: idToIcon(state.current2.iconId), color: state.current2.color } : undefined, next: state.next2 ? { icon: idToIcon(state.next2.iconId), color: state.next2.color } : undefined }}
      />

      {/* P1 paddle — remote (position from host) */}
      <div style={{ position: "fixed", left: PADDLE_OFFSET, top: 0, transform: `translate3d(0,${Math.round(p1Top)}px,0)`, willChange: "transform" }}>
        <Barra height={p1H} width={pw} color="#56d1c4" glowColor="86,209,196" />
      </div>

      {/* P2 paddle — rendered at host-authoritative position */}
      <div style={{ position: "fixed", left: vw - PADDLE_OFFSET - pw, top: 0, transform: `translate3d(0,${Math.round(p2Top)}px,0)`, willChange: "transform" }}>
        <Barra height={p2H} width={pw} color="#f5895e" glowColor="245,137,94" />
      </div>

      {/* Shields */}
      {state.s1 && <div style={{ position: "fixed", left: PADDLE_OFFSET + pw, top: "20%", width: 8, height: "60%", borderRadius: 999, background: "rgba(86,209,196,0.35)", boxShadow: "0 0 16px rgba(86,209,196,0.5)" }} />}
      {state.s2 && <div style={{ position: "fixed", right: PADDLE_OFFSET + pw, top: "20%", width: 8, height: "60%", borderRadius: 999, background: "rgba(245,137,94,0.35)", boxShadow: "0 0 16px rgba(245,137,94,0.5)" }} />}

      {/* Ball */}
      <div style={{ position: "fixed", left: 0, top: 0, transform: `translate3d(${Math.round(ballLeft)}px,${Math.round(ballTop)}px,0)`, willChange: "transform", touchAction: "none" }}>
        <Bola radius={ballR} ghost={state.bg} />
      </div>

      {/* Field items */}
      {state.items.map(it => {
        const r = Math.round(it.r * vh);
        return (
          <div key={it.id} style={{ position: "fixed", left: it.x * vw - r, top: it.y * vh - r, pointerEvents: "none" }}>
            <Item radius={r} color={it.color} icon={idToIcon(it.iconId)} />
          </div>
        );
      })}

      {/* Decoys */}
      {state.decoys.map(d => {
        const r = Math.round(d.r * vh);
        return (
          <div key={d.id} style={{ position: "fixed", left: d.x * vw - r, top: d.y * vh - r, pointerEvents: "none", zIndex: 60 }}>
            <div style={{ width: r * 2, height: r * 2, borderRadius: "50%", backgroundColor: "#e8f4fb", border: "1.5px solid #e8f4fb", boxShadow: "0 0 8px rgba(200,235,255,0.28)", opacity: 0.9 }} />
          </div>
        );
      })}

      {/* Buff bars — P1 left, P2 right */}
      <div style={{ position: "fixed", left: 16, top: 102, display: "flex", flexDirection: "column", gap: 5, zIndex: 30, pointerEvents: "none" }}>
        {state.buffs.filter(b => b.player === "player1").map(b => <GuestBuffBar key={`${b.key}-${b.startedAt}`} buff={b} align="left" />)}
      </div>
      <div style={{ position: "fixed", right: 16, top: 102, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, zIndex: 30, pointerEvents: "none" }}>
        {state.buffs.filter(b => b.player === "player2").map(b => <GuestBuffBar key={`${b.key}-${b.startedAt}`} buff={b} align="right" />)}
      </div>

      {/* Notifications */}
      {state.notifs.map(n => (
        <div key={n.id} className="skill-notif" style={{ position: "fixed", top: "38%", ...(n.player === "player1" ? { left: "8%" } : { right: "8%" }), fontFamily: "'Courier New', Courier, monospace", fontSize: "clamp(0.85rem, 2vw, 1.15rem)", fontWeight: "bold", color: n.color, textShadow: `0 0 18px ${n.color}88`, letterSpacing: "0.12em", pointerEvents: "none", zIndex: 40, whiteSpace: "nowrap" }}>
          {n.text}
        </div>
      ))}

      {/* Winner overlay */}
      {state.winner && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(14,11,24,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
          <div style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "clamp(1.2rem, 5vw, 2.2rem)", fontWeight: "bold", color: state.winner === "player1" ? "#56d1c4" : "#f5895e", textShadow: `0 0 32px ${state.winner === "player1" ? "#56d1c488" : "#f5895e88"}`, letterSpacing: "0.15em", textAlign: "center" }}>
            {state.winner === "player1" ? "JOGADOR 1" : "JOGADOR 2"}<br />
            <span style={{ fontSize: "0.6em", color: "rgba(255,255,255,0.72)", fontWeight: "normal" }}>GANHOU!</span>
          </div>
          <button onClick={onBack} style={winBtnStyle}>MENU</button>
        </div>
      )}

      {/* Menu button */}
      <button onClick={onBack} style={{ position: "fixed", top: 10, left: "50%", transform: "translateX(-50%)", background: "rgba(196,170,255,0.1)", border: "1px solid rgba(196,170,255,0.35)", color: "rgba(196,170,255,0.75)", fontFamily: "'Courier New', Courier, monospace", fontSize: "clamp(0.65rem, 1.2vw, 0.85rem)", fontWeight: "bold", letterSpacing: "0.25em", padding: "clamp(5px, 1vh, 10px) clamp(14px, 2vw, 28px)", minHeight: 36, minWidth: 80, borderRadius: 4, cursor: "pointer", zIndex: 50, whiteSpace: "nowrap" }}>
        MENU
      </button>

      {/* Mobile P2 buttons */}
      {isTouchDevice && !isPortrait && (
        <div style={{ position: "fixed", bottom: 20, right: 16, display: "flex", gap: 10, zIndex: 50 }}>
          <MobileBtn label="USAR"   color="#f5895e" onPress={() => sendAction("shoot")}  />
          <MobileBtn label="TROCAR" color="#f5895e" onPress={() => sendAction("rotate")} />
        </div>
      )}
    </>
  );
}
