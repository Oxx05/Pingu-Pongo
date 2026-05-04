"use client";

import { useState } from "react";
import { Shuffle, Gauge, TimerReset, Expand, Rabbit, Turtle, Shield, Trophy, Snowflake, Zap, Flame, Maximize2, Minimize2, MoveVertical, Scissors, Undo2, EyeOff, ArrowUpDown, Ghost, AlertCircle, Activity, ArrowLeftRight, Bomb, Magnet, TrendingUp, type LucideIcon } from "lucide-react";
import type { GameConfig, GameMode } from "./gameTypes.ts";
import { DEFAULT_CONFIG } from "./gameTypes.ts";

type MenuProps = {
  onPlay: (config: GameConfig) => void;
  onOnline?: () => void;
  defaultConfig?: GameConfig;
};

type ItemInfo = {
  icon: LucideIcon;
  color: string;
  name: string;
  desc: string;
};

const ITEMS: ItemInfo[] = [
  // Neutral
  { icon: Shuffle,    color: "#ffd43b", name: "Direção Aleatória",  desc: "A bola muda de direção" },
  { icon: Gauge,      color: "#74c0fc", name: "Velocidade Aleatória",desc: "A velocidade da bola muda" },
  { icon: TimerReset, color: "#91a7ff", name: "Câmara Lenta",       desc: "A bola abranda por 4s" },
  { icon: Undo2,      color: "#ffd43b", name: "Recuo",              desc: "Inverte a direção horizontal da bola" },
  // Positivos (azul/verde — ajudam o teu lado)
  { icon: Expand,     color: "#4dabf7", name: "Barra Maior",        desc: "A tua barra fica maior por 9s" },
  { icon: MoveVertical,color: "#4dabf7",name: "Mega Barra",         desc: "A tua barra fica enorme por 4s" },
  { icon: Rabbit,     color: "#51cf66", name: "Lebre",              desc: "A tua velocidade aumenta por 7s" },
  { icon: Shield,     color: "#63e6be", name: "Escudo",             desc: "Bloqueia uma vez a bola por 8s" },
  { icon: Trophy,     color: "#fab005", name: "Golo Duplo",         desc: "Próximo golo vale 2 pontos por 10s" },
  { icon: Maximize2,  color: "#4dabf7", name: "Bola Gigante",       desc: "A bola fica enorme por 6s" },
  { icon: Minimize2,  color: "#51cf66", name: "Mini Bola",          desc: "A bola fica minúscula por 5s" },
  { icon: Zap,        color: "#c0eb75", name: "Teletransporte",     desc: "A bola salta para posição aleatória" },
  { icon: Flame,      color: "#ff9f43", name: "Turbine",            desc: "A bola acelera para velocidade máxima" },
  { icon: EyeOff,        color: "#c0eb75", name: "Bola Fantasma",   desc: "A bola fica quase invisível por 5s" },
  { icon: Ghost,         color: "#ffd43b", name: "Eco",             desc: "Spawna 3 bolas falsas e esconde a real por 4.5s" },
  { icon: Magnet,        color: "#51cf66", name: "Íman",            desc: "Puxa a bola para trajectória horizontal por 5s" },
  { icon: TrendingUp,    color: "#ff7b54", name: "Bola de Fogo",    desc: "Cada pancada acelera a bola por 6s" },
  { icon: ArrowLeftRight,color: "#74c0fc", name: "Trocar Itens",    desc: "Troca os itens dos dois jogadores" },
  // Neutro extra
  { icon: Activity,      color: "#74c0fc", name: "Distorção",       desc: "Alterna velocidade alta/baixa a cada 0.48s por 6s" },
  // Negativos (vermelho — afetam o inimigo)
  { icon: Expand,        color: "#ff6b6b", name: "Inimigo Menor",   desc: "A barra do inimigo encolhe por 9s" },
  { icon: Turtle,        color: "#ff6b6b", name: "Tartaruga",       desc: "O inimigo abranda por 8s" },
  { icon: Snowflake,     color: "#ff4757", name: "Gelo",            desc: "Inimigo fica imóvel por 2.8s" },
  { icon: ArrowUpDown,   color: "#ff6348", name: "Inversão",        desc: "Controlos do inimigo invertem por 5s" },
  { icon: Scissors,      color: "#ff6b6b", name: "Ladrão",          desc: "Destrói os itens do inimigo" },
  { icon: AlertCircle,   color: "#ff6348", name: "Pânico",          desc: "Inimigo deriva para baixo constantemente por 5s" },
  // Campo
  { icon: Bomb,          color: "#ff4757", name: "Mina",            desc: "Spawna no campo — bola activa e dispara a alta velocidade" },
];

const isTouchDevice = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;

export default function Menu({ onPlay, onOnline, defaultConfig }: MenuProps) {
  const [config, setConfig] = useState<GameConfig>(defaultConfig ?? DEFAULT_CONFIG);

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>

        {/* Título */}
        <div style={styles.titleBlock}>
          <div style={styles.title} className="menu-title">PINGU PONGO</div>
          <div style={styles.subtitle}>Pong com poderes</div>
        </div>

        {/* Botões de jogo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
            <button className="menu-btn" style={styles.playBtn} onClick={() => onPlay(config)}>
              JOGAR LOCAL
            </button>
            {onOnline && (
              <button
                className="menu-btn menu-btn-online"
                style={{ ...styles.playBtn, borderColor: "rgba(86,209,196,0.45)", color: "#56d1c4", boxShadow: "0 0 24px rgba(86,209,196,0.06)" }}
                onClick={onOnline}
              >
                JOGAR ONLINE
              </button>
            )}
          </div>
          {onOnline && (
            <div style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "0.68rem", color: "rgba(255,255,255,0.38)", letterSpacing: "0.15em" }}>
              online: P2P sem servidor
            </div>
          )}
        </div>

        {/* Configurações */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>CONFIGURAÇÕES</div>
          <div style={styles.configCard}>
            <ConfigRow label="MODO">
              {(["pong", "rally", "solo"] as GameMode[]).map(m => (
                <OptionBtn key={m} active={config.mode === m} onClick={() => setConfig(c => ({ ...c, mode: m }))}>
                  {m === "pong" ? "PONG" : m === "rally" ? "RALLY" : "SOLO"}
                </OptionBtn>
              ))}
            </ConfigRow>
            {config.mode === "pong" && (
              <>
                <div style={styles.configDivider} />
                <ConfigRow label="GOLOS P/ GANHAR">
                  {([5, 10, 20, 0] as const).map(v => (
                    <OptionBtn key={v} active={config.goalsToWin === v} onClick={() => setConfig(c => ({ ...c, goalsToWin: v }))}>
                      {v === 0 ? "∞" : String(v)}
                    </OptionBtn>
                  ))}
                </ConfigRow>
              </>
            )}
            {(config.mode === "pong" || config.mode === "rally") && (
              <>
                <div style={styles.configDivider} />
                <ConfigRow label="SPAWN DE ITENS">
                  {([{ label: "RÁPIDO", v: 3000 }, { label: "NORMAL", v: 8000 }, { label: "LENTO", v: 15000 }]).map(opt => (
                    <OptionBtn key={opt.v} active={config.spawnDelay === opt.v} onClick={() => setConfig(c => ({ ...c, spawnDelay: opt.v }))}>
                      {opt.label}
                    </OptionBtn>
                  ))}
                </ConfigRow>
              </>
            )}
            <div style={styles.configDivider} />
            <ConfigRow label="VELOCIDADE INICIAL">
              {([{ label: "NORMAL", v: 500 }, { label: "MÉDIA", v: 650 }, { label: "RÁPIDA", v: 850 }]).map(opt => (
                <OptionBtn key={opt.v} active={config.initialSpeed === opt.v} onClick={() => setConfig(c => ({ ...c, initialSpeed: opt.v }))}>
                  {opt.label}
                </OptionBtn>
              ))}
            </ConfigRow>
            <div style={styles.configDivider} />
            <ConfigRow label="PROGRESSÃO">
              {([{ label: "SEM", v: 0 }, { label: "LENTA", v: 0.04 }, { label: "RÁPIDA", v: 0.10 }]).map(opt => (
                <OptionBtn key={opt.v} active={config.speedProgression === opt.v} onClick={() => setConfig(c => ({ ...c, speedProgression: opt.v }))}>
                  {opt.label}
                </OptionBtn>
              ))}
            </ConfigRow>
            <div style={styles.configDivider} />
            <ConfigRow label="SPIN DA BOLA">
              <OptionBtn active={config.spinEnabled} onClick={() => setConfig(c => ({ ...c, spinEnabled: true }))}>ON</OptionBtn>
              <OptionBtn active={!config.spinEnabled} onClick={() => setConfig(c => ({ ...c, spinEnabled: false }))}>OFF</OptionBtn>
            </ConfigRow>
          </div>
        </div>

        {/* Controlos */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>CONTROLOS</div>

          {isTouchDevice ? (
            <div style={styles.touchHint}>
              <div style={styles.touchHintText}>Landscape: metade esquerda/direita. Portrait: metade cima/baixo.</div>
              <div style={styles.controlGrid}>
                <ControlCard
                  title="Jogador 1"
                  color="#56d1c4"
                  rows={[
                    { key: "↕↔ Deslizar", action: "Mover barra" },
                    { key: "[ USAR ]", action: "Usar item" },
                    { key: "[ TROCAR ]", action: "Trocar item" },
                  ]}
                />
                <ControlCard
                  title="Jogador 2"
                  color="#f5895e"
                  rows={[
                    { key: "↕↔ Deslizar", action: "Mover barra" },
                    { key: "[ USAR ]", action: "Usar item" },
                    { key: "[ TROCAR ]", action: "Trocar item" },
                  ]}
                />
              </div>
              <div style={styles.landscapeHint}>Funciona em portrait e landscape</div>
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
                    <Icon size={20} color={item.color} />
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

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={styles.configRow}>
      <span style={styles.configLabel}>{label}</span>
      <div style={styles.configBtns}>{children}</div>
    </div>
  );
}

function OptionBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="menu-opt-btn"
      style={{
        background: active ? "rgba(232,244,251,0.12)" : "transparent",
        border: `1px solid ${active ? "rgba(232,244,251,0.5)" : "rgba(255,255,255,0.12)"}`,
        color: active ? "#e8f4fb" : "rgba(255,255,255,0.58)",
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "clamp(0.82rem, 1.2vw, 0.98rem)",
        fontWeight: active ? "bold" : "normal",
        letterSpacing: "0.08em",
        padding: "7px 16px",
        minHeight: 36,
        borderRadius: 4,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
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
    overflowX: "hidden",
    zIndex: 100,
  },
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 36,
    padding: "56px 24px 72px",
    width: "100%",
    maxWidth: 1100,
    boxSizing: "border-box",
  },
  titleBlock: {
    textAlign: "center",
  },
  title: {
    fontSize: "clamp(2.4rem, 8vw, 5rem)",
    fontFamily: "'Courier New', Courier, monospace",
    fontWeight: "bold",
    color: "#e8f4fb",
    letterSpacing: "0.08em",
  },
  subtitle: {
    marginTop: 8,
    fontSize: "clamp(0.9rem, 1.4vw, 1.1rem)",
    color: "rgba(255,255,255,0.55)",
    fontFamily: "'Courier New', Courier, monospace",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
  },
  playBtn: {
    background: "transparent",
    border: "2px solid rgba(232,244,251,0.5)",
    color: "#e8f4fb",
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "clamp(0.95rem, 1.6vw, 1.2rem)",
    fontWeight: "bold",
    letterSpacing: "0.22em",
    padding: "14px 40px",
    borderRadius: 4,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: "0 0 28px rgba(200,235,255,0.08)",
  },
  section: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    alignItems: "center",
  },
  sectionTitle: {
    width: "100%",
    fontSize: "clamp(0.78rem, 1.1vw, 0.95rem)",
    fontFamily: "'Courier New', Courier, monospace",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    paddingBottom: 10,
    textAlign: "center",
  },
  touchHint: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
  },
  touchHintText: {
    fontSize: "clamp(0.9rem, 1.4vw, 1.05rem)",
    color: "rgba(255,255,255,0.72)",
    fontFamily: "'Courier New', Courier, monospace",
    textAlign: "center",
  },
  landscapeHint: {
    fontSize: "clamp(0.75rem, 1.1vw, 0.9rem)",
    color: "rgba(255,255,255,0.48)",
    fontFamily: "'Courier New', Courier, monospace",
    textAlign: "center",
    fontStyle: "italic",
  },
  controlGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    justifyContent: "center",
    gap: 16,
    width: "100%",
  },
  card: {
    border: "1px solid",
    borderRadius: 8,
    padding: "clamp(16px, 2vw, 24px) clamp(18px, 2.5vw, 28px)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    background: "rgba(255,255,255,0.02)",
    minWidth: 260,
    flex: "1 1 260px",
    maxWidth: 420,
  },
  cardTitle: {
    fontFamily: "'Courier New', Courier, monospace",
    fontWeight: "bold",
    fontSize: "clamp(1rem, 1.6vw, 1.2rem)",
    letterSpacing: "0.08em",
    marginBottom: 2,
  },
  keyRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  kbd: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 4,
    padding: "5px 12px",
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "clamp(0.88rem, 1.3vw, 1rem)",
    color: "rgba(255,255,255,0.85)",
    whiteSpace: "nowrap",
    minWidth: 72,
    textAlign: "center",
    display: "inline-block",
  },
  keyAction: {
    fontSize: "clamp(0.9rem, 1.3vw, 1rem)",
    color: "rgba(255,255,255,0.7)",
    fontFamily: "'Courier New', Courier, monospace",
  },
  configCard: {
    width: "100%",
    maxWidth: 580,
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    overflow: "hidden",
  },
  configDivider: {
    height: 1,
    background: "rgba(255,255,255,0.07)",
    margin: "0",
  },
  configRow: {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "14px 20px",
    flexWrap: "wrap" as const,
  },
  configLabel: {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "clamp(0.78rem, 1.1vw, 0.9rem)",
    color: "rgba(255,255,255,0.68)",
    letterSpacing: "0.1em",
    flexShrink: 0,
    whiteSpace: "nowrap" as const,
  },
  configBtns: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap" as const,
    justifyContent: "flex-end",
  },
  itemsNote: {
    fontSize: "clamp(0.88rem, 1.3vw, 1rem)",
    color: "rgba(255,255,255,0.6)",
    fontFamily: "'Courier New', Courier, monospace",
    textAlign: "center",
    lineHeight: 1.6,
  },
  itemsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
    gap: 10,
    width: "100%",
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemText: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
  },
  itemName: {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "clamp(0.88rem, 1.3vw, 1rem)",
    fontWeight: "bold",
    letterSpacing: "0.02em",
  },
  itemDesc: {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "clamp(0.78rem, 1.1vw, 0.88rem)",
    color: "rgba(255,255,255,0.58)",
    lineHeight: 1.4,
  },
};
