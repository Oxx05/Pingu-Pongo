"use client";

import { Shuffle, Gauge, TimerReset, Crosshair, Expand, Rabbit, Shield, Trophy, Snowflake, Zap, Flame, Maximize2, ArrowUpDown, type LucideIcon } from "lucide-react";

type MenuProps = {
  onPlay: () => void;
};

type ItemInfo = {
  icon: LucideIcon;
  color: string;
  name: string;
  desc: string;
};

const ITEMS: ItemInfo[] = [
  { icon: Shuffle,    color: "#ffd43b", name: "Direção Aleatória",  desc: "A bola muda de direção" },
  { icon: Gauge,      color: "#74c0fc", name: "Velocidade Aleatória",desc: "A velocidade da bola muda" },
  { icon: TimerReset, color: "#91a7ff", name: "Câmara Lenta",       desc: "A bola abranda por 2.5s" },
  { icon: Crosshair,  color: "#fcc419", name: "Impulso",            desc: "Dá um empurrão extra à bola" },
  { icon: Expand,     color: "#4dabf7", name: "Barra Maior",        desc: "A tua barra fica maior" },
  { icon: Expand,     color: "#ff6b6b", name: "Inimigo Menor",      desc: "A barra do inimigo encolhe" },
  { icon: Shield,     color: "#63e6be", name: "Escudo",             desc: "Bloqueia uma vez a bola" },
  { icon: Trophy,     color: "#fab005", name: "Golo Duplo",         desc: "Próximo golo vale 2 pontos" },
  { icon: Rabbit,     color: "#9775fa", name: "Turbo",              desc: "Pequeno aumento de velocidade" },
  { icon: Maximize2,  color: "#f5a623", name: "Bola Gigante",       desc: "A bola fica enorme por 6s" },
  { icon: Snowflake,  color: "#a8d8f0", name: "Gelo",               desc: "Inimigo fica imóvel por 2.8s" },
  { icon: ArrowUpDown,color: "#f472b6", name: "Inversão",           desc: "Controlos do inimigo invertem por 5s" },
  { icon: Zap,        color: "#c0eb75", name: "Teletransporte",     desc: "A bola salta para posição aleatória" },
  { icon: Flame,      color: "#ff7b54", name: "Turbine",            desc: "A bola acelera para velocidade máxima" },
];

const isTouchDevice = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

export default function Menu({ onPlay }: MenuProps) {
  return (
    <div style={styles.overlay}>
      <div style={styles.container}>

        {/* Título */}
        <div style={styles.titleBlock}>
          <div style={styles.title}>PINGU PONGO</div>
          <div style={styles.subtitle}>Pong com poderes</div>
        </div>

        {/* Botão Jogar */}
        <button style={styles.playBtn} onClick={onPlay}>
          JOGAR
        </button>

        {/* Controlos */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>CONTROLOS</div>

          {isTouchDevice ? (
            <div style={styles.touchHint}>
              <div style={styles.touchHintText}>Desliza o dedo na tua metade do ecrã para mover a barra.</div>
              <div style={styles.controlGrid}>
                <ControlCard
                  title="Jogador 1 — Esquerda"
                  color="#56d1c4"
                  rows={[
                    { key: "↕ Deslizar", action: "Mover barra" },
                    { key: "[ USAR ]", action: "Usar item" },
                    { key: "[ TROCAR ]", action: "Trocar item" },
                  ]}
                />
                <ControlCard
                  title="Jogador 2 — Direita"
                  color="#f5895e"
                  rows={[
                    { key: "↕ Deslizar", action: "Mover barra" },
                    { key: "[ USAR ]", action: "Usar item" },
                    { key: "[ TROCAR ]", action: "Trocar item" },
                  ]}
                />
              </div>
              <div style={styles.landscapeHint}>Roda o telemóvel para landscape para melhor experiência</div>
            </div>
          ) : (
            <div style={styles.controlGrid}>
              <ControlCard
                title="Jogador 1"
                color="#56d1c4"
                rows={[
                  { key: "W / S", action: "Mover barra" },
                  { key: "Espaço", action: "Usar item" },
                  { key: "D", action: "Trocar item" },
                ]}
              />
              <ControlCard
                title="Jogador 2"
                color="#f5895e"
                rows={[
                  { key: "↑ / ↓", action: "Mover barra" },
                  { key: "Enter", action: "Usar item" },
                  { key: "→", action: "Trocar item" },
                ]}
              />
            </div>
          )}
        </div>

        {/* Itens */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>ITENS</div>
          <div style={styles.itemsNote}>
            A bola apanha itens ao passar por eles. O último jogador a tocar na bola recebe o item.
          </div>
          <div style={styles.itemsGrid}>
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name + item.color} style={styles.itemRow}>
                  <div style={{ ...styles.iconBox, background: item.color + "22", border: `1px solid ${item.color}55` }}>
                    <Icon size={16} color={item.color} />
                  </div>
                  <div style={styles.itemText}>
                    <span style={{ ...styles.itemName, color: item.color }}>{item.name}</span>
                    <span style={styles.itemDesc}>{item.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

type ControlRow = { key: string; action: string };

function ControlCard({ title, color, rows }: { title: string; color: string; rows: ControlRow[] }) {
  return (
    <div style={{ ...styles.card, borderColor: color + "44" }}>
      <div style={{ ...styles.cardTitle, color }}>{title}</div>
      {rows.map((row) => (
        <div key={row.key} style={styles.keyRow}>
          <kbd style={styles.kbd}>{row.key}</kbd>
          <span style={styles.keyAction}>{row.action}</span>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "#0e0b18",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    overflowY: "auto",
    zIndex: 100,
  },
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 40,
    padding: "56px 32px 72px",
    width: "100%",
    maxWidth: 760,
    boxSizing: "border-box",
  },
  titleBlock: {
    textAlign: "center",
  },
  title: {
    fontSize: "clamp(2.4rem, 10vw, 4.5rem)",
    fontFamily: "'Courier New', Courier, monospace",
    fontWeight: "bold",
    color: "#e8f4fb",
    textShadow: "0 0 40px rgba(200,235,255,0.2)",
    letterSpacing: "0.08em",
  },
  subtitle: {
    marginTop: 8,
    fontSize: "1rem",
    color: "rgba(255,255,255,0.35)",
    fontFamily: "'Courier New', Courier, monospace",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
  },
  playBtn: {
    background: "transparent",
    border: "2px solid rgba(232,244,251,0.5)",
    color: "#e8f4fb",
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "1.25rem",
    fontWeight: "bold",
    letterSpacing: "0.25em",
    padding: "14px 56px",
    borderRadius: 4,
    cursor: "pointer",
    boxShadow: "0 0 28px rgba(200,235,255,0.08)",
    transition: "all 0.15s",
  },
  section: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  sectionTitle: {
    fontSize: "0.82rem",
    fontFamily: "'Courier New', Courier, monospace",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    paddingBottom: 8,
  },
  touchHint: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  touchHintText: {
    fontSize: "0.9rem",
    color: "rgba(255,255,255,0.55)",
    fontFamily: "'Courier New', Courier, monospace",
    textAlign: "center",
  },
  landscapeHint: {
    fontSize: "0.78rem",
    color: "rgba(255,255,255,0.25)",
    fontFamily: "'Courier New', Courier, monospace",
    textAlign: "center",
    fontStyle: "italic",
  },
  controlGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  card: {
    border: "1px solid",
    borderRadius: 6,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "rgba(255,255,255,0.02)",
  },
  cardTitle: {
    fontFamily: "'Courier New', Courier, monospace",
    fontWeight: "bold",
    fontSize: "0.95rem",
    letterSpacing: "0.08em",
    marginBottom: 2,
  },
  keyRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  kbd: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 4,
    padding: "3px 10px",
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "0.88rem",
    color: "rgba(255,255,255,0.85)",
    whiteSpace: "nowrap",
    minWidth: 56,
    textAlign: "center",
    display: "inline-block",
  },
  keyAction: {
    fontSize: "0.9rem",
    color: "rgba(255,255,255,0.45)",
    fontFamily: "'Courier New', Courier, monospace",
  },
  itemsNote: {
    fontSize: "0.9rem",
    color: "rgba(255,255,255,0.35)",
    fontFamily: "'Courier New', Courier, monospace",
    textAlign: "center",
    lineHeight: 1.5,
  },
  itemsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 8px",
    borderRadius: 6,
    background: "rgba(255,255,255,0.02)",
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 7,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemText: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    minWidth: 0,
  },
  itemName: {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "0.82rem",
    fontWeight: "bold",
    letterSpacing: "0.02em",
  },
  itemDesc: {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "0.76rem",
    color: "rgba(255,255,255,0.38)",
  },
};
