"use client";

import { useState } from "react";
import type { DataConnection } from "peerjs";
import type { GameConfig } from "./gameTypes.ts";
import { DEFAULT_CONFIG } from "./gameTypes.ts";
import Menu from "./Menu.tsx";
import Game from "./Game.tsx";
import GuestGame from "./GuestGame.tsx";
import OnlineLobby from "./OnlineLobby.tsx";

type Phase =
  | { t: "menu" }
  | { t: "local";  config: GameConfig }
  | { t: "lobby" }
  | { t: "host";   config: GameConfig; conn: DataConnection }
  | { t: "guest";  conn: DataConnection };

export default function App() {
  const [phase, setPhase] = useState<Phase>({ t: "menu" });

  if (phase.t === "lobby") {
    return (
      <OnlineLobby
        onBack={() => setPhase({ t: "menu" })}
        onHostStart={(conn, config) => setPhase({ t: "host", conn, config })}
        onGuestStart={(conn) => setPhase({ t: "guest", conn })}
      />
    );
  }

  if (phase.t === "local") {
    return (
      <Game
        key="local"
        config={phase.config}
        onBack={() => setPhase({ t: "menu" })}
      />
    );
  }

  if (phase.t === "host") {
    return (
      <Game
        key="host"
        config={phase.config}
        conn={phase.conn}
        onBack={() => { phase.conn.close(); setPhase({ t: "menu" }); }}
      />
    );
  }

  if (phase.t === "guest") {
    return (
      <GuestGame
        conn={phase.conn}
        onBack={() => { phase.conn.close(); setPhase({ t: "menu" }); }}
      />
    );
  }

  // Menu
  return (
    <Menu
      onPlay={(config) => setPhase({ t: "local", config })}
      onOnline={() => setPhase({ t: "lobby" })}
      defaultConfig={DEFAULT_CONFIG}
    />
  );
}
