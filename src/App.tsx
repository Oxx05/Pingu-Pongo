"use client";

import { useState } from "react";
import type { DataConnection } from "peerjs";
import type { GameConfig } from "./gameTypes.ts";
import Menu from "./Menu.tsx";
import Game from "./Game.tsx";
import GuestGame from "./GuestGame.tsx";
import OnlineLobby from "./OnlineLobby.tsx";
import ControllerAssign from "./ControllerAssign.tsx";

type Phase =
  | { t: "menu" }
  | { t: "assign"; config: GameConfig }
  | { t: "local";  config: GameConfig; p1Gamepad: number | null; p2Gamepad: number | null }
  | { t: "lobby" }
  | { t: "host";   config: GameConfig; conn: DataConnection }
  | { t: "guest";  conn: DataConnection };

export default function App() {
  const [phase, setPhase] = useState<Phase>({ t: "menu" });

  if (phase.t === "assign") {
    return (
      <ControllerAssign
        onBack={() => setPhase({ t: "menu" })}
        onStart={(p1Gamepad, p2Gamepad) =>
          setPhase({ t: "local", config: phase.config, p1Gamepad, p2Gamepad })
        }
      />
    );
  }

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
        p1GamepadIndex={phase.p1Gamepad ?? undefined}
        p2GamepadIndex={phase.p2Gamepad ?? undefined}
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
      onPlay={(config) => setPhase({ t: "assign", config })}
      onOnline={() => setPhase({ t: "lobby" })}
    />
  );
}
